import { useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/ProductsPage";
import { WarehousesPage } from "./pages/WarehousesPage";
import { InventoryPage } from "./pages/InventoryPage";
// import { TransactionsPage } from "./pages/TransactionsPage";
import { TransfersPage } from "./pages/TransfersPage";
// import { OrdersPage } from "./pages/OrdersPage";

type Page =
  | "dashboard"
  | "products"
  | "warehouses"
  | "inventory"
  // | "transactions"
  | "transfers";
  // | "orders";

const navItems: { key: Page; label: string; icon: string }[] = [
  { key: "dashboard",  label: "Apžvalga",   icon: "📊" },
  { key: "products",   label: "Medžiagos",  icon: "📦" },
  { key: "warehouses", label: "Sandėliai",  icon: "🏭" },
  { key: "inventory",  label: "Inventorius",icon: "🗂️" },
  // { key: "transactions", label: "Transactions", icon: "↕️" },
  { key: "transfers",  label: "Perkėlimai", icon: "🔀" },
  // { key: "orders", label: "Orders", icon: "🛒" },
];

const pages: Record<Page, React.FC> = {
  dashboard:  DashboardPage,
  products:   ProductsPage,
  warehouses: WarehousesPage,
  inventory:  InventoryPage,
  // transactions: TransactionsPage,
  transfers:  TransfersPage,
  // orders: OrdersPage,
};

export default function App() {
  const [current, setCurrent] = useState<Page>("dashboard");
  const PageComponent = pages[current];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">☀️</span>
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
      </aside>
      <main className="main-content">
        <PageComponent />
      </main>
    </div>
  );
}
