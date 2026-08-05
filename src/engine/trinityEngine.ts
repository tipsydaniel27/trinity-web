import {
  createFormulaValues,
  type FormulaValues,
  type PassageTransition,
  type PredictionResult,
  type SearchScore,
  type SupportedSeal,
} from "../types/models";

export function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.max(
    minimum,
    Math.min(maximum, value),
  );
}

export function generatePrediction(
  sourceNumbers: number[],
  formulaValues: FormulaValues,
  maximumNumber: SupportedSeal,
): number[] {
  validateSourceNumbers(
    sourceNumbers,
    maximumNumber,
  );

  validateFormulaValues(formulaValues);

  const predictions = new Array<number>(6);
  const usedNumbers = new Set<number>();

  for (let index = 0; index < 6; index += 1) {
    const sourceValue = sourceNumbers[index];
    const leftCoefficient =
      formulaValues[index];

    const rightCoefficient =
      formulaValues[index + 6];

    /*
      Exact desktop formula:

      Output =
      ((Source × Left) + Right)

      The result is wrapped into:
      1 through maximumNumber.
    */
    const transformed =
      sourceValue * leftCoefficient +
      rightCoefficient;

    let candidate =
      (((transformed - 1) %
        maximumNumber +
        maximumNumber) %
        maximumNumber) +
      1;

    /*
      The six predictions must be unique.

      When two positions produce the same value,
      move forward one number at a time until an
      unused value is found. Wrap back to 1 after
      reaching the maximum.
    */
    while (usedNumbers.has(candidate)) {
      candidate += 1;

      if (candidate > maximumNumber) {
        candidate = 1;
      }
    }

    predictions[index] = candidate;
    usedNumbers.add(candidate);
  }

  return predictions;
}

export function createPredictionResult(
  sourceNumbers: number[],
  formulaValues: FormulaValues,
  maximumNumber: SupportedSeal,
): PredictionResult {
  return {
    sourceNumbers: [...sourceNumbers],
    prediction: generatePrediction(
      sourceNumbers,
      formulaValues,
      maximumNumber,
    ),
    formula: [...formulaValues] as FormulaValues,
    seal: maximumNumber,
  };
}

export function countMatches(
  predictions: number[],
  targetNumbers: number[],
): number {
  validateSixNumbers(
    predictions,
    "The prediction",
  );

  validateSixNumbers(
    targetNumbers,
    "The target passage",
  );

  const predictedSet =
    new Set<number>(predictions);

  const targetSet =
    new Set<number>(targetNumbers);

  let matchedCount = 0;

  for (const value of predictedSet) {
    if (targetSet.has(value)) {
      matchedCount += 1;
    }
  }

  return matchedCount;
}

export function calculateMatchPercentage(
  matchedCount: number,
): number {
  const safeMatchedCount = clamp(
    matchedCount,
    0,
    6,
  );

  return Math.round(
    (safeMatchedCount / 6) * 100,
  );
}

export function buildPassageTransitions(
  chronicle: {
    date: string;
    numbers: number[];
  }[],
  requestedTransitions: number,
): PassageTransition[] {
  if (chronicle.length < 2) {
    throw new Error(
      "At least two passages are required.",
    );
  }

  const availableTransitions =
    chronicle.length - 1;

  const transitionCount = clamp(
    Math.trunc(requestedTransitions),
    1,
    availableTransitions,
  );

  const transitions:
    PassageTransition[] = [];

  /*
    Row 1 is newest.

    A transition count of 5 means:

    row 2 predicts row 1
    row 3 predicts row 2
    row 4 predicts row 3
    row 5 predicts row 4
    row 6 predicts row 5
  */
  for (
    let sourceRowIndex = 1;
    sourceRowIndex <= transitionCount;
    sourceRowIndex += 1
  ) {
    const sourceEntry =
      chronicle[sourceRowIndex];

    const targetEntry =
      chronicle[sourceRowIndex - 1];

    validateSixNumbers(
      sourceEntry.numbers,
      `Source passage ${sourceRowIndex + 1}`,
    );

    validateSixNumbers(
      targetEntry.numbers,
      `Target passage ${sourceRowIndex}`,
    );

    transitions.push({
      sourceNumbers: [
        ...sourceEntry.numbers,
      ],
      targetNumbers: [
        ...targetEntry.numbers,
      ],
      sourceRowIndex,
      targetRowIndex:
        sourceRowIndex - 1,
    });
  }

  return transitions;
}

export function evaluateFormula(
  formulaValues: FormulaValues,
  transitions: PassageTransition[],
  requiredMatchesPerPassage: number,
  maximumNumber: SupportedSeal,
): SearchScore {
  validateFormulaValues(formulaValues);

  if (transitions.length === 0) {
    throw new Error(
      "There are no passages to examine.",
    );
  }

  const requiredMatches = clamp(
    Math.trunc(requiredMatchesPerPassage),
    1,
    6,
  );

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
        formulaValues,
        maximumNumber,
      );

    if (index === 0) {
      preview = [...prediction];
    }

    const matchedCount =
      countMatches(
        prediction,
        transition.targetNumbers,
      );

    totalMatches += matchedCount;

    if (
      matchedCount >=
      requiredMatches
    ) {
      qualifiedRows += 1;
    }
  }

  return {
    formula: [
      ...formulaValues,
    ] as FormulaValues,

    preview,

    qualifiedRows,

    totalMatches,
  };
}

export function isFormulaSuccessful(
  score: SearchScore,
  passageCount: number,
): boolean {
  return (
    score.qualifiedRows ===
    passageCount
  );
}

export function createRandomFormula(
  maximumFormulaValue: number,
  randomSource: () => number = Math.random,
): FormulaValues {
  const maximumValue = Math.max(
    1,
    Math.trunc(maximumFormulaValue),
  );

  const values = Array.from(
    {
      length: 12,
    },
    () =>
      Math.floor(
        randomSource() *
          maximumValue,
      ) + 1,
  );

  return createFormulaValues(values);
}

export function validatePredictionAgainstTarget(
  predictions: number[],
  targetNumbers: number[],
  maximumNumber: SupportedSeal,
): string {
  if (predictions.length !== 6) {
    return (
      "Final validation failed: " +
      "the oracle does not contain six marks."
    );
  }

  if (
    new Set(predictions).size !== 6
  ) {
    return (
      "Final validation failed: " +
      "the oracle contains repeated marks."
    );
  }

  if (
    predictions.some(
      (number) =>
        number < 1 ||
        number > maximumNumber,
    )
  ) {
    return (
      "Final validation failed: " +
      "a mark stands outside the chosen seal."
    );
  }

  const predictionSet =
    new Set<number>(predictions);

  const targetSet =
    new Set<number>(targetNumbers);

  if (
    predictionSet.size !==
      targetSet.size ||
    [...predictionSet].some(
      (number) =>
        !targetSet.has(number),
    )
  ) {
    return (
      "Final validation failed: " +
      "the oracle does not fully agree " +
      "with the target passage."
    );
  }

  return "";
}

export function validateUniversalFormula(
  formulaValues: FormulaValues,
  transitions: PassageTransition[],
  requiredMatchesPerPassage: number,
  maximumNumber: SupportedSeal,
): string {
  if (formulaValues.length !== 12) {
    return (
      "Final validation failed: " +
      "the covenant does not contain " +
      "all twelve values."
    );
  }

  if (transitions.length === 0) {
    return (
      "Final validation failed: " +
      "there are no passage transitions."
    );
  }

  const requiredMatches = clamp(
    Math.trunc(
      requiredMatchesPerPassage,
    ),
    1,
    6,
  );

  for (const transition of transitions) {
    const predictions =
      generatePrediction(
        transition.sourceNumbers,
        formulaValues,
        maximumNumber,
      );

    if (
      predictions.length !== 6
    ) {
      return (
        "Final validation failed for " +
        `passage ${
          transition.sourceRowIndex + 1
        } to passage ${
          transition.targetRowIndex + 1
        }: the oracle does not contain ` +
        "six marks."
      );
    }

    if (
      new Set(predictions).size !== 6
    ) {
      return (
        "Final validation failed for " +
        `passage ${
          transition.sourceRowIndex + 1
        } to passage ${
          transition.targetRowIndex + 1
        }: the oracle contains repeated ` +
        "marks."
      );
    }

    if (
      predictions.some(
        (number) =>
          number < 1 ||
          number > maximumNumber,
      )
    ) {
      return (
        "Final validation failed for " +
        `passage ${
          transition.sourceRowIndex + 1
        } to passage ${
          transition.targetRowIndex + 1
        }: a mark stands outside the ` +
        "chosen seal."
      );
    }

    const matchedCount =
      countMatches(
        predictions,
        transition.targetNumbers,
      );

    if (
      matchedCount <
      requiredMatches
    ) {
      return (
        "Final validation failed for " +
        `passage ${
          transition.sourceRowIndex + 1
        } to passage ${
          transition.targetRowIndex + 1
        }: only ${matchedCount}/6 marks ` +
        `agreed, while ${requiredMatches}/6 ` +
        "are required."
      );
    }
  }

  return "";
}

export function normalizeFormula(
  formulaValues: number[],
  maximumFormulaValue: number,
): FormulaValues {
  const maximumValue = Math.max(
    1,
    Math.trunc(maximumFormulaValue),
  );

  const normalizedValues =
    formulaValues.map((value) =>
      clamp(
        Math.trunc(value),
        1,
        maximumValue,
      ),
    );

  return createFormulaValues(
    normalizedValues,
  );
}

export function validateFormulaValues(
  formulaValues: number[],
): void {
  if (
    formulaValues.length !== 12
  ) {
    throw new Error(
      "The covenant requires exactly twelve values.",
    );
  }

  if (
    formulaValues.some(
      (value) =>
        !Number.isInteger(value) ||
        value < 1,
    )
  ) {
    throw new Error(
      "Every covenant value must be a whole number greater than zero.",
    );
  }
}

export function validateSourceNumbers(
  sourceNumbers: number[],
  maximumNumber: SupportedSeal,
): void {
  validateSixNumbers(
    sourceNumbers,
    "The source passage",
  );

  if (
    sourceNumbers.some(
      (number) =>
        number < 1 ||
        number > maximumNumber,
    )
  ) {
    throw new Error(
      "The source passage contains a mark outside the chosen seal.",
    );
  }
}

export function validateSixNumbers(
  numbers: number[],
  label: string,
): void {
  if (numbers.length !== 6) {
    throw new Error(
      `${label} must contain exactly six marks.`,
    );
  }

  if (
    numbers.some(
      (number) =>
        !Number.isInteger(number) ||
        number < 1,
    )
  ) {
    throw new Error(
      `${label} contains an invalid mark.`,
    );
  }

  if (
    new Set(numbers).size !== 6
  ) {
    throw new Error(
      `${label} contains repeated marks.`,
    );
  }
}