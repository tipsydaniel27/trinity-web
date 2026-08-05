import {
  isSupportedSeal,
  type ChronicleEntry,
  type FormulaValues,
  type OracleSearchRequest,
  type PassageTransition,
  type SearchValidationResult,
  type SupportedSeal,
} from "../types/models";
import {
  buildPassageTransitions,
  clamp,
  validateFormulaValues,
  validateSixNumbers,
} from "./trinityEngine";

export function validateChronicleEntry(
  entry: ChronicleEntry,
  seal: SupportedSeal,
  rowIndex?: number,
): SearchValidationResult {
  const rowLabel =
    rowIndex === undefined
      ? "The passage"
      : `Passage ${rowIndex + 1}`;

  if (!entry || typeof entry !== "object") {
    return {
      valid: false,
      message: `${rowLabel} is missing.`,
    };
  }

  if (
    typeof entry.date !== "string" ||
    entry.date.trim().length === 0
  ) {
    return {
      valid: false,
      message: `${rowLabel} has no terminus.`,
    };
  }

  if (!Array.isArray(entry.numbers)) {
    return {
      valid: false,
      message: `${rowLabel} has no marks.`,
    };
  }

  if (entry.numbers.length !== 6) {
    return {
      valid: false,
      message: `${rowLabel} must contain exactly six marks.`,
    };
  }

  if (
    entry.numbers.some(
      (number) =>
        !Number.isInteger(number) ||
        number < 1 ||
        number > seal,
    )
  ) {
    return {
      valid: false,
      message:
        `${rowLabel} contains a mark outside ` +
        `the chosen seal of ${seal}.`,
    };
  }

  if (new Set(entry.numbers).size !== 6) {
    return {
      valid: false,
      message: `${rowLabel} contains repeated marks.`,
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export function validateChronicle(
  chronicle: ChronicleEntry[],
  seal: SupportedSeal,
): SearchValidationResult {
  if (!Array.isArray(chronicle)) {
    return {
      valid: false,
      message:
        "The chronicle could not be read.",
    };
  }

  if (chronicle.length < 2) {
    return {
      valid: false,
      message:
        "At least two passages are required.",
    };
  }

  for (
    let rowIndex = 0;
    rowIndex < chronicle.length;
    rowIndex += 1
  ) {
    const result = validateChronicleEntry(
      chronicle[rowIndex],
      seal,
      rowIndex,
    );

    if (!result.valid) {
      return result;
    }
  }

  return {
    valid: true,
    message: "",
  };
}

export function validateFormula(
  formula: FormulaValues,
  formulaLimit: number,
): SearchValidationResult {
  try {
    validateFormulaValues(formula);
  } catch (error) {
    return {
      valid: false,
      message:
        error instanceof Error
          ? error.message
          : "The covenant is invalid.",
    };
  }

  const maximumFormulaValue = Math.max(
    1,
    Math.trunc(formulaLimit),
  );

  if (
    formula.some(
      (value) =>
        value < 1 ||
        value > maximumFormulaValue,
    )
  ) {
    return {
      valid: false,
      message:
        "A covenant value stands outside " +
        `the allowed span of 1 through ${maximumFormulaValue}.`,
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export function validateOracleSearchRequest(
  request: OracleSearchRequest,
): SearchValidationResult {
  if (!request) {
    return {
      valid: false,
      message:
        "The oracle received no covenant.",
    };
  }

  if (!isSupportedSeal(request.seal)) {
    return {
      valid: false,
      message:
        "The chosen seal is not recognized.",
    };
  }

  const chronicleValidation =
    validateChronicle(
      request.chronicle,
      request.seal,
    );

  if (!chronicleValidation.valid) {
    return chronicleValidation;
  }

  if (
    !Number.isInteger(request.requiredMatches) ||
    request.requiredMatches < 1 ||
    request.requiredMatches > 6
  ) {
    return {
      valid: false,
      message:
        "Agreement must stand between 1 and 6.",
    };
  }

  const availableTransitions =
    request.chronicle.length - 1;

  if (
    !Number.isInteger(request.passages) ||
    request.passages < 1
  ) {
    return {
      valid: false,
      message:
        "At least one passage transition is required.",
    };
  }

  if (
    request.passages >
    availableTransitions
  ) {
    return {
      valid: false,
      message:
        `Only ${availableTransitions} passage ` +
        `transition${
          availableTransitions === 1
            ? ""
            : "s"
        } are available.`,
    };
  }

  if (
    !Number.isInteger(request.formulaLimit) ||
    request.formulaLimit < 1
  ) {
    return {
      valid: false,
      message:
        "The formula limit must be at least 1.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export function validateSelectedPassage(
  chronicle: ChronicleEntry[],
  selectedRow: number,
  seal: SupportedSeal,
): SearchValidationResult {
  if (chronicle.length < 2) {
    return {
      valid: false,
      message:
        "At least two passages are required.",
    };
  }

  if (
    !Number.isInteger(selectedRow) ||
    selectedRow < 0 ||
    selectedRow >= chronicle.length
  ) {
    return {
      valid: false,
      message:
        "Choose one valid passage.",
    };
  }

  if (selectedRow === 0) {
    return {
      valid: false,
      message:
        "The newest passage has no newer passage above it.",
    };
  }

  const sourceValidation =
    validateChronicleEntry(
      chronicle[selectedRow],
      seal,
      selectedRow,
    );

  if (!sourceValidation.valid) {
    return sourceValidation;
  }

  const targetValidation =
    validateChronicleEntry(
      chronicle[selectedRow - 1],
      seal,
      selectedRow - 1,
    );

  if (!targetValidation.valid) {
    return targetValidation;
  }

  return {
    valid: true,
    message: "",
  };
}

export function validatePassageTransitions(
  transitions: PassageTransition[],
  requiredMatches: number,
  seal: SupportedSeal,
): SearchValidationResult {
  if (!Array.isArray(transitions)) {
    return {
      valid: false,
      message:
        "The passage transitions could not be read.",
    };
  }

  if (transitions.length === 0) {
    return {
      valid: false,
      message:
        "There are no passage transitions to examine.",
    };
  }

  const safeRequiredMatches = clamp(
    Math.trunc(requiredMatches),
    1,
    6,
  );

  if (
    safeRequiredMatches !==
    requiredMatches
  ) {
    return {
      valid: false,
      message:
        "Agreement must stand between 1 and 6.",
    };
  }

  for (const transition of transitions) {
    try {
      validateSixNumbers(
        transition.sourceNumbers,
        `Source passage ${
          transition.sourceRowIndex + 1
        }`,
      );

      validateSixNumbers(
        transition.targetNumbers,
        `Target passage ${
          transition.targetRowIndex + 1
        }`,
      );
    } catch (error) {
      return {
        valid: false,
        message:
          error instanceof Error
            ? error.message
            : "A passage transition is invalid.",
      };
    }

    if (
      transition.sourceNumbers.some(
        (number) =>
          number < 1 ||
          number > seal,
      ) ||
      transition.targetNumbers.some(
        (number) =>
          number < 1 ||
          number > seal,
      )
    ) {
      return {
        valid: false,
        message:
          "A passage transition contains a mark " +
          "outside the chosen seal.",
      };
    }
  }

  return {
    valid: true,
    message: "",
  };
}

export function preparePassageTransitions(
  chronicle: ChronicleEntry[],
  passages: number,
  seal: SupportedSeal,
):
  | {
      valid: true;
      transitions: PassageTransition[];
      message: "";
    }
  | {
      valid: false;
      transitions: [];
      message: string;
    } {
  const chronicleValidation =
    validateChronicle(chronicle, seal);

  if (!chronicleValidation.valid) {
    return {
      valid: false,
      transitions: [],
      message:
        chronicleValidation.message,
    };
  }

  const availableTransitions =
    chronicle.length - 1;

  if (
    !Number.isInteger(passages) ||
    passages < 1 ||
    passages > availableTransitions
  ) {
    return {
      valid: false,
      transitions: [],
      message:
        `Passages must stand between 1 and ${availableTransitions}.`,
    };
  }

  try {
    const transitions =
      buildPassageTransitions(
        chronicle,
        passages,
      );

    return {
      valid: true,
      transitions,
      message: "",
    };
  } catch (error) {
    return {
      valid: false,
      transitions: [],
      message:
        error instanceof Error
          ? error.message
          : "The passage transitions could not be prepared.",
    };
  }
}

export function validateChronicleYear(
  firstYear: number,
): SearchValidationResult {
  const currentYear =
    new Date().getFullYear();

  if (!Number.isInteger(firstYear)) {
    return {
      valid: false,
      message:
        "The first era must be a whole year.",
    };
  }

  if (firstYear < 2025) {
    return {
      valid: false,
      message:
        "The available chronicle begins in 2025.",
    };
  }

  if (firstYear > currentYear + 1) {
    return {
      valid: false,
      message:
        "The first era stands too far beyond the present.",
    };
  }

  return {
    valid: true,
    message: "",
  };
}

export function validateLoadedChronicle(
  chronicle: ChronicleEntry[],
  seal: SupportedSeal,
  firstYear: number,
): SearchValidationResult {
  const yearValidation =
    validateChronicleYear(firstYear);

  if (!yearValidation.valid) {
    return yearValidation;
  }

  const chronicleValidation =
    validateChronicle(
      chronicle,
      seal,
    );

  if (!chronicleValidation.valid) {
    return chronicleValidation;
  }

  for (const entry of chronicle) {
    const year = extractYear(
      entry.date,
    );

    if (
      year !== null &&
      year < firstYear
    ) {
      return {
        valid: false,
        message:
          "The chronicle contains a passage " +
          "older than the chosen first era.",
      };
    }
  }

  return {
    valid: true,
    message: "",
  };
}

function extractYear(
  dateValue: string,
): number | null {
  const directMatch =
    dateValue.match(
      /(\d{4})$/,
    );

  if (directMatch) {
    return Number(directMatch[1]);
  }

  const parsedDate =
    new Date(dateValue);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return null;
  }

  return parsedDate.getFullYear();
}