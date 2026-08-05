import FormulaPanel from "./FormulaPanel";
import ProgressPanel from "./ProgressPanel";
import OracleButton from "./OracleButton";
import type {
  FormulaValues,
} from "../types/models";

type OraclePanelProps = {
  formula: FormulaValues;
  prediction: number[];
  formulaLimit: number;
  searching: boolean;
  loadingChronicle: boolean;
  progress: number;
  attempts: number;
  qualifiedRows: number;
  passageCount: number;
  message: string;
  onFormulaChange: (
    index: number,
    value: number,
  ) => void;
  onStart: () => void;
  onStop: () => void;
};

export default function OraclePanel({
  formula,
  prediction,
  formulaLimit,
  searching,
  loadingChronicle,
  progress,
  attempts,
  qualifiedRows,
  passageCount,
  message,
  onFormulaChange,
  onStart,
  onStop,
}: OraclePanelProps) {
  const oracleDisabled =
    loadingChronicle ||
    passageCount < 1;

  return (
    <>
      <FormulaPanel
        formula={formula}
        prediction={prediction}
        formulaLimit={formulaLimit}
        disabled={
          searching ||
          loadingChronicle
        }
        onFormulaChange={
          onFormulaChange
        }
      />

      <ProgressPanel
        progress={progress}
        attempts={attempts}
        qualifiedRows={
          qualifiedRows
        }
        passageCount={
          passageCount
        }
        message={message}
      />

      <OracleButton
        searching={searching}
        disabled={
          !searching &&
          oracleDisabled
        }
        onStart={onStart}
        onStop={onStop}
      />
    </>
  );
}