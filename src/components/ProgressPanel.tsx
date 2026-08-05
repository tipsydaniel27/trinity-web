type ProgressPanelProps = {
  progress: number;
  attempts: number;
  qualifiedRows: number;
  passageCount: number;
  message: string;
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

export default function ProgressPanel({
  progress,
  attempts,
  qualifiedRows,
  passageCount,
  message,
}: ProgressPanelProps) {
  const safeProgress = clamp(
    progress,
    0,
    100,
  );

  return (
    <section className="progress-card">
      <div className="progress-heading">
        <span>{message}</span>

        <strong>
          {safeProgress}%
        </strong>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeProgress}
      >
        <div
          className="progress-value"
          style={{
            width: `${safeProgress}%`,
          }}
        />
      </div>

      <div className="search-statistics">
        <span>
          Attempts{" "}
          <strong>
            {attempts.toLocaleString()}
          </strong>
        </span>

        <span>
          Fulfilled{" "}
          <strong>
            {qualifiedRows}/
            {passageCount}
          </strong>
        </span>
      </div>
    </section>
  );
}