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
  { key: "dashboard", label: "Apžvalga", icon: "📊" },
  { key: "products", label: "Medžiagos", icon: "📦" },
  { key: "warehouses", label: "Sandėliai", icon: "🏭" },
  { key: "inventory", label: "Inventorius", icon: "🗂️" },
  // { key: "transactions", label: "Transactions", icon: "↕️" },
  { key: "transfers", label: "Perkėlimai", icon: "🔀" },
  // { key: "orders", label: "Orders", icon: "🛒" },
];

function Sidebar({
  current,
  onNavigate,
}: {
  current: Page;
  onNavigate: (p: Page) => void;
}) {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-gray-100">
        {/* <h1 className="font-bold text-gray-900 text-base leading-tight">Inventorizacija</h1> */}
      </div>
      <nav className="flex-1 py-3">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
              current === item.key
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

const pages: Record<Page, React.FC> = {
  dashboard: DashboardPage,
  products: ProductsPage,
  warehouses: WarehousesPage,
  inventory: InventoryPage,
  // transactions: TransactionsPage,
  transfers: TransfersPage,
  // orders: OrdersPage,
};

export default function App() {
  const [current, setCurrent] = useState<Page>("dashboard");
  const PageComponent = pages[current];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar current={current} onNavigate={setCurrent} />
      <main className="flex-1 overflow-y-auto">
        <PageComponent />
      </main>
    </div>
  );
}
