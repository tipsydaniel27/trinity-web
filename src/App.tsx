import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import "./App.css";

import Login from "./components/Login";
import FormulaPanel from "./components/FormulaPanel";
import SettingsPanel from "./components/SettingsPanel";
import ProgressPanel from "./components/ProgressPanel";
import ChronicleTable from "./components/ChronicleTable";
import OracleButton from "./components/OracleButton";

import {
  DEFAULT_SETTINGS,
  INITIAL_FORMULA,
  cloneFormula,
  createFormulaValues,
  type ChronicleEntry,
  type FormulaValues,
  type OracleSearchRequest,
  type OracleWorkerMessage,
  type OracleWorkerResponse,
  type SupportedSeal,
} from "./types/models";

import {
  calculateMatchPercentage,
  clamp,
  countMatches,
  generatePrediction,
  normalizeFormula,
} from "./engine/trinityEngine";

import {
  calculateSearchProgress,
} from "./engine/comparer";

import {
  validateOracleSearchRequest,
  validateSelectedPassage,
} from "./engine/validator";

import {
  loadChronicle,
} from "./services/chronicleLoader";

import {
  auth,
  googleProvider,
} from "./services/firebase";

const ALLOWED_EMAIL =
  "vsmmcihoms.daniel@gmail.com";

function createOracleWorker(): Worker {
  return new Worker(
    new URL(
      "./workers/oracle.worker.ts",
      import.meta.url,
    ),
    {
      type: "module",
    },
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

export default function App() {
  const [user, setUser] =
    useState<User | null>(null);

  const [authReady, setAuthReady] =
    useState(false);

  const [authMessage, setAuthMessage] =
    useState("");

  const [formula, setFormula] =
    useState<FormulaValues>(() =>
      cloneFormula(INITIAL_FORMULA),
    );

  const [chronicle, setChronicle] =
    useState<ChronicleEntry[]>([]);

  const [selectedRow, setSelectedRow] =
    useState(1);

  const [
    requiredMatches,
    setRequiredMatches,
  ] = useState(
    DEFAULT_SETTINGS.requiredMatches,
  );

  const [passages, setPassages] =
    useState(
      DEFAULT_SETTINGS.passages,
    );

  const [seal, setSeal] =
    useState<SupportedSeal>(
      DEFAULT_SETTINGS.seal,
    );

  const [
    formulaLimit,
    setFormulaLimit,
  ] = useState(
    DEFAULT_SETTINGS.formulaLimit,
  );

  const [firstYear, setFirstYear] =
    useState(
      DEFAULT_SETTINGS.firstYear,
    );

  const [progress, setProgress] =
    useState(0);

  const [attempts, setAttempts] =
    useState(0);

  const [
    qualifiedRows,
    setQualifiedRows,
  ] = useState(0);

  const [message, setMessage] =
    useState(
      "Opening the chosen chronicle…",
    );

  const [searching, setSearching] =
    useState(false);

  const [
    loadingChronicle,
    setLoadingChronicle,
  ] = useState(false);

  const oracleWorkerRef =
    useRef<Worker | null>(null);

  const activeSearchRef =
    useRef<{
      passages: number;
      requiredMatches: number;
    }>({
      passages:
        DEFAULT_SETTINGS.passages,
      requiredMatches:
        DEFAULT_SETTINGS.requiredMatches,
    });

  const availableTransitions =
    Math.max(
      0,
      chronicle.length - 1,
    );

  const effectivePassages =
    availableTransitions > 0
      ? clamp(
          passages,
          1,
          availableTransitions,
        )
      : 0;

  const prediction = useMemo(
    (): number[] => {
      const selectedEntry =
        chronicle[selectedRow];

      if (!selectedEntry) {
        return [
          1,
          2,
          3,
          4,
          5,
          6,
        ];
      }

      try {
        return generatePrediction(
          selectedEntry.numbers,
          formula,
          seal,
        );
      } catch {
        return [
          1,
          2,
          3,
          4,
          5,
          6,
        ];
      }
    },
    [
      chronicle,
      formula,
      seal,
      selectedRow,
    ],
  );

  const currentMatchCount =
    useMemo((): number => {
      if (
        selectedRow <= 0 ||
        !chronicle[selectedRow] ||
        !chronicle[selectedRow - 1]
      ) {
        return 0;
      }

      try {
        return countMatches(
          prediction,
          chronicle[
            selectedRow - 1
          ].numbers,
        );
      } catch {
        return 0;
      }
    }, [
      chronicle,
      prediction,
      selectedRow,
    ]);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          account: User | null,
        ) => {
          if (!account) {
            setUser(null);
            setAuthReady(true);
            return;
          }

          const accountEmail =
            account.email
              ?.trim()
              .toLowerCase();

          if (
            accountEmail !==
            ALLOWED_EMAIL.toLowerCase()
          ) {
            await signOut(auth);

            setUser(null);

            setAuthMessage(
              "This gate recognizes only its appointed keeper.",
            );

            setAuthReady(true);
            return;
          }

          setUser(account);
          setAuthMessage("");
          setAuthReady(true);
        },
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const worker =
      createOracleWorker();

    oracleWorkerRef.current =
      worker;

    worker.onmessage = (
      event: MessageEvent<OracleWorkerResponse>,
    ) => {
      const response =
        event.data;

      if (
        response.type ===
        "progress"
      ) {
        setFormula(
          cloneFormula(
            response.formula,
          ),
        );

        setAttempts(
          response.attempts,
        );

        setQualifiedRows(
          response.qualifiedRows,
        );

        const passageCount =
          activeSearchRef.current
            .passages;

        const agreement =
          activeSearchRef.current
            .requiredMatches;

        const calculatedProgress =
          typeof response.progress ===
          "number"
            ? response.progress
            : calculateSearchProgress(
                response.totalMatches,
                passageCount,
                agreement,
                response.qualifiedRows,
              );

        setProgress(
          calculatedProgress,
        );

        setMessage(
          `${response.qualifiedRows} of ${passageCount} passages presently satisfy the covenant.`,
        );

        return;
      }

      if (
        response.type ===
        "complete"
      ) {
        setFormula(
          cloneFormula(
            response.formula,
          ),
        );

        setAttempts(
          response.attempts,
        );

        setQualifiedRows(
          response.qualifiedRows,
        );

        setProgress(100);
        setSearching(false);

        setMessage(
          `The covenant was fulfilled after ${response.attempts.toLocaleString()} attempts.`,
        );

        return;
      }

      if (
        response.type ===
        "stopped"
      ) {
        setAttempts(
          response.attempts,
        );

        setSearching(false);

        setMessage(
          `The search was halted after ${response.attempts.toLocaleString()} attempts.`,
        );

        return;
      }

      if (
        response.type ===
        "error"
      ) {
        setSearching(false);

        setMessage(
          response.message,
        );
      }
    };

    worker.onerror = () => {
      setSearching(false);

      setMessage(
        "The oracle encountered an unexpected disturbance.",
      );
    };

    return () => {
      worker.terminate();

      if (
        oracleWorkerRef.current ===
        worker
      ) {
        oracleWorkerRef.current =
          null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const abortController =
      new AbortController();

    setLoadingChronicle(true);
    setSearching(false);
    setChronicle([]);
    setSelectedRow(1);
    setProgress(0);
    setAttempts(0);
    setQualifiedRows(0);

    setMessage(
      "Opening the chosen chronicle…",
    );

    oracleWorkerRef.current?.postMessage(
      {
        type: "stop",
      } satisfies OracleWorkerMessage,
    );

    void loadChronicle(
      seal,
      firstYear,
      abortController.signal,
    )
      .then((result) => {
        if (
          abortController.signal
            .aborted
        ) {
          return;
        }

        setChronicle(
          result.entries,
        );

        const defaultSelectedRow =
          result.entries.length >= 2
            ? 1
            : 0;

        setSelectedRow(
          defaultSelectedRow,
        );

        const transitions =
          Math.max(
            1,
            result.entries.length - 1,
          );

        setPassages(
          (currentPassages) =>
            clamp(
              currentPassages,
              1,
              transitions,
            ),
        );

        setMessage(
          `${result.entries.length.toLocaleString()} passages were opened.`,
        );
      })
      .catch((error: unknown) => {
        if (
          abortController.signal
            .aborted
        ) {
          return;
        }

        setChronicle([]);

        setMessage(
          getErrorMessage(
            error,
            "The chosen chronicle could not be opened.",
          ),
        );
      })
      .finally(() => {
        if (
          !abortController.signal
            .aborted
        ) {
          setLoadingChronicle(
            false,
          );
        }
      });

    return () => {
      abortController.abort();
    };
  }, [
    user,
    seal,
    firstYear,
  ]);

  useEffect(() => {
    if (
      loadingChronicle ||
      searching ||
      chronicle.length === 0
    ) {
      return;
    }

    if (selectedRow <= 0) {
      setProgress(0);
      setQualifiedRows(0);

      setMessage(
        "No newer passage stands above this entry.",
      );

      return;
    }

    const percentage =
      calculateMatchPercentage(
        currentMatchCount,
      );

    setProgress(percentage);

    setQualifiedRows(
      currentMatchCount >=
        requiredMatches
        ? 1
        : 0,
    );

    setMessage(
      `${currentMatchCount} of 6 marks agree with the passage above.`,
    );
  }, [
    chronicle.length,
    currentMatchCount,
    loadingChronicle,
    requiredMatches,
    searching,
    selectedRow,
  ]);

  useEffect(() => {
    if (
      availableTransitions <= 0
    ) {
      return;
    }

    if (
      passages >
      availableTransitions
    ) {
      setPassages(
        availableTransitions,
      );
    }
  }, [
    availableTransitions,
    passages,
  ]);

  useEffect(() => {
    if (
      selectedRow >=
      chronicle.length
    ) {
      setSelectedRow(
        chronicle.length >= 2
          ? 1
          : 0,
      );
    }
  }, [
    chronicle.length,
    selectedRow,
  ]);

  async function handleLogin(): Promise<void> {
    try {
      setAuthMessage("");

      const result =
        await signInWithPopup(
          auth,
          googleProvider,
        );

      const email =
        result.user.email
          ?.trim()
          .toLowerCase();

      if (
        email !==
        ALLOWED_EMAIL.toLowerCase()
      ) {
        await signOut(auth);

        setAuthMessage(
          "This gate recognizes only its appointed keeper.",
        );
      }
    } catch (error: unknown) {
      setAuthMessage(
        getErrorMessage(
          error,
          "The gate could not be opened.",
        ),
      );
    }
  }

  async function handleLogout(): Promise<void> {
    oracleWorkerRef.current?.postMessage(
      {
        type: "stop",
      } satisfies OracleWorkerMessage,
    );

    setFormula(
      cloneFormula(
        INITIAL_FORMULA,
      ),
    );

    setChronicle([]);
    setSelectedRow(1);

    setRequiredMatches(
      DEFAULT_SETTINGS.requiredMatches,
    );

    setPassages(
      DEFAULT_SETTINGS.passages,
    );

    setSeal(
      DEFAULT_SETTINGS.seal,
    );

    setFormulaLimit(
      DEFAULT_SETTINGS.formulaLimit,
    );

    setFirstYear(
      DEFAULT_SETTINGS.firstYear,
    );

    setProgress(0);
    setAttempts(0);
    setQualifiedRows(0);
    setSearching(false);
    setLoadingChronicle(false);

    await signOut(auth);
  }

  function handleFormulaChange(
    index: number,
    value: number,
  ): void {
    if (
      searching ||
      index < 0 ||
      index >= 12
    ) {
      return;
    }

    setFormula(
      (
        currentFormula:
          FormulaValues,
      ) => {
        const nextValues = [
          ...currentFormula,
        ];

        nextValues[index] =
          clamp(
            Math.trunc(value),
            1,
            formulaLimit,
          );

        return createFormulaValues(
          nextValues,
        );
      },
    );
  }

  function handleFormulaLimitChange(
    value: number,
  ): void {
    const nextLimit =
      clamp(
        Math.trunc(value),
        1,
        999,
      );

    setFormulaLimit(
      nextLimit,
    );

    setFormula(
      (
        currentFormula:
          FormulaValues,
      ) =>
        normalizeFormula(
          currentFormula,
          nextLimit,
        ),
    );
  }

  function handleRequiredMatchesChange(
    value: number,
  ): void {
    setRequiredMatches(
      clamp(
        Math.trunc(value),
        1,
        6,
      ),
    );

    setAttempts(0);
    setQualifiedRows(0);
  }

  function handlePassagesChange(
    value: number,
  ): void {
    if (
      availableTransitions <= 0
    ) {
      setPassages(1);
      return;
    }

    setPassages(
      clamp(
        Math.trunc(value),
        1,
        availableTransitions,
      ),
    );

    setAttempts(0);
    setQualifiedRows(0);
  }

  function handleSealChange(
    value: SupportedSeal,
  ): void {
    setSeal(value);

    setProgress(0);
    setAttempts(0);
    setQualifiedRows(0);
  }

  function handleFirstYearChange(
    value: number,
  ): void {
    setFirstYear(
      clamp(
        Math.trunc(value),
        2025,
        new Date().getFullYear() +
          1,
      ),
    );

    setProgress(0);
    setAttempts(0);
    setQualifiedRows(0);
  }

  function handleRowSelect(
    rowIndex: number,
  ): void {
    if (
      searching ||
      loadingChronicle
    ) {
      return;
    }

    setSelectedRow(rowIndex);
    setAttempts(0);
  }

  function beginOracleSearch(): void {
    if (
      searching ||
      loadingChronicle
    ) {
      return;
    }

    const passageValidation =
      validateSelectedPassage(
        chronicle,
        Math.max(
          1,
          selectedRow,
        ),
        seal,
      );

    if (
      !passageValidation.valid
    ) {
      setMessage(
        passageValidation.message,
      );

      return;
    }

    if (
      effectivePassages < 1
    ) {
      setMessage(
        "At least one passage transition is required.",
      );

      return;
    }

    const request: OracleSearchRequest =
      {
        chronicle,
        requiredMatches,
        passages:
          effectivePassages,
        seal,
        formulaLimit,
      };

    const validation =
      validateOracleSearchRequest(
        request,
      );

    if (!validation.valid) {
      setMessage(
        validation.message,
      );

      return;
    }

    if (
      !oracleWorkerRef.current
    ) {
      setMessage(
        "The oracle is not yet prepared.",
      );

      return;
    }

    activeSearchRef.current = {
      passages:
        effectivePassages,

      requiredMatches,
    };

    setSearching(true);
    setProgress(0);
    setAttempts(0);
    setQualifiedRows(0);

    setMessage(
      "The oracle is examining the old passages.",
    );

    const workerMessage:
      OracleWorkerMessage = {
        type: "start",
        request,
      };

    oracleWorkerRef.current.postMessage(
      workerMessage,
    );
  }

  function stopOracleSearch(): void {
    if (
      !oracleWorkerRef.current
    ) {
      setSearching(false);
      return;
    }

    const workerMessage:
      OracleWorkerMessage = {
        type: "stop",
      };

    oracleWorkerRef.current.postMessage(
      workerMessage,
    );

    setMessage(
      "The oracle is preparing to halt.",
    );
  }

  if (
    !authReady ||
    !user
  ) {
    return (
      <Login
        user={user}
        authReady={authReady}
        authMessage={authMessage}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <main className="app-shell">
      <Login
        user={user}
        authReady={authReady}
        authMessage={authMessage}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <section className="workspace">
        <FormulaPanel
          formula={formula}
          prediction={prediction}
          formulaLimit={
            formulaLimit
          }
          disabled={
            searching ||
            loadingChronicle
          }
          onFormulaChange={
            handleFormulaChange
          }
        />

        <SettingsPanel
          requiredMatches={
            requiredMatches
          }
          passages={
            effectivePassages > 0
              ? effectivePassages
              : 1
          }
          availableTransitions={
            Math.max(
              1,
              availableTransitions,
            )
          }
          seal={seal}
          formulaLimit={
            formulaLimit
          }
          firstYear={
            firstYear
          }
          disabled={
            searching ||
            loadingChronicle
          }
          onRequiredMatchesChange={
            handleRequiredMatchesChange
          }
          onPassagesChange={
            handlePassagesChange
          }
          onSealChange={
            handleSealChange
          }
          onFormulaLimitChange={
            handleFormulaLimitChange
          }
          onFirstYearChange={
            handleFirstYearChange
          }
        />

        <ProgressPanel
          progress={progress}
          attempts={attempts}
          qualifiedRows={
            qualifiedRows
          }
          passageCount={
            effectivePassages > 0
              ? effectivePassages
              : 1
          }
          message={message}
        />

        <ChronicleTable
          chronicle={chronicle}
          selectedRow={
            selectedRow
          }
          disabled={
            searching ||
            loadingChronicle
          }
          loading={
            loadingChronicle
          }
          onRowSelect={
            handleRowSelect
          }
        />

        <OracleButton
          searching={searching}
          disabled={
            loadingChronicle ||
            chronicle.length < 2
          }
          onStart={
            beginOracleSearch
          }
          onStop={
            stopOracleSearch
          }
        />
      </section>
    </main>
  );
}