import type { User } from "firebase/auth";
import trinityLogo from "../assets/holy-trinity.png";

type LoginProps = {
  user: User | null;
  authReady: boolean;
  authMessage: string;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
};

export default function Login({
  user,
  authReady,
  authMessage,
  onLogin,
  onLogout,
}: LoginProps) {
  if (!authReady) {
    return (
      <main className="center-screen">
        <section className="gate-card">
          <div className="spinner" />
          <p>Preparing the gate…</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="center-screen">
        <section className="gate-card">
          <img
            className="gate-logo"
            src={trinityLogo}
            alt="Trinity"
          />

          <h1>Trinity</h1>

          <p className="gate-description">
            The sealed instrument awaits its appointed keeper.
          </p>

          <button
            className="primary-button"
            type="button"
            onClick={() => {
              void onLogin();
            }}
          >
            Open the Gate
          </button>

          {authMessage && (
            <p
              className="error-message"
              role="alert"
            >
              {authMessage}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <header className="topbar">
      <div className="brand">
        <img
          src={trinityLogo}
          alt=""
          className="brand-logo"
        />

        <div>
          <h1>Trinity</h1>
          <p>Instrument of the old passages</p>
        </div>
      </div>

      <button
        type="button"
        className="text-button"
        onClick={() => {
          void onLogout();
        }}
      >
        Close Gate
      </button>
    </header>
  );
}