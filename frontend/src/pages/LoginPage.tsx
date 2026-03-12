import { getAuthUrl } from "../auth/msalConfig";

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = getAuthUrl();
  };
  const logo = "/wirepro.png"

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-lg)", padding: "48px 44px", width: "100%", maxWidth: 420, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>
          <img src={logo} alt="Logo" style={{ width: "50px", height: "50px" }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>
          Inventorizacija
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 36 }}>
          Valdymo sistema
        </p>

        <button
          onClick={handleLogin}
          className="btn btn-primary btn-full"
          style={{ padding: "11px 20px", fontSize: 14, gap: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          Prisijungti su Microsoft
        </button>

        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 24 }}>
          Tik įgalioti darbuotojai gali prisijungti
        </p>
      </div>
    </div>
  );
}
