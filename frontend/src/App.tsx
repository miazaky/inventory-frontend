import React, { useEffect, useState } from "react";
import { parseTokenFromHash, parseEmailFromToken } from "./auth/msalConfig";
import { isEmailAllowed } from "./auth/allowedEmails";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/ProductsPage";
import { WarehousesPage } from "./pages/WarehousesPage";
import { InventoryPage } from "./pages/InventoryPage";
import { TransfersPage } from "./pages/TransfersPage";
import { AllOrdersPage } from "./pages/AllOrdersPage";
import { GroundMaterialsPage, FlatRoofMaterialsPage, SlopedRoofMaterialsPage } from "./pages/GroundMaterialsPage";

type Page =
  | "dashboard"
  | "products"
  | "warehouses"
  | "inventory"
  | "transfers"
  | "allorders"
  | "ground"
  | "flatroof"
  | "slopedroof";

const navItems: { key: Page; label: string; icon: string; group?: string }[] = [
  { key: "dashboard",  label: "Apžvalga",      icon: "📊" },
  { key: "allorders",  label: "Užsakymai",      icon: "📋" },
  { key: "ground",     label: "Žemės sistema",        icon: "🌱", group: "Medžiagos" },
  { key: "flatroof",   label: "Plokščias stogas",      icon: "🏢", group: "Medžiagos" },
  { key: "slopedroof", label: "Šlaitinis stogas",      icon: "🏠", group: "Medžiagos" },
  { key: "products",   label: "Visos medžiagos",       icon: "📦", group: "Medžiagos" },
  { key: "warehouses", label: "Sandėliai",      icon: "🏭" },
  { key: "inventory",  label: "Inventorius",    icon: "🗂️" },
  { key: "transfers",  label: "Perkėlimai",     icon: "🔀" },
];

const pages: Record<Page, React.FC> = {
  dashboard:  DashboardPage,
  products:   ProductsPage,
  warehouses: WarehousesPage,
  inventory:  InventoryPage,
  transfers:  TransfersPage,
  allorders:  AllOrdersPage,
  ground:     GroundMaterialsPage,
  flatroof:   FlatRoofMaterialsPage,
  slopedroof: SlopedRoofMaterialsPage,
};

export default function App() {
  const [userEmail, setUserEmail]   = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [current, setCurrent]       = useState<Page>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const logo = "/MK_juodas_mini_permatomas.png";

  useEffect(() => {
    if (window.location.hash.includes("access_token")) {
      const token = parseTokenFromHash();
      if (token) {
        const email = parseEmailFromToken(token);
        if (email && isEmailAllowed(email)) {
          sessionStorage.setItem("userEmail", email);
          setUserEmail(email);
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          setAccessDenied(true);
          setTimeout(() => { sessionStorage.clear(); setAccessDenied(false); }, 3000);
        }
      }
      return;
    }
    const stored = sessionStorage.getItem("userEmail");
    if (stored && isEmailAllowed(stored)) setUserEmail(stored);
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

  if (!userEmail) return <LoginPage />;

  const PageComponent = pages[current];

  // Build nav with group labels
  const rendered: React.ReactNode[] = [];
  let lastGroup: string | undefined = undefined;
  navItems.forEach((item) => {
    if (item.group && item.group !== lastGroup) {
      rendered.push(
        <div
          key={`group-${item.group}`}
          className="sidebar-group-label"
          style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
          {item.group}
        </div>
      );
      lastGroup = item.group;
    } else if (!item.group && lastGroup) {
      lastGroup = undefined;
    }
    rendered.push(
      <button
        key={item.key}
        onClick={() => setCurrent(item.key)}
        className={`nav-item ${current === item.key ? "active" : ""}`}
        title={sidebarCollapsed ? item.label : undefined}
        style={item.group ? { paddingLeft: 24 } : undefined}
      >
        <span className="nav-icon">{item.icon}</span>
        <span className="nav-label">{item.label}</span>
      </button>
    );
  });

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div
          className="sidebar-logo sidebar-logo-clickable"
          role="button"
          tabIndex={0}
          onClick={() => setSidebarCollapsed((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSidebarCollapsed((value) => !value);
            }
          }}
          aria-label={sidebarCollapsed ? "Išskleisti meniu" : "Suskleisti meniu"}
          aria-expanded={!sidebarCollapsed}
          title={sidebarCollapsed ? "Išskleisti meniu" : "Suskleisti meniu"}
        >
          <span className="sidebar-logo-icon">
            <img src={logo} alt="Logo" style={{ width: "100%", height: "100%" }} />
          </span>
          <div className="sidebar-logo-text-wrap">
            <div className="sidebar-logo-text">Inventorizacija</div>
            <div className="sidebar-logo-sub">Valdymo sistema</div>
          </div>
          <span className="sidebar-collapse-indicator" aria-hidden="true">
            {sidebarCollapsed ? "▶" : "◀"}
          </span>
        </div>
        <nav className="sidebar-nav">
          {rendered}
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
          <div className={`sidebar-user ${sidebarCollapsed ? "collapsed" : ""}`} title={userEmail ?? undefined} style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8, wordBreak: "break-all" }}>{userEmail}</div>
          <button onClick={handleLogout} className="btn btn-secondary btn-full" style={{ fontSize: 12, padding: "6px 10px" }}>
            <span className="sidebar-logout-label">Atsijungti</span>
            <span className="sidebar-logout-icon" aria-hidden="true"><img src="logout.png" className="sidebar-logout-icon-img" alt="Atsijungti" /></span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <PageComponent key={current} />
      </main>
    </div>
  );
}
