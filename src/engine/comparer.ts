import type {
  FormulaValues,
  PassageTransition,
  SearchScore,
  SupportedSeal,
} from "../types/models";
import {
  countMatches,
  generatePrediction,
} from "./trinityEngine";

export type PassageComparison = {
  sourceRowIndex: number;
  targetRowIndex: number;
  sourceNumbers: number[];
  targetNumbers: number[];
  prediction: number[];
  matchedNumbers: number[];
  matchedCount: number;
  qualified: boolean;
};

export type FormulaComparison = {
  formula: FormulaValues;
  comparisons: PassageComparison[];
  qualifiedRows: number;
  totalMatches: number;
  passageCount: number;
  requiredMatches: number;
  successful: boolean;
  preview: number[];
};

export function findMatchedNumbers(
  prediction: number[],
  targetNumbers: number[],
): number[] {
  const targetSet = new Set<number>(
    targetNumbers,
  );

  const matchedNumbers =
    prediction.filter((number) =>
      targetSet.has(number),
    );

  return [...new Set(matchedNumbers)];
}

export function comparePrediction(
  prediction: number[],
  targetNumbers: number[],
  requiredMatches: number,
): {
  matchedNumbers: number[];
  matchedCount: number;
  qualified: boolean;
} {
  const matchedNumbers =
    findMatchedNumbers(
      prediction,
      targetNumbers,
    );

  const matchedCount =
    matchedNumbers.length;

  return {
    matchedNumbers,
    matchedCount,
    qualified:
      matchedCount >= requiredMatches,
  };
}

export function compareFormulaAcrossPassages(
  formula: FormulaValues,
  transitions: PassageTransition[],
  requiredMatches: number,
  seal: SupportedSeal,
): FormulaComparison {
  const comparisons:
    PassageComparison[] = [];

  let qualifiedRows = 0;
  let totalMatches = 0;
  let preview: number[] = [];

  for (
    let index = 0;
    index < transitions.length;
    index += 1
  ) {
    const transition =
      transitions[index];

    const prediction =
      generatePrediction(
        transition.sourceNumbers,
        formula,
        seal,
      );

    if (index === 0) {
      preview = [...prediction];
    }

    const comparison =
      comparePrediction(
        prediction,
        transition.targetNumbers,
        requiredMatches,
      );

    if (comparison.qualified) {
      qualifiedRows += 1;
    }

    totalMatches +=
      comparison.matchedCount;

    comparisons.push({
      sourceRowIndex:
        transition.sourceRowIndex,

      targetRowIndex:
        transition.targetRowIndex,

      sourceNumbers: [
        ...transition.sourceNumbers,
      ],

      targetNumbers: [
        ...transition.targetNumbers,
      ],

      prediction: [
        ...prediction,
      ],

      matchedNumbers:
        comparison.matchedNumbers,

      matchedCount:
        comparison.matchedCount,

      qualified:
        comparison.qualified,
    });
  }

  return {
    formula: [
      ...formula,
    ] as FormulaValues,

    comparisons,

    qualifiedRows,

    totalMatches,

    passageCount:
      transitions.length,

    requiredMatches,

    successful:
      transitions.length > 0 &&
      qualifiedRows ===
        transitions.length,

    preview,
  };
}

export function toSearchScore(
  comparison: FormulaComparison,
): SearchScore {
  return {
    formula: [
      ...comparison.formula,
    ] as FormulaValues,

    preview: [
      ...comparison.preview,
    ],

    qualifiedRows:
      comparison.qualifiedRows,

    totalMatches:
      comparison.totalMatches,
  };
}

export function isBetterScore(
  candidate: SearchScore,
  currentBest:
    | SearchScore
    | null
    | undefined,
): boolean {
  if (!currentBest) {
    return true;
  }

  if (
    candidate.qualifiedRows >
    currentBest.qualifiedRows
  ) {
    return true;
  }

  if (
    candidate.qualifiedRows <
    currentBest.qualifiedRows
  ) {
    return false;
  }

  return (
    candidate.totalMatches >
    currentBest.totalMatches
  );
}

export function compareScores(
  left: SearchScore,
  right: SearchScore,
): number {
  if (
    left.qualifiedRows !==
    right.qualifiedRows
  ) {
    return (
      right.qualifiedRows -
      left.qualifiedRows
    );
  }

  return (
    right.totalMatches -
    left.totalMatches
  );
}

export function calculateSearchProgress(
  totalMatches: number,
  passageCount: number,
  requiredMatches: number,
  qualifiedRows: number,
): number {
  const requiredTotal =
    Math.max(
      1,
      passageCount *
        requiredMatches,
    );

  const cappedMatches =
    Math.min(
      totalMatches,
      requiredTotal,
    );

  let percentage =
    Math.floor(
      (cappedMatches /
        requiredTotal) *
        100,
    );

  if (
    qualifiedRows < passageCount &&
    percentage >= 100
  ) {
    percentage = 99;
  }

  return Math.max(
    0,
    Math.min(100, percentage),
  );
}

export function summarizeComparison(
  comparison: FormulaComparison,
): string {
  if (
    comparison.comparisons.length === 0
  ) {
    return "No passages were examined.";
  }

  if (comparison.successful) {
    return (
      `All ${comparison.passageCount} passages ` +
      `satisfied the covenant of ` +
      `${comparison.requiredMatches}/6.`
    );
  }

  return (
    `${comparison.qualifiedRows} of ` +
    `${comparison.passageCount} passages ` +
    `presently satisfy the covenant of ` +
    `${comparison.requiredMatches}/6.`
  );
}

export function validateComparisonResult(
  comparison: FormulaComparison,
): string {
  if (
    comparison.comparisons.length === 0
  ) {
    return (
      "Final validation failed: " +
      "no passages were examined."
    );
  }

  for (
    const item of
    comparison.comparisons
  ) {
    if (
      item.prediction.length !== 6
    ) {
      return (
        "Final validation failed for " +
        `passage ${
          item.sourceRowIndex + 1
        } to passage ${
          item.targetRowIndex + 1
        }: the oracle did not produce ` +
        "six marks."
      );
    }

    if (
      new Set(
        item.prediction,
      ).size !== 6
    ) {
      return (
        "Final validation failed for " +
        `passage ${
          item.sourceRowIndex + 1
        } to passage ${
          item.targetRowIndex + 1
        }: the oracle produced ` +
        "repeated marks."
      );
    }

    const recount =
      countMatches(
        item.prediction,
        item.targetNumbers,
      );

    if (
      recount !==
      item.matchedCount
    ) {
      return (
        "Final validation failed for " +
        `passage ${
          item.sourceRowIndex + 1
        } to passage ${
          item.targetRowIndex + 1
        }: the recorded agreement ` +
        "does not match the final recount."
      );
    }

    if (
      item.qualified !==
      (item.matchedCount >=
        comparison.requiredMatches)
    ) {
      return (
        "Final validation failed for " +
        `passage ${
          item.sourceRowIndex + 1
        } to passage ${
          item.targetRowIndex + 1
        }: the qualification state ` +
        "is inconsistent."
      );
    }
  }

  const qualifiedRows =
    comparison.comparisons.filter(
      (item) => item.qualified,
    ).length;

  const totalMatches =
    comparison.comparisons.reduce(
      (total, item) =>
        total +
        item.matchedCount,
      0,
    );

  if (
    qualifiedRows !==
    comparison.qualifiedRows
  ) {
    return (
      "Final validation failed: " +
      "the qualified passage total is inconsistent."
    );
  }

  if (
    totalMatches !==
    comparison.totalMatches
  ) {
    return (
      "Final validation failed: " +
      "the total agreement count is inconsistent."
    );
  }

  if (
    comparison.successful !==
    (qualifiedRows ===
      comparison.passageCount)
  ) {
    return (
      "Final validation failed: " +
      "the final covenant state is inconsistent."
    );
  }

  return "";
}