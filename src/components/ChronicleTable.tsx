import type {
  ChronicleEntry,
} from "../types/models";

type ChronicleTableProps = {
  chronicle: ChronicleEntry[];
  selectedRow: number;
  disabled: boolean;
  loading: boolean;
  onRowSelect: (
    rowIndex: number,
  ) => void;
};

function formatNumber(
  value: number,
): string {
  return String(value).padStart(
    2,
    "0",
  );
}

export default function ChronicleTable({
  chronicle,
  selectedRow,
  disabled,
  loading,
  onRowSelect,
}: ChronicleTableProps) {
  return (
    <section className="chronicle-card">
      <div className="section-heading">
        <div>
          <h2>Chronicle</h2>

          <p>
            Choose an older passage to examine
            the one above it.
          </p>
        </div>

        <span className="chronicle-count">
          {chronicle.length.toLocaleString()}{" "}
          passage
          {chronicle.length === 1
            ? ""
            : "s"}
        </span>
      </div>

      {loading ? (
        <div className="chronicle-state">
          <div className="spinner" />

          <p>
            Opening the chosen chronicle…
          </p>
        </div>
      ) : chronicle.length === 0 ? (
        <div className="chronicle-state">
          <p>
            No passages were found for the
            chosen seal and era.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Terminus</th>
                <th>Once</th>
                <th>Twice</th>
                <th>Thrice</th>
                <th>Fourfold</th>
                <th>Fivefold</th>
                <th>Sixfold</th>
              </tr>
            </thead>

            <tbody>
              {chronicle.map(
                (
                  entry,
                  rowIndex,
                ) => {
                  const selected =
                    selectedRow ===
                    rowIndex;

                  return (
                    <tr
                      key={`${entry.date}-${entry.numbers.join(
                        "-",
                      )}`}
                      className={
                        selected
                          ? "selected-row"
                          : ""
                      }
                      aria-selected={
                        selected
                      }
                      onClick={() => {
                        if (!disabled) {
                          onRowSelect(
                            rowIndex,
                          );
                        }
                      }}
                    >
                      <td>
                        {entry.date}
                      </td>

                      {entry.numbers.map(
                        (
                          number,
                          numberIndex,
                        ) => (
                          <td
                            key={`${rowIndex}-${numberIndex}`}
                          >
                            {formatNumber(
                              number,
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}