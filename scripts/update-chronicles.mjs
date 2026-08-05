import * as cheerio from "cheerio";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const START_YEAR = 2025;
const SOURCE_ROOT =
  "https://www.gmanetwork.com/news/lotto";

const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "public",
  "chronicles",
);

const GAME_NAMES = new Map([
  ["Lotto 6/42", 42],
  ["Mega Lotto 6/45", 45],
  ["Super Lotto 6/49", 49],
  ["Grand Lotto 6/55", 55],
  ["Ultra Lotto 6/58", 58],
]);

const SUPPORTED_SEALS = [42, 45, 49, 55, 58];

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatChronicleDate(date) {
  return `${pad(date.getMonth() + 1)}/${pad(
    date.getDate(),
  )}/${date.getFullYear()}`;
}

function formatIsoDate(date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
}

function createSourceUrl(date) {
  const month =
    MONTH_NAMES[date.getMonth()];

  return (
    `${SOURCE_ROOT}/results-` +
    `${month}-${pad(date.getDate())}-` +
    `${date.getFullYear()}/`
  );
}

function dateFromChronicle(value) {
  const match = String(value).match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
  );

  if (!match) {
    return 0;
  }

  return new Date(
    Number(match[3]),
    Number(match[1]) - 1,
    Number(match[2]),
  ).getTime();
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSixNumbers(value, seal) {
  const matches = normalizeText(value).match(
    /\b\d{1,2}\b/g,
  );

  if (!matches || matches.length < 6) {
    return null;
  }

  const numbers = matches
    .slice(0, 6)
    .map(Number);

  if (
    numbers.length !== 6 ||
    numbers.some(
      (number) =>
        !Number.isInteger(number) ||
        number < 1 ||
        number > seal,
    ) ||
    new Set(numbers).size !== 6
  ) {
    return null;
  }

  return numbers;
}

function validateEntry(entry, seal) {
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.date === "string" &&
    Array.isArray(entry.numbers) &&
    entry.numbers.length === 6 &&
    new Set(entry.numbers).size === 6 &&
    entry.numbers.every(
      (number) =>
        Number.isInteger(number) &&
        number >= 1 &&
        number <= seal,
    )
  );
}

async function loadExistingChronicle(seal) {
  const filePath = path.join(
    OUTPUT_DIRECTORY,
    `${seal}.json`,
  );

  try {
    const raw = await readFile(
      filePath,
      "utf8",
    );

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) =>
      validateEntry(entry, seal),
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function mergeEntries(existing, incoming) {
  const byDate = new Map();

  for (const entry of [
    ...existing,
    ...incoming,
  ]) {
    byDate.set(entry.date, entry);
  }

  return [...byDate.values()].sort(
    (left, right) =>
      dateFromChronicle(right.date) -
      dateFromChronicle(left.date),
  );
}

function extractResults(html, date) {
  const $ = cheerio.load(html);
  const output = [];

  $("a").each((_, element) => {
    const gameText = normalizeText(
      $(element).text(),
    ).replace(/:$/, "");

    const seal = GAME_NAMES.get(gameText);

    if (!seal) {
      return;
    }

    /*
      On the dated result pages, the six-number
      combination appears immediately after the
      game-name link in the surrounding content.
    */
    const parent = $(element).parent();

    let nearbyText = normalizeText(
      parent.text(),
    );

    if (!nearbyText) {
      nearbyText = normalizeText(
        $(element)
          .next()
          .text(),
      );
    }

    const afterGameName = nearbyText.replace(
      normalizeText($(element).text()),
      "",
    );

    const numbers = parseSixNumbers(
      afterGameName,
      seal,
    );

    if (!numbers) {
      /*
        Some page revisions place the numbers in
        the next sibling rather than the parent.
      */
      let sibling = $(element).next();
      let attempts = 0;
      let siblingNumbers = null;

      while (
        sibling.length > 0 &&
        attempts < 4
      ) {
        siblingNumbers = parseSixNumbers(
          sibling.text(),
          seal,
        );

        if (siblingNumbers) {
          break;
        }

        sibling = sibling.next();
        attempts += 1;
      }

      if (!siblingNumbers) {
        return;
      }

      output.push({
        seal,
        entry: {
          date: formatChronicleDate(date),
          numbers: siblingNumbers,
        },
      });

      return;
    }

    output.push({
      seal,
      entry: {
        date: formatChronicleDate(date),
        numbers,
      },
    });
  });

  return output;
}

async function fetchPage(date) {
  const url = createSourceUrl(date);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 Trinity Chronicle Updater",
      Accept:
        "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (response.status === 404) {
    return {
      url,
      results: [],
      status: 404,
    };
  }

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText} for ${url}`,
    );
  }

  const html = await response.text();

  return {
    url,
    results: extractResults(
      html,
      date,
    ),
    status: response.status,
  };
}

function getNewestStoredDate(
  chronicles,
) {
  let newest = null;

  for (const entries of chronicles.values()) {
    for (const entry of entries) {
      const timestamp =
        dateFromChronicle(entry.date);

      if (
        timestamp > 0 &&
        (!newest ||
          timestamp > newest.getTime())
      ) {
        newest = new Date(timestamp);
      }
    }
  }

  return newest;
}

async function saveChronicle(
  seal,
  entries,
) {
  const filePath = path.join(
    OUTPUT_DIRECTORY,
    `${seal}.json`,
  );

  await writeFile(
    filePath,
    `${JSON.stringify(entries, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Saved ${entries.length.toLocaleString()} passages to public/chronicles/${seal}.json`,
  );
}

async function main() {
  await mkdir(OUTPUT_DIRECTORY, {
    recursive: true,
  });

  const chronicles = new Map();

  for (const seal of SUPPORTED_SEALS) {
    chronicles.set(
      seal,
      await loadExistingChronicle(seal),
    );
  }

  const newestStoredDate =
    getNewestStoredDate(chronicles);

  /*
    First run:
      January 1, 2025 through today.

    Later runs:
      Begin seven days before the newest stored
      entry. This repairs late or corrected pages.
  */
  const startDate = newestStoredDate
    ? new Date(
        newestStoredDate.getFullYear(),
        newestStoredDate.getMonth(),
        newestStoredDate.getDate() - 7,
      )
    : new Date(START_YEAR, 0, 1);

  const today = new Date();

  console.log(
    `Renewing passages from ${formatIsoDate(
      startDate,
    )} through ${formatIsoDate(today)}.`,
  );

  let visitedDays = 0;
  let discoveredEntries = 0;

  for (
    let cursor = new Date(startDate);
    cursor <= today;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const currentDate = new Date(cursor);

    try {
      const page = await fetchPage(
        currentDate,
      );

      visitedDays += 1;

      if (page.results.length > 0) {
        console.log(
          `${formatIsoDate(
            currentDate,
          )}: found ${page.results.length} major passage(s).`,
        );
      }

      for (const result of page.results) {
        const current =
          chronicles.get(result.seal) ?? [];

        chronicles.set(
          result.seal,
          mergeEntries(current, [
            result.entry,
          ]),
        );

        discoveredEntries += 1;
      }
    } catch (error) {
      console.warn(
        `${formatIsoDate(
          currentDate,
        )}: skipped — ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }

    /*
      Be gentle with the source site during the
      first historical build.
    */
    await new Promise((resolve) =>
      setTimeout(resolve, 50),
    );
  }

  for (const seal of SUPPORTED_SEALS) {
    await saveChronicle(
      seal,
      chronicles.get(seal) ?? [],
    );
  }

  console.log("");
  console.log(
    `Visited ${visitedDays.toLocaleString()} dated pages.`,
  );

  console.log(
    `Found or refreshed ${discoveredEntries.toLocaleString()} passage records.`,
  );

  console.log(
    "Chronicle renewal completed.",
  );
}

main().catch((error) => {
  console.error(
    "Chronicle renewal failed.",
  );

  console.error(
    error instanceof Error
      ? error.stack ?? error.message
      : error,
  );

  process.exitCode = 1;
});