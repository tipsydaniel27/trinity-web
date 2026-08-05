export const SUPPORTED_SEALS = [42, 45, 49, 55, 58] as const;

export type SupportedSeal =
  (typeof SUPPORTED_SEALS)[number];

export type ChronicleEntry = {
  date: string;
  numbers: number[];
};

export type ChronicleFile = {
  seal: SupportedSeal;
  entries: ChronicleEntry[];
};

export type FormulaValues = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type PredictionResult = {
  sourceNumbers: number[];
  prediction: number[];
  formula: FormulaValues;
  seal: SupportedSeal;
};

export type PassageTransition = {
  sourceNumbers: number[];
  targetNumbers: number[];
  sourceRowIndex: number;
  targetRowIndex: number;
};

export type OracleSearchRequest = {
  chronicle: ChronicleEntry[];
  requiredMatches: number;
  passages: number;
  seal: SupportedSeal;
  formulaLimit: number;
};

export type OracleProgress = {
  type: "progress";
  formula: FormulaValues;
  preview: number[];
  qualifiedRows: number;
  totalMatches: number;
  attempts: number;
  progress: number;
};

export type OracleComplete = {
  type: "complete";
  formula: FormulaValues;
  preview: number[];
  qualifiedRows: number;
  totalMatches: number;
  attempts: number;
};

export type OracleStopped = {
  type: "stopped";
  attempts: number;
};

export type OracleError = {
  type: "error";
  message: string;
};

export type OracleWorkerResponse =
  | OracleProgress
  | OracleComplete
  | OracleStopped
  | OracleError;

export type OracleWorkerStartMessage = {
  type: "start";
  request: OracleSearchRequest;
};

export type OracleWorkerStopMessage = {
  type: "stop";
};

export type OracleWorkerMessage =
  | OracleWorkerStartMessage
  | OracleWorkerStopMessage;

export type SearchScore = {
  formula: FormulaValues;
  preview: number[];
  qualifiedRows: number;
  totalMatches: number;
};

export type SearchValidationResult = {
  valid: boolean;
  message: string;
};

export type ChronicleLoadResult = {
  entries: ChronicleEntry[];
  seal: SupportedSeal;
  firstYear: number;
};

export type TrinitySettings = {
  requiredMatches: number;
  passages: number;
  seal: SupportedSeal;
  formulaLimit: number;
  firstYear: number;
};

export type TrinityState = {
  formula: FormulaValues;
  chronicle: ChronicleEntry[];
  selectedRow: number;
  settings: TrinitySettings;
  progress: number;
  attempts: number;
  qualifiedRows: number;
  message: string;
  searching: boolean;
};

export const INITIAL_FORMULA: FormulaValues = [
  13,
  5,
  9,
  7,
  10,
  3,
  7,
  7,
  6,
  14,
  2,
  8,
];

export const DEFAULT_SETTINGS: TrinitySettings = {
  requiredMatches: 5,
  passages: 4,
  seal: 45,
  formulaLimit: 45,
  firstYear: 2025,
};

export const EMPTY_PREDICTION = [
  1,
  2,
  3,
  4,
  5,
  6,
];

export const CHRONICLE_COLUMN_NAMES = [
  "TERMINUS",
  "ONCE",
  "TWICE",
  "THRICE",
  "FOURFOLD",
  "FIVEFOLD",
  "SIXFOLD",
] as const;

export function isSupportedSeal(
  value: number,
): value is SupportedSeal {
  return SUPPORTED_SEALS.includes(
    value as SupportedSeal,
  );
}

export function createFormulaValues(
  values: number[],
): FormulaValues {
  if (values.length !== 12) {
    throw new Error(
      "The covenant requires exactly twelve formula values.",
    );
  }

  return [
    values[0],
    values[1],
    values[2],
    values[3],
    values[4],
    values[5],
    values[6],
    values[7],
    values[8],
    values[9],
    values[10],
    values[11],
  ];
}

export function cloneFormula(
  formula: FormulaValues,
): FormulaValues {
  return [...formula] as FormulaValues;
}

export function cloneChronicleEntry(
  entry: ChronicleEntry,
): ChronicleEntry {
  return {
    date: entry.date,
    numbers: [...entry.numbers],
  };
}

export function cloneChronicle(
  entries: ChronicleEntry[],
): ChronicleEntry[] {
  return entries.map(cloneChronicleEntry);
}