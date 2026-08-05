type OracleButtonProps = {
  searching: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
};

export default function OracleButton({
  searching,
  disabled = false,
  onStart,
  onStop,
}: OracleButtonProps) {
  return (
    <button
      className={`oracle-button ${
        searching ? "stop" : ""
      }`}
      type="button"
      disabled={disabled}
      onClick={
        searching
          ? onStop
          : onStart
      }
    >
      {searching
        ? "HALT THE ORACLE"
        : "UNSEAL THE ORACLE"}
    </button>
  );
}