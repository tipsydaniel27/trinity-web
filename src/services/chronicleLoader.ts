import type {
  ChronicleEntry,
  ChronicleLoadResult,
  SupportedSeal,
} from "../types/models";
import {
  isSupportedSeal,
} from "../types/models";

type RawChronicleEntry = {
  date?: unknown;
  numbers?: unknown;
};

export async function loadChronicle(
  seal: SupportedSeal,
  firstYear: number,
  signal?: AbortSignal,
): Promise<ChronicleLoadResult> {
  const response = await fetch(
    `/chronicles/${seal}.json`,
    {
      method: "GET",
      cache: "no-store",
      signal,
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `The chronicle of seal ${seal} could not be opened.`,
    );
  }

  const rawValue: unknown =
    await response.json();

  const allEntries =
    parseChronicle(rawValue, seal);

  const filteredEntries =
    filterChronicleByYear(
      allEntries,
      firstYear,
    );

  if (filteredEntries.length < 2) {
    throw new Error(
      "The chosen era does not contain enough passages.",
    );
  }

  return {
    entries: filteredEntries,
    seal,
    firstYear,
  };
}

export function parseChronicle(
  value: unknown,
  seal: SupportedSeal,
): ChronicleEntry[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "The chronicle file does not contain a passage list.",
    );
  }

  const entries: ChronicleEntry[] = [];

  value.forEach(
    (
      rawEntry: unknown,
      index: number,
    ) => {
      const entry = parseChronicleEntry(
        rawEntry,
        seal,
        index,
      );

      entries.push(entry);
    },
  );

  return removeDuplicateEntries(entries)
    .sort(
      (
        left: ChronicleEntry,
        right: ChronicleEntry,
      ) =>
        parseChronicleDate(
          right.date,
        ) -
        parseChronicleDate(
          left.date,
        ),
    );
}

export function parseChronicleEntry(
  value: unknown,
  seal: SupportedSeal,
  index = 0,
): ChronicleEntry {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    throw new Error(
      `Passage ${index + 1} is invalid.`,
    );
  }

  const rawEntry =
    value as RawChronicleEntry;

  const date =
    String(
      rawEntry.date ?? "",
    ).trim();

  if (!date) {
    throw new Error(
      `Passage ${index + 1} has no terminus.`,
    );
  }

  if (
    !Array.isArray(
      rawEntry.numbers,
    )
  ) {
    throw new Error(
      `Passage ${index + 1} has no marks.`,
    );
  }

  const numbers =
    rawEntry.numbers.map(
      (number: unknown) =>
        Number(number),
    );

  if (
    numbers.length !== 6
  ) {
    throw new Error(
      `Passage ${index + 1} must contain six marks.`,
    );
  }

  if (
    numbers.some(
      (number: number) =>
        !Number.isInteger(number) ||
        number < 1 ||
        number > seal,
    )
  ) {
    throw new Error(
      `Passage ${index + 1} contains a mark outside seal ${seal}.`,
    );
  }

  if (
    new Set(numbers).size !== 6
  ) {
    throw new Error(
      `Passage ${index + 1} contains repeated marks.`,
    );
  }

  const normalizedDate =
    normalizeChronicleDate(date);

  return {
    date: normalizedDate,
    numbers,
  };
}

export function filterChronicleByYear(
  entries: ChronicleEntry[],
  firstYear: number,
): ChronicleEntry[] {
  const safeFirstYear =
    Math.trunc(firstYear);

  return entries.filter(
    (entry: ChronicleEntry) => {
      const year =
        extractChronicleYear(
          entry.date,
        );

      return (
        year === null ||
        year >= safeFirstYear
      );
    },
  );
}

export function normalizeChronicleDate(
  value: string,
): string {
  const trimmedValue =
    value.trim();

  const numericMatch =
    trimmedValue.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
    );

  if (numericMatch) {
    const month = Number(
      numericMatch[1],
    );

    const day = Number(
      numericMatch[2],
    );

    const year = Number(
      numericMatch[3],
    );

    return [
      padNumber(month),
      padNumber(day),
      year,
    ].join("/");
  }

  const parsedDate =
    new Date(trimmedValue);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    throw new Error(
      `Unrecognized terminus: ${trimmedValue}`,
    );
  }

  return [
    padNumber(
      parsedDate.getMonth() + 1,
    ),
    padNumber(
      parsedDate.getDate(),
    ),
    parsedDate.getFullYear(),
  ].join("/");
}

export function parseChronicleDate(
  value: string,
): number {
  const match =
    value.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/,
    );

  if (!match) {
    return 0;
  }

  const month =
    Number(match[1]);

  const day =
    Number(match[2]);

  const year =
    Number(match[3]);

  return new Date(
    year,
    month - 1,
    day,
  ).getTime();
}

export function extractChronicleYear(
  value: string,
): number | null {
  const match =
    value.match(
      /(\d{4})$/,
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  return Number.isInteger(year)
    ? year
    : null;
}

export function removeDuplicateEntries(
  entries: ChronicleEntry[],
): ChronicleEntry[] {
  const uniqueEntries =
    new Map<string, ChronicleEntry>();

  for (const entry of entries) {
    const identity = [
      entry.date,
      ...entry.numbers,
    ].join("|");

    uniqueEntries.set(
      identity,
      {
        date: entry.date,
        numbers: [
          ...entry.numbers,
        ],
      },
    );
  }

  return [
    ...uniqueEntries.values(),
  ];
}

export function isValidChronicleSeal(
  value: number,
): value is SupportedSeal {
  return isSupportedSeal(value);
}

export async function chronicleExists(
  seal: SupportedSeal,
): Promise<boolean> {
  try {
    const response = await fetch(
      `/chronicles/${seal}.json`,
      {
        method: "HEAD",
        cache: "no-store",
      },
    );

    return response.ok;
  } catch {
    return false;
  }
}

function padNumber(
  value: number,
): string {
  return String(value).padStart(
    2,
    "0",
  );
}