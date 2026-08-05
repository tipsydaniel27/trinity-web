import {
  createFormulaValues,
  type FormulaValues,
} from "../types/models";
import { clamp } from "./trinityEngine";

export type RandomSource = () => number;

export type RandomFormulaOptions = {
  maximumFormulaValue: number;
  randomSource?: RandomSource;
};

export type FormulaMutationOptions = {
  maximumFormulaValue: number;
  mutationCount?: number;
  randomSource?: RandomSource;
};

export type RandomPassageSelection = {
  sourceRowIndex: number;
  targetRowIndex: number;
};

export function createRandomInteger(
  minimum: number,
  maximum: number,
  randomSource: RandomSource = Math.random,
): number {
  const safeMinimum = Math.ceil(
    Math.min(minimum, maximum),
  );

  const safeMaximum = Math.floor(
    Math.max(minimum, maximum),
  );

  if (safeMinimum === safeMaximum) {
    return safeMinimum;
  }

  const randomValue = clamp(
    randomSource(),
    0,
    0.9999999999999999,
  );

  return (
    Math.floor(
      randomValue *
        (safeMaximum - safeMinimum + 1),
    ) + safeMinimum
  );
}

export function createRandomFormula(
  options: RandomFormulaOptions,
): FormulaValues {
  const maximumFormulaValue = Math.max(
    1,
    Math.trunc(options.maximumFormulaValue),
  );

  const randomSource =
    options.randomSource ?? Math.random;

  const values = Array.from(
    {
      length: 12,
    },
    () =>
      createRandomInteger(
        1,
        maximumFormulaValue,
        randomSource,
      ),
  );

  return createFormulaValues(values);
}

export function createRandomUniqueNumbers(
  count: number,
  minimum: number,
  maximum: number,
  randomSource: RandomSource = Math.random,
): number[] {
  const safeMinimum = Math.ceil(
    Math.min(minimum, maximum),
  );

  const safeMaximum = Math.floor(
    Math.max(minimum, maximum),
  );

  const availableCount =
    safeMaximum - safeMinimum + 1;

  const requestedCount = Math.trunc(count);

  if (requestedCount < 0) {
    throw new Error(
      "The requested mark count cannot be negative.",
    );
  }

  if (requestedCount > availableCount) {
    throw new Error(
      "There are not enough unique marks in the chosen span.",
    );
  }

  const pool = Array.from(
    {
      length: availableCount,
    },
    (_, index) => safeMinimum + index,
  );

  /*
    Fisher-Yates shuffle.

    Only the first requestedCount positions need
    to be shuffled completely for this purpose.
  */
  for (
    let index = 0;
    index < requestedCount;
    index += 1
  ) {
    const swapIndex = createRandomInteger(
      index,
      pool.length - 1,
      randomSource,
    );

    const currentValue = pool[index];

    pool[index] = pool[swapIndex];
    pool[swapIndex] = currentValue;
  }

  return pool.slice(0, requestedCount);
}

export function mutateFormula(
  formula: FormulaValues,
  options: FormulaMutationOptions,
): FormulaValues {
  const maximumFormulaValue = Math.max(
    1,
    Math.trunc(options.maximumFormulaValue),
  );

  const mutationCount = clamp(
    Math.trunc(options.mutationCount ?? 1),
    1,
    12,
  );

  const randomSource =
    options.randomSource ?? Math.random;

  const nextFormula = [
    ...formula,
  ] as FormulaValues;

  const indexes = createRandomUniqueNumbers(
    mutationCount,
    0,
    11,
    randomSource,
  );

  for (const index of indexes) {
    nextFormula[index] = createRandomInteger(
      1,
      maximumFormulaValue,
      randomSource,
    );
  }

  return nextFormula;
}

export function combineFormulas(
  firstFormula: FormulaValues,
  secondFormula: FormulaValues,
  randomSource: RandomSource = Math.random,
): FormulaValues {
  const combinedValues = new Array<number>(12);

  for (
    let index = 0;
    index < 12;
    index += 1
  ) {
    combinedValues[index] =
      randomSource() < 0.5
        ? firstFormula[index]
        : secondFormula[index];
  }

  return createFormulaValues(
    combinedValues,
  );
}

export function createRandomPassageSelection(
  chronicleLength: number,
  randomSource: RandomSource = Math.random,
): RandomPassageSelection {
  const safeLength = Math.trunc(
    chronicleLength,
  );

  if (safeLength < 2) {
    throw new Error(
      "At least two passages are required.",
    );
  }

  /*
    Row 1 is newest.

    The source row must begin at index 1 because
    index 0 has no newer target above it.
  */
  const sourceRowIndex =
    createRandomInteger(
      1,
      safeLength - 1,
      randomSource,
    );

  return {
    sourceRowIndex,
    targetRowIndex:
      sourceRowIndex - 1,
  };
}

export function createSeededRandom(
  seedValue: number,
): RandomSource {
  let state =
    Math.trunc(seedValue) >>> 0;

  /*
    Mulberry32 pseudo-random generator.

    This is useful for repeatable tests. The normal
    Oracle search should continue using Math.random.
  */
  return () => {
    state += 0x6d2b79f5;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1,
    );

    value ^= value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61,
      );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

export function shuffleValues<T>(
  values: readonly T[],
  randomSource: RandomSource = Math.random,
): T[] {
  const shuffledValues = [
    ...values,
  ];

  for (
    let index =
      shuffledValues.length - 1;
    index > 0;
    index -= 1
  ) {
    const swapIndex =
      createRandomInteger(
        0,
        index,
        randomSource,
      );

    const currentValue =
      shuffledValues[index];

    shuffledValues[index] =
      shuffledValues[swapIndex];

    shuffledValues[swapIndex] =
      currentValue;
  }

  return shuffledValues;
}

export function normalizeRandomSource(
  randomSource?: RandomSource,
): RandomSource {
  if (!randomSource) {
    return Math.random;
  }

  return () =>
    clamp(
      randomSource(),
      0,
      0.9999999999999999,
    );
}