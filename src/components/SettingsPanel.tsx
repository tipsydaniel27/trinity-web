import {
  SUPPORTED_SEALS,
  type SupportedSeal,
} from "../types/models";

type SettingsPanelProps = {
  requiredMatches: number;
  passages: number;
  availableTransitions: number;
  seal: SupportedSeal;
  formulaLimit: number;
  firstYear: number;
  disabled: boolean;
  onRequiredMatchesChange: (
    value: number,
  ) => void;
  onPassagesChange: (
    value: number,
  ) => void;
  onSealChange: (
    value: SupportedSeal,
  ) => void;
  onFormulaLimitChange: (
    value: number,
  ) => void;
  onFirstYearChange: (
    value: number,
  ) => void;
};

function clamp(
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

export default function SettingsPanel({
  requiredMatches,
  passages,
  availableTransitions,
  seal,
  formulaLimit,
  firstYear,
  disabled,
  onRequiredMatchesChange,
  onPassagesChange,
  onSealChange,
  onFormulaLimitChange,
  onFirstYearChange,
}: SettingsPanelProps) {
  const safeAvailableTransitions =
    Math.max(
      1,
      availableTransitions,
    );

  const currentYear =
    new Date().getFullYear();

  return (
    <section className="settings-card">
      <label>
        <span>Agreement</span>

        <input
          type="number"
          min={1}
          max={6}
          value={requiredMatches}
          disabled={disabled}
          onChange={(event) => {
            onRequiredMatchesChange(
              clamp(
                Number(
                  event.target.value,
                ),
                1,
                6,
              ),
            );
          }}
        />
      </label>

      <label>
        <span>Passages</span>

        <input
          type="number"
          min={1}
          max={
            safeAvailableTransitions
          }
          value={passages}
          disabled={disabled}
          onChange={(event) => {
            onPassagesChange(
              clamp(
                Number(
                  event.target.value,
                ),
                1,
                safeAvailableTransitions,
              ),
            );
          }}
        />
      </label>

      <label>
        <span>Seal</span>

        <select
          value={seal}
          disabled={disabled}
          onChange={(event) => {
            onSealChange(
              Number(
                event.target.value,
              ) as SupportedSeal,
            );
          }}
        >
          {SUPPORTED_SEALS.map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        <span>Formula Limit</span>

        <input
          type="number"
          min={1}
          max={999}
          value={formulaLimit}
          disabled={disabled}
          onChange={(event) => {
            onFormulaLimitChange(
              clamp(
                Number(
                  event.target.value,
                ),
                1,
                999,
              ),
            );
          }}
        />
      </label>

      <label>
        <span>First Era</span>

        <input
          type="number"
          min={2025}
          max={currentYear + 1}
          value={firstYear}
          disabled={disabled}
          onChange={(event) => {
            onFirstYearChange(
              clamp(
                Number(
                  event.target.value,
                ),
                2025,
                currentYear + 1,
              ),
            );
          }}
        />
      </label>
    </section>
  );
}