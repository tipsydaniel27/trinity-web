import type {
  FormulaValues,
} from "../types/models";

type FormulaPanelProps = {
  formula: FormulaValues;
  prediction: number[];
  formulaLimit: number;
  disabled: boolean;
  onFormulaChange: (
    index: number,
    value: number,
  ) => void;
};

function formatNumber(
  value: number,
): string {
  return value
    .toString()
    .padStart(2, "0");
}

export default function FormulaPanel({
  formula,
  prediction,
  formulaLimit,
  disabled,
  onFormulaChange,
}: FormulaPanelProps) {
  const firstCovenant =
    formula.slice(0, 6);

  const secondCovenant =
    formula.slice(6, 12);

  return (
    <section className="formula-layout">
      <div className="formula-card">
        <h2>First Covenant</h2>

        <div className="number-grid">
          {firstCovenant.map(
            (value, index) => (
              <input
                key={`first-${index}`}
                type="number"
                min={1}
                max={formulaLimit}
                value={value}
                disabled={disabled}
                aria-label={`First covenant ${
                  index + 1
                }`}
                onChange={(event) => {
                  onFormulaChange(
                    index,
                    Number(
                      event.target.value,
                    ),
                  );
                }}
              />
            ),
          )}
        </div>
      </div>

      <div className="formula-card result-card">
        <h2>Oracle</h2>

        <div className="number-grid">
          {prediction.map(
            (value, index) => (
              <output
                key={`oracle-${index}`}
                aria-label={`Oracle mark ${
                  index + 1
                }`}
              >
                {formatNumber(value)}
              </output>
            ),
          )}
        </div>
      </div>

      <div className="formula-card">
        <h2>Second Covenant</h2>

        <div className="number-grid">
          {secondCovenant.map(
            (value, index) => (
              <input
                key={`second-${index}`}
                type="number"
                min={1}
                max={formulaLimit}
                value={value}
                disabled={disabled}
                aria-label={`Second covenant ${
                  index + 1
                }`}
                onChange={(event) => {
                  onFormulaChange(
                    index + 6,
                    Number(
                      event.target.value,
                    ),
                  );
                }}
              />
            ),
          )}
        </div>
      </div>
    </section>
  );
}