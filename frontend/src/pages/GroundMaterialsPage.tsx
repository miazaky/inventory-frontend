import React, { useEffect, useState } from "react";
import { productsApi } from "../api/products";
import { ordersApi } from "../api/orders";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import { warehousesApi } from "../api/warehouses";
import { GROUND_PRICE_PRODUCT_SKU_PREFIX, isGroundPriceProduct } from "../api/products";
import type { Order, Product, WarehouseInventory, Warehouse, CreateProductCommand, UpdateProductCommand } from "../types";
import { SystemCategory } from "../types";
import { Badge } from "../components/Badge";
import { GROUND_MATERIAL_SORT_ORDER, FLAT_ROOF_MATERIAL_SORT_ORDER, SLOPED_ROOF_MATERIAL_SORT_ORDER } from "../types";

export function GroundMaterialsPage() {
  return <CategoryMaterialsPage category={SystemCategory.Ground} />;
}
export function FlatRoofMaterialsPage() {
  return <CategoryMaterialsPage category={SystemCategory.FlatRoof} />;
}
export function SlopedRoofMaterialsPage() {
  return <CategoryMaterialsPage category={SystemCategory.SlopedRoof} />;
}

const PAGE_META: Record<number, { title: string; subtitle: string; icon: string; color: string }> = {
  [SystemCategory.Ground]:     { title: "Žemės sistemos medžiagos",           subtitle: "Ežio ir polinės sistemos komponentai",          icon: "🌱", color: "#16a34a" },
  [SystemCategory.FlatRoof]:   { title: "Plokščio stogo sistemos medžiagos",  subtitle: "PT05 / PT10 / PT15 / PT20 / RV10 komponentai", icon: "🏢", color: "#2563eb" },
  [SystemCategory.SlopedRoof]: { title: "Šlaitinio stogo sistemos medžiagos", subtitle: "Bėgeliai, kabliai ir tvirtinimo elementai",     icon: "🏠", color: "#9333ea" },
};

type GroundPriceKey = "POL113" | "EZ113" | "POL130" | "EZ130";

type GroundPriceFamily = "POL" | "EZ";

type GroundWidth = "1134" | "1303";

type GroundPriceRow = {
  key: GroundPriceKey;
  title: string;
  width: GroundWidth;
  defaultValue: string;
};

const GROUND_PRICE_ROWS: GroundPriceRow[] = [
  {
    key: "POL113",
    title: "Polinės montavimo sistemos",
    width: "1134",
    defaultValue: "44",
  },
  {
    key: "EZ113",
    title: "„Ežio“ tipo montavimo sistemos su strypais",
    width: "1134",
    defaultValue: "49",
  },
  {
    key: "POL130",
    title: "Polinės montavimo sistemos",
    width: "1303",
    defaultValue: "50",
  },
  {
    key: "EZ130",
    title: "„Ežio“ tipo montavimo sistemos su strypais",
    width: "1303",
    defaultValue: "56",
  },
];

const GROUND_PRICE_FAMILIES: Record<GroundPriceFamily, { label: string; defaultWidth: GroundWidth }> = {
  POL: { label: "Polinės montavimo sistemos", defaultWidth: "1134" },
  EZ: { label: "„Ežio“ tipo montavimo sistemos su strypais", defaultWidth: "1134" },
};

const GROUND_WIDTH_OPTIONS: { label: string; value: GroundWidth }[] = [
  { label: "1134 mm", value: "1134" },
  { label: "1303 mm", value: "1303" },
];
function getGroundPriceKey(family: GroundPriceFamily, width: GroundWidth): GroundPriceKey {
  return `${family}${width === "1134" ? "113" : "130"}` as GroundPriceKey;
}

function getGroundPriceSku(family: GroundPriceFamily, width: GroundWidth) {
  return `${GROUND_PRICE_PRODUCT_SKU_PREFIX}${family}_${width}`;
}

function getGroundPriceSkuAliases(family: GroundPriceFamily, width: GroundWidth) {
  const legacyFamily = family === "POL" ? "pile" : "hedgehog";
  const previousFamily = family === "POL" ? "poline" : "ezio";
  return [
    `${GROUND_PRICE_PRODUCT_SKU_PREFIX}${family}_${width}`,
    `${GROUND_PRICE_PRODUCT_SKU_PREFIX}${previousFamily}_${width}`,
    `${GROUND_PRICE_PRODUCT_SKU_PREFIX}${legacyFamily}_${width}`,
    `${GROUND_PRICE_PRODUCT_SKU_PREFIX}${legacyFamily}_${width.replace(".", "_")}`,
  ];
}

function getGroundPriceDefaults() {
  return Object.fromEntries(
    GROUND_PRICE_ROWS.map((row) => [row.key, row.defaultValue])
  ) as Record<GroundPriceKey, string>;
}


function normalizeSortText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeSortKey(value: string | null | undefined) {
  return normalizeSortText(value).replace(/\s+/g, "");
}

function findSortOrderIndex(sortOrder: string[], key: string) {
  return sortOrder.findIndex((pattern) => normalizeSortKey(pattern) === key);
}

function getMaterialSortIndex(product: Product, sortOrder: string[]) {
  const skuKey = normalizeSortKey(product.sku);
  if (skuKey) {
    const skuMatchedIndex = findSortOrderIndex(sortOrder, skuKey);
    if (skuMatchedIndex !== -1) return skuMatchedIndex;
  }

  const text = normalizeSortText([product.sku, product.name, product.length?.toString()].filter(Boolean).join(" "));
  const textWords = new Set(text.split(" ").filter(Boolean));
  const matchedIndex = sortOrder.findIndex((pattern) => {
    const patternWords = normalizeSortText(pattern).split(" ").filter(Boolean);
    if (!patternWords.length) return false;
    return patternWords.every((word) => textWords.has(word));
  });
  return matchedIndex === -1 ? Number.MAX_SAFE_INTEGER : matchedIndex;
}

// ── Inline editable row ──────────────────────────────────────────────────────
interface ProductRowProps {
  product: Product;
  invs: WarehouseInventory[];
  reservedQty: number;
  onSaved: () => void;
}

function ProductRow({ product, invs, reservedQty, onSaved }: ProductRowProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    sku:    product.sku           ?? "",
    name:   product.name          ?? "",
    length: product.length?.toString() ?? "",
    price:  product.price?.toString()  ?? "",
    // qty per inventory record: id → quantity string
    qtys:   Object.fromEntries(invs.map((i) => [i.id, String(i.quantityCurrent)])),
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const set = (field: "sku" | "name" | "length" | "price") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const setQty = (invId: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, qtys: { ...f.qtys, [invId]: e.target.value } }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save product fields
      const cmd: UpdateProductCommand = {
        id:             product.id,
        sku:            form.sku    || undefined,
        name:           form.name,
        length:         form.length ? Number(form.length) : undefined,
        price:          form.price  ? Number(form.price)  : undefined,
        systemCategory: product.systemCategory,
      };
      await productsApi.update(product.id, cmd);

      // Save each inventory quantity that changed
      await Promise.all(
        invs.map((inv) => {
          const newQty = Number(form.qtys[inv.id] ?? inv.quantityCurrent);
          if (newQty !== inv.quantityCurrent) {
            return warehouseInventoryApi.updateQuantity(inv.id, newQty);
          }
          return Promise.resolve();
        })
      );

      setEditing(false);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Klaida");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      sku:    product.sku           ?? "",
      name:   product.name          ?? "",
      length: product.length?.toString() ?? "",
      price:  product.price?.toString()  ?? "",
      qtys:   Object.fromEntries(invs.map((i) => [i.id, String(i.quantityCurrent)])),
    });
    setError(null);
    setEditing(false);
  };

  const totalQty = invs.reduce((s, i) => s + i.quantityCurrent, 0);
  const status   = stockStatus(invs);

  if (editing) {
    return (
      <>
        <tr className="row-editing">
          <td><input className="input input-inline" value={form.sku}    onChange={set("sku")}    placeholder="Kodas" /></td>
          <td><input className="input input-inline" value={form.name}   onChange={set("name")}   placeholder="Pavadinimas" /></td>
          <td><input className="input input-inline" type="number" value={form.length} onChange={set("length")} placeholder="mm" style={{ width: 80 }} /></td>
          <td style={{ textAlign: "center" }}>
            {invs.length === 0 ? (
              <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {invs.map((inv) => (
                  <input
                    key={inv.id}
                    className="input input-inline"
                    type="number"
                    min={0}
                    value={form.qtys[inv.id] ?? inv.quantityCurrent}
                    onChange={setQty(inv.id)}
                    style={{ width: 70, textAlign: "center" }}
                  />
                ))}
              </div>
            )}
          </td>
          <td style={{ textAlign: "center" }}>
            <Badge variant={status === "green" ? "green" : status === "yellow" ? "yellow" : status === "red" ? "red" : "gray"}>
              {stockLabel(invs)}
            </Badge>
          </td>
          <td style={{ textAlign: "center" }}>
            <span style={{ fontWeight: 700, color: reservedQty > 0 ? "#0ea5e9" : "var(--text-3)" }}>
              {reservedQty}
            </span>
          </td>
          <td><input className="input input-inline" type="number" step="0.01" value={form.price} onChange={set("price")} placeholder="0.00" style={{ width: 90 }} /></td>
          <td>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <button onClick={handleSave} disabled={saving || !form.name} className="btn btn-primary btn-sm">
                {saving ? "…" : "✓ Išsaugoti"}
              </button>
              <button onClick={handleCancel} className="btn btn-secondary btn-sm">Atšaukti</button>
            </div>
          </td>
        </tr>
        {error && (
          <tr>
            <td colSpan={8}>
              <div className="alert alert-error" style={{ margin: "4px 0", padding: "6px 10px", fontSize: 12 }}>⚠ {error}</div>
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={td()}>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-2)", background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4 }}>
          {product.sku || "—"}
        </span>
      </td>
      <td style={td()}>
        <span style={{ fontWeight: 500 }}>{product.name || "—"}</span>
      </td>
      <td style={{ ...td(), textAlign: "center", color: "var(--text-2)" }}>
        {product.length ?? "—"}
      </td>
      <td style={{ ...td(), textAlign: "center" }}>
        <span style={{
          fontWeight: 700, fontSize: 15,
          color: status === "red" ? "var(--danger)" : status === "yellow" ? "#d97706" : "var(--text-1)",
        }}>
          {totalQty}
        </span>
      </td>
      <td style={{ ...td(), textAlign: "center" }}>
        <Badge variant={status === "green" ? "green" : status === "yellow" ? "yellow" : status === "red" ? "red" : "gray"}>
          {stockLabel(invs)}
        </Badge>
      </td>
      <td style={{ ...td(), textAlign: "center" }}>
        <span style={{ fontWeight: 700, color: reservedQty > 0 ? "#0ea5e9" : "var(--text-3)" }}>
          {reservedQty}
        </span>
      </td>
      <td style={{ ...td(), textAlign: "right", color: "var(--text-2)" }}>
        {product.price != null ? `${product.price.toFixed(2)} €` : "—"}
      </td>
      <td style={{ ...td(), textAlign: "center" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button onClick={() => setEditing(true)} className="btn btn-ghost btn-icon" title="Redaguoti">✏️</button>
        </div>
      </td>
    </tr>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
function CategoryMaterialsPage({ category }: { category: SystemCategory }) {
  const [products,     setProducts]     = useState<Product[]>([]);
  const [inventory,    setInventory]    = useState<WarehouseInventory[]>([]);
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [warehouses,   setWarehouses]   = useState<Warehouse[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [groundPrices, setGroundPrices] = useState<Record<GroundPriceKey, string>>(getGroundPriceDefaults());
  const [groundWidths, setGroundWidths] = useState<Record<GroundPriceFamily, GroundWidth>>({
    POL: GROUND_PRICE_FAMILIES.POL.defaultWidth,
    EZ: GROUND_PRICE_FAMILIES.EZ.defaultWidth,
  });
  const [groundPriceIds, setGroundPriceIds] = useState<Record<GroundPriceKey, string | null>>({
    POL113: null,
    EZ113: null,
    POL130: null,
    EZ130: null,
  });

  const meta = PAGE_META[category];

  const updateGroundPrice = (key: GroundPriceKey) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setGroundPrices((currentPrices) => ({ ...currentPrices, [key]: event.target.value }));
  };

  const updateGroundWidth = (family: GroundPriceFamily) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    setGroundWidths((currentWidths) => ({ ...currentWidths, [family]: event.target.value as GroundWidth }));
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, inv, wh, ord] = await Promise.all([
        productsApi.getAll(),
        warehouseInventoryApi.getAll(),
        warehousesApi.getAll(),
        ordersApi.getAll(),
      ]);
      const allProds = p || [];
      const hiddenProds = allProds.filter(isGroundPriceProduct);
      const visibleProds = allProds.filter((prod) => !isGroundPriceProduct(prod));

      const defaults = getGroundPriceDefaults();
      const nextPrices: Record<GroundPriceKey, string> = { ...defaults };
      const nextIds: Record<GroundPriceKey, string | null> = {
        POL113: null,
        EZ113: null,
        POL130: null,
        EZ130: null,
      };

      hiddenProds.forEach((prod) => {
        const sku = prod.sku || "";
        const matchedRow = GROUND_PRICE_ROWS.find((row) => {
          const family: GroundPriceFamily = row.key.startsWith("POL") ? "POL" : "EZ";
          return getGroundPriceSkuAliases(family, row.width).includes(sku);
        });
        if (!matchedRow) return;
        nextIds[matchedRow.key] = prod.id;
        nextPrices[matchedRow.key] = prod.price != null ? String(prod.price) : matchedRow.defaultValue;
      });

      const missingRows = GROUND_PRICE_ROWS.filter((row) => !nextIds[row.key]);
      if (missingRows.length) {
        const created = await Promise.all(
          missingRows.map(async (row) => {
            const family: GroundPriceFamily = row.key.startsWith("POL") ? "POL" : "EZ";
            const cmd: CreateProductCommand = {
              sku: getGroundPriceSku(family, row.width),
              name: `${row.title} ${row.width} mm`,
              description: `ground-price:${family}:${row.width}`,
              price: Number(row.defaultValue),
              systemCategory: SystemCategory.Ground,
            };
            const id = await productsApi.create(cmd);
            return { key: row.key, id };
          })
        );
        created.forEach(({ key, id }) => {
          nextIds[key] = id;
        });
      }

      setGroundPrices(nextPrices);
      setGroundPriceIds(nextIds);
      setProducts(visibleProds);
      setInventory(inv || []);
      setWarehouses(wh || []);
      setOrders(ord || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Nepavyko įkelti");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category]);

  const persistGroundPrice = async (key: GroundPriceKey) => {
    if (category !== SystemCategory.Ground) return;
    const priceValue = groundPrices[key];
    const row = GROUND_PRICE_ROWS.find((item) => item.key === key);
    if (!row) return;
    const family: GroundPriceFamily = key.startsWith("POL") ? "POL" : "EZ";
    const sku = getGroundPriceSku(family, row.width);
    const payload: CreateProductCommand = {
      sku,
      name: `${row.title}`,
      description: `Žemės-sistema:${family}:${row.width}`,
      price: Number(priceValue),
      systemCategory: SystemCategory.Ground,
    };

    const existingId = groundPriceIds[key];
    if (existingId) {
      await productsApi.update(existingId, { id: existingId, ...payload });
      return;
    }

    const id = await productsApi.create(payload);
    setGroundPriceIds((current) => ({ ...current, [key]: id }));
  };

  // warehouses used only for page-level stats — not shown per row anymore
  const _warehouseMap = Object.fromEntries(warehouses.map((w) => [w.id, w]));
  void _warehouseMap;

  const invByProduct: Record<string, WarehouseInventory[]> = {};
  inventory.forEach((inv) => {
    if (!invByProduct[inv.productId]) invByProduct[inv.productId] = [];
    invByProduct[inv.productId].push(inv);
  });

  const reservedByProduct: Record<string, number> = {};
  orders
    .filter((order) => order.status?.toLowerCase().includes("reserved"))
    .forEach((order) => {
      (order.items ?? []).forEach((item) => {
        reservedByProduct[item.productId] = (reservedByProduct[item.productId] ?? 0) + item.quantity;
      });
    });

  const filtered = products
    .filter((p) => {
      const q = search.toLowerCase();
      return !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (category === SystemCategory.Ground) {
        const orderA = getMaterialSortIndex(a, GROUND_MATERIAL_SORT_ORDER);
        const orderB = getMaterialSortIndex(b, GROUND_MATERIAL_SORT_ORDER);
        if (orderA !== orderB) return orderA - orderB;
      } else if (category === SystemCategory.FlatRoof) {
        const orderA = getMaterialSortIndex(a, FLAT_ROOF_MATERIAL_SORT_ORDER);
        const orderB = getMaterialSortIndex(b, FLAT_ROOF_MATERIAL_SORT_ORDER);
        if (orderA !== orderB) return orderA - orderB;
      } else if (category === SystemCategory.SlopedRoof) {
        const orderA = getMaterialSortIndex(a, SLOPED_ROOF_MATERIAL_SORT_ORDER);
        const orderB = getMaterialSortIndex(b, SLOPED_ROOF_MATERIAL_SORT_ORDER);
        if (orderA !== orderB) return orderA - orderB;
      }

      return (
        (a.sku ?? "").localeCompare(b.sku ?? "") ||
        (a.name ?? "").localeCompare(b.name ?? "") ||
        (a.length ?? 0) - (b.length ?? 0)
      );
    });

  const lowCount   = products.filter((p) => stockStatus(invByProduct[p.id] ?? []) === "yellow").length;
  const emptyCount = products.filter((p) => stockStatus(invByProduct[p.id] ?? []) === "red").length;
  const goodCount  = products.filter((p) => stockStatus(invByProduct[p.id] ?? []) === "green").length;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, color: "var(--text-3)" }}>
      Kraunama...
    </div>
  );

  return (
    <div className="page">
      {category === SystemCategory.Ground && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid #16a34a" }}>
          <div className="card-header">
            <div className="card-title">Žemės sistemų kainos klientui</div>
          </div>
          <div className="card-body" style={{ display: "grid", gap: 12 }}>
            <GroundPriceLine
              title={GROUND_PRICE_FAMILIES.POL.label}
              family="POL"
              width={groundWidths.POL}
              value={groundPrices[getGroundPriceKey("POL", groundWidths.POL)]}
              onWidthChange={updateGroundWidth("POL")}
              onChange={updateGroundPrice(getGroundPriceKey("POL", groundWidths.POL))}
              onBlur={() => { void persistGroundPrice(getGroundPriceKey("POL", groundWidths.POL)); }}
            />
            <GroundPriceLine
              title={GROUND_PRICE_FAMILIES.EZ.label}
              family="EZ"
              width={groundWidths.EZ}
              value={groundPrices[getGroundPriceKey("EZ", groundWidths.EZ)]}
              onWidthChange={updateGroundWidth("EZ")}
              onChange={updateGroundPrice(getGroundPriceKey("EZ", groundWidths.EZ))}
              onBlur={() => { void persistGroundPrice(getGroundPriceKey("EZ", groundWidths.EZ)); }}
            />
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">
            <span style={{ marginRight: 8 }}>{meta.icon}</span>{meta.title}
          </h1>
          <p className="page-subtitle">{meta.subtitle}</p>
        </div>
        <div className="page-header-actions">
          <input
            className="input"
            placeholder="Ieškoti pagal pavadinimą arba kodą…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard label="Iš viso medžiagų" value={products.length} color="var(--brand)" />
        <StatCard label="Geras kiekis"      value={goodCount}       color="#16a34a" />
        <StatCard label="Mažas kiekis"      value={lowCount}        color="#d97706" />
        <StatCard label="Nėra"              value={emptyCount}      color="var(--danger)" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kodas</th>
              <th>Pavadinimas</th>
              <th style={{ textAlign: "center" }}>Ilgis, mm</th>
              <th style={{ textAlign: "center" }}>Kiekis</th>
              <th style={{ textAlign: "center" }}>Statusas</th>
              <th style={{ textAlign: "center" }}>Rezervuota</th>
              <th style={{ textAlign: "right" }}>Kaina €</th>
              <th style={{ textAlign: "center" }}>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="td-empty">{search ? "Nerasta pagal paiešką" : "Medžiagų nėra"}</td></tr>
            ) : (
              filtered.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  invs={invByProduct[p.id] ?? []}
                  reservedQty={reservedByProduct[p.id] ?? 0}
                  onSaved={load}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroundPriceLine({
  title,
  family,
  width,
  value,
  onWidthChange,
  onChange,
  onBlur,
}: {
  title: string;
  family: GroundPriceFamily;
  width: GroundWidth;
  value: string;
  onWidthChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-2)", flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: "1 1 250px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
          {family === "POL" ? "Polinė sistema" : "„Ežio“ sistema"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        <select className="input" value={width} onChange={onWidthChange} style={{ width: 120 }}>
          {GROUND_WIDTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          step="0.01"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          style={{ width: 92, textAlign: "right" }}
        />
        <span style={{ fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap" }}>EUR/mod + PVM</span>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function stockStatus(invs: WarehouseInventory[]): "red" | "yellow" | "green" | "gray" {
  if (!invs || invs.length === 0) return "gray";
  const total    = invs.reduce((s, i) => s + i.quantityCurrent, 0);
  const minTotal = invs.reduce((s, i) => s + i.quantityMin, 0);
  if (total === 0)       return "red";
  if (total <= minTotal) return "yellow";
  return "green";
}

function stockLabel(invs: WarehouseInventory[]) {
  const s = stockStatus(invs);
  if (s === "red")    return "Nėra";
  if (s === "yellow") return "Mažas";
  if (s === "green")  return "Geras";
  return "—";
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: "16px 20px", marginTop: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function td(): React.CSSProperties {
  return { padding: "11px 12px", verticalAlign: "middle" };
}
