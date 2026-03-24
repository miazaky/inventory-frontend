import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import type { Order, WarehouseInventory } from "../types";

interface EnrichedItem extends WarehouseInventory {
  productName: string;
  productSku: string | null;
  requiredQty: number;
  sufficient: boolean;
}

interface Props {
  order: Order;
  productMap: Record<string, { name: string | null; sku: string | null }>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LowStockModal({ order, productMap, onConfirm, onCancel }: Props) {
  const [items, setItems]   = useState<EnrichedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    warehouseInventoryApi
      .getLowStock()
      .then((lowStock) => {
        // Filter to only products that are in this order AND in the low-stock list
        const orderProductIds = new Set((order.items ?? []).map((i) => i.productId));

        const enriched: EnrichedItem[] = lowStock
          .filter((inv) => orderProductIds.has(inv.productId))
          .map((inv) => {
            const required = order.items?.find((i) => i.productId === inv.productId)?.quantity ?? 0;
            return {
              ...inv,
              productName: productMap[inv.productId]?.name ?? `ID: ${inv.productId.slice(0, 8)}…`,
              productSku:  productMap[inv.productId]?.sku  ?? null,
              requiredQty: required,
              sufficient:  inv.quantityCurrent >= required,
            };
          });

        setItems(enriched);
      })
      .catch(() => setError("Nepavyko patikrinti sandėlio likučių"))
      .finally(() => setLoading(false));
  }, [order.id]);

  const blockers = items.filter((i) => !i.sufficient);
  const warnings = items.filter((i) => i.sufficient);
  const canReserve = !loading && !error && blockers.length === 0;

  return (
    <Modal title="Sandėlio likučių patikrinimas" onClose={onCancel} size="md">
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16 }}>
        Užsakymas <strong>#{order.id.slice(0, 8)}…</strong>
        {order.user?.name ? ` · ${order.user.name}` : ""}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-3)", fontSize: 13 }}>
          Tikrinami sandėlio likučiai…
        </div>
      )}

      {error && (
        <div style={alertStyle("error")}>⚠ {error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-1)" }}>
            Visi kiekiai pakankami
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
            Galite saugiai rezervuoti šį užsakymą.
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {blockers.length > 0 && (
            <section>
              <div style={sectionHeader("#dc2626")}>
                🚫 Nepakankamas kiekis — rezervacija negalima ({blockers.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {blockers.map((item) => <StockRow key={item.id} item={item} variant="error" />)}
              </div>
            </section>
          )}

          {warnings.length > 0 && (
            <section>
              <div style={sectionHeader("#d97706")}>
                ⚠ Mažas likutis po rezervacijos ({warnings.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {warnings.map((item) => <StockRow key={item.id} item={item} variant="warning" />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div style={{
        display: "flex", gap: 8, justifyContent: "flex-end",
        marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)",
        alignItems: "center",
      }}>
        {!canReserve && !loading && !error && blockers.length > 0 && (
          <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600, marginRight: "auto" }}>
            Papildykite atsargas prieš rezervuodami
          </span>
        )}
        <button className="btn btn-secondary" onClick={onCancel} style={{ fontSize: 13 }}>
          Atšaukti
        </button>
        <button
          className="btn"
          onClick={onConfirm}
          disabled={!canReserve}
          style={{
            background: canReserve ? "#6366f1" : "var(--surface-2)",
            color: canReserve ? "#fff" : "var(--text-3)",
            border: "none",
            padding: "8px 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            cursor: canReserve ? "pointer" : "not-allowed",
            transition: "all 0.15s",
          }}
        >
          {loading
            ? "Tikrinama…"
            : warnings.length > 0 && canReserve
            ? "Rezervuoti (su perspėjimais)"
            : "Rezervuoti"}
        </button>
      </div>
    </Modal>
  );
}

// ── StockRow ────────────────────────────────────────────────────────────────

function StockRow({ item, variant }: { item: EnrichedItem; variant: "error" | "warning" }) {
  const isError  = variant === "error";
  const colors   = isError
    ? { bg: "#fff1f2", border: "#fecdd3", bar: "#ef4444", text: "#dc2626" }
    : { bg: "#fffbeb", border: "#fde68a", bar: "#f59e0b", text: "#d97706" };

  const pct = item.quantityMax > 0
    ? Math.min(100, Math.round((item.quantityCurrent / item.quantityMax) * 100))
    : 0;

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: "10px 14px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-1)" }}>
            {item.productName}
          </span>
          {item.productSku && (
            <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 6, fontFamily: "monospace" }}>
              {item.productSku}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", flexShrink: 0 }}>
          Reikia:{" "}
          <strong style={{ color: colors.text }}>{item.requiredQty}</strong>
        </div>
      </div>

      {/* Stock bar */}
      <div style={{
        marginTop: 8, background: "#e5e7eb",
        borderRadius: 99, height: 5, overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: colors.bar, borderRadius: 99,
        }} />
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 5, fontSize: 11, color: "var(--text-3)",
      }}>
        <span>
          Sandėlyje:{" "}
          <strong style={{ color: colors.text }}>{item.quantityCurrent}</strong>
          {isError && (
            <span style={{ color: "#dc2626", marginLeft: 4 }}>
              (trūksta {item.requiredQty - item.quantityCurrent})
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sectionHeader(color: string) {
  return {
    fontSize: 11, fontWeight: 700, color,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  };
}

function alertStyle(type: "error" | "warning") {
  return {
    background: type === "error" ? "#fee2e2" : "#fffbeb",
    color:      type === "error" ? "#dc2626" : "#d97706",
    borderRadius: 8, padding: "12px 14px",
    fontSize: 13, fontWeight: 500,
  };
}
