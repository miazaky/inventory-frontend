import { useEffect, useState } from "react";
import { parseTokenFromHash, parseEmailFromToken } from "./auth/msalConfig";
import { isEmailAllowed } from "./auth/allowedEmails";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/ProductsPage";
import { WarehousesPage } from "./pages/WarehousesPage";
import { InventoryPage } from "./pages/InventoryPage";
import { TransfersPage } from "./pages/TransfersPage";

type Page = "dashboard" | "products" | "warehouses" | "inventory" | "transfers";

const navItems: { key: Page; label: string; icon: string }[] = [
  { key: "dashboard",  label: "Apžvalga",    icon: "📊" },
  { key: "products",   label: "Medžiagos",   icon: "📦" },
  { key: "warehouses", label: "Sandėliai",   icon: "🏭" },
  { key: "inventory",  label: "Inventorius", icon: "🗂️" },
  { key: "transfers",  label: "Perkėlimai",  icon: "🔀" },
];

const pages: Record<Page, React.FC> = {
  dashboard:  DashboardPage,
  products:   ProductsPage,
  warehouses: WarehousesPage,
  inventory:  InventoryPage,
  transfers:  TransfersPage,
};

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [current, setCurrent] = useState<Page>("dashboard");
  const logo = "/wirepro.png"

  useEffect(() => {
    // Check if we're returning from a Microsoft login redirect
    if (window.location.hash.includes("access_token")) {
      const token = parseTokenFromHash();
      if (token) {
        const email = parseEmailFromToken(token);
        if (email && isEmailAllowed(email)) {
          sessionStorage.setItem("userEmail", email);
          setUserEmail(email);
          // Clean up the URL hash
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          setAccessDenied(true);
          setTimeout(() => {
            sessionStorage.clear();
            setAccessDenied(false);
          }, 3000);
        }
      }
      return;
    }

    // Check if already logged in from a previous session
    const stored = sessionStorage.getItem("userEmail");
    if (stored && isEmailAllowed(stored)) {
      setUserEmail(stored);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    setUserEmail(null);
    window.location.href = window.location.origin;
  };

  if (accessDenied) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-lg)", padding: "48px 44px", width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>⛔</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", margin: "0 0 8px" }}>Prieiga uždrausta</h2>
          <p style={{ fontSize: 14, color: "var(--text-2)" }}>Ši paskyra neturi teisių. Nukreipiama atgal...</p>
        </div>
      </div>
    );
  }

  if (!userEmail) {
    return <LoginPage />;
  }

  const PageComponent = pages[current];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">
            <img src={logo} alt="Logo" style={{ width: "100%", height: "100%" }} />
          </span>
          <div>
            <div className="sidebar-logo-text">Inventorizacija</div>
            <div className="sidebar-logo-sub">Valdymo sistema</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrent(item.key)}
              className={`nav-item ${current === item.key ? "active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8, wordBreak: "break-all" }}>{userEmail}</div>
          <button onClick={handleLogout} className="btn btn-secondary btn-full" style={{ fontSize: 12, padding: "6px 10px" }}>
            Atsijungti
          </button>
        </div>
      </aside>
      <main className="main-content">
        <PageComponent />
      </main>
    </div>
  );
}
