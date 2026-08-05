import type {
  FormulaValues,
  OracleSearchRequest,
  OracleWorkerMessage,
  OracleWorkerResponse,
  PassageTransition,
  SearchScore,
} from "../types/models";
import {
  buildPassageTransitions,
} from "../engine/trinityEngine";
import {
  createRandomFormula,
} from "../engine/randomizer";
import {
  calculateSearchProgress,
  compareFormulaAcrossPassages,
  isBetterScore,
  toSearchScore,
  validateComparisonResult,
} from "../engine/comparer";
import {
  validateOracleSearchRequest,
  validatePassageTransitions,
} from "../engine/validator";

let stopRequested = false;
let searchRunning = false;

function postWorkerMessage(
  message: OracleWorkerResponse,
): void {
  self.postMessage(message);
}

function validateRequestOrThrow(
  request: OracleSearchRequest,
): void {
  const validation =
    validateOracleSearchRequest(request);

  if (!validation.valid) {
    throw new Error(validation.message);
  }
}

function prepareTransitions(
  request: OracleSearchRequest,
): PassageTransition[] {
  const transitions =
    buildPassageTransitions(
      request.chronicle,
      request.passages,
    );

  const validation =
    validatePassageTransitions(
      transitions,
      request.requiredMatches,
      request.seal,
    );

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  return transitions;
}

async function yieldToWorker(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function runOracleSearch(
  request: OracleSearchRequest,
): Promise<void> {
  if (searchRunning) {
    throw new Error(
      "The oracle is already examining a covenant.",
    );
  }

  validateRequestOrThrow(request);

  const transitions =
    prepareTransitions(request);

  stopRequested = false;
  searchRunning = true;

  let attempts = 0;
  let bestScore: SearchScore | null = null;
  let lastReportedAttempt = 0;

  /*
    Search in batches so the worker can process
    stop messages between groups of attempts.
  */
  const batchSize = 2000;

  try {
    while (!stopRequested) {
      for (
        let batchIndex = 0;
        batchIndex < batchSize;
        batchIndex += 1
      ) {
        if (stopRequested) {
          break;
        }

        attempts += 1;

        const formula =
          createRandomFormula({
            maximumFormulaValue:
              request.formulaLimit,
          });

        const comparison =
          compareFormulaAcrossPassages(
            formula,
            transitions,
            request.requiredMatches,
            request.seal,
          );

        const score =
          toSearchScore(comparison);

        const improved =
          isBetterScore(
            score,
            bestScore,
          );

        const reportIntervalReached =
          attempts - lastReportedAttempt >=
          5000;

        if (
          improved ||
          reportIntervalReached
        ) {
          if (improved) {
            bestScore = {
              formula: [
                ...score.formula,
              ] as FormulaValues,

              preview: [
                ...score.preview,
              ],

              qualifiedRows:
                score.qualifiedRows,

              totalMatches:
                score.totalMatches,
            };
          }

          lastReportedAttempt = attempts;

          const progress =
            calculateSearchProgress(
              score.totalMatches,
              transitions.length,
              request.requiredMatches,
              score.qualifiedRows,
            );

          postWorkerMessage({
            type: "progress",
            formula: [
              ...score.formula,
            ] as FormulaValues,
            preview: [
              ...score.preview,
            ],
            qualifiedRows:
              score.qualifiedRows,
            totalMatches:
              score.totalMatches,
            attempts,
            progress,
          } as OracleWorkerResponse);
        }

        if (comparison.successful) {
          const finalValidation =
            validateComparisonResult(
              comparison,
            );

          if (finalValidation) {
            throw new Error(
              finalValidation,
            );
          }

          postWorkerMessage({
            type: "complete",
            formula: [
              ...formula,
            ] as FormulaValues,
            preview: [
              ...comparison.preview,
            ],
            qualifiedRows:
              comparison.qualifiedRows,
            totalMatches:
              comparison.totalMatches,
            attempts,
          });

          return;
        }
      }

      await yieldToWorker();
    }

    postWorkerMessage({
      type: "stopped",
      attempts,
    });
  } finally {
    searchRunning = false;
    stopRequested = false;
  }
}

self.onmessage = (
  event: MessageEvent<OracleWorkerMessage>,
): void => {
  const message = event.data;

  if (message.type === "stop") {
    stopRequested = true;
    return;
  }

  if (message.type !== "start") {
    postWorkerMessage({
      type: "error",
      message:
        "The oracle received an unknown command.",
    });

    return;
  }

  void runOracleSearch(
    message.request,
  ).catch((error: unknown) => {
    searchRunning = false;
    stopRequested = false;

    postWorkerMessage({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "The oracle encountered an unknown disturbance.",
    });
  });
};

export {};