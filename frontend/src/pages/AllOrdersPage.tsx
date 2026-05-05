import { useEffect, useState, Fragment, useRef, type CSSProperties } from "react";
import { ordersApi } from "../api/orders";
import { productsApi, isGroundPriceProduct } from "../api/products";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import type { Order, Product, WarehouseInventory, OrderItem } from "../types";
import { OrderType, SystemCategory } from "../types";
import { Badge } from "../components/Badge";
import { LowStockModal } from "../components/LowStockModal";
import { GROUND_MATERIAL_SORT_ORDER, FLAT_ROOF_MATERIAL_SORT_ORDER, SLOPED_ROOF_MATERIAL_SORT_ORDER } from "../types";

type StatusFilter = "all" | "working" | "reserved" | "paused" | "completed" | "cancelled" | "collected";
type ProposalFilter = "all" | "special" | "noSpecial";
type ReserveState = "idle" | "working" | "reserved" | "completed";

export function AllOrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [inventories, setInventories] = useState<WarehouseInventory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [proposalFilter, setProposalFilter] = useState<ProposalFilter>("all");
  const [reserveStates, setReserveStates] = useState<Record<string, ReserveState>>({});
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu]   = useState<string | null>(null);
  const [proposalSending, setProposalSending] = useState<Record<string, boolean>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([ordersApi.getAll(), productsApi.getAll(), warehouseInventoryApi.getAll()])
      .then(([o, p, inv]) => {
        setOrders(o || []);
        setProducts((p || []).filter((product) => !isGroundPriceProduct(product)));
        setInventories(inv || []);
      })
      .catch(() => setError("Nepavyko įkelti užsakymų"))
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const totalQuantityByProductId = inventories.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.productId] = (acc[inv.productId] ?? 0) + inv.quantityCurrent;
    return acc;
  }, {});

  const systemCategoryLabel = (category: SystemCategory | null | undefined) => {
    if (category === SystemCategory.Ground) return "Zemes";
    if (category === SystemCategory.FlatRoof) return "Plokščio stogo";
    if (category === SystemCategory.SlopedRoof) return "Šlaitinio stogo";
    if (category === SystemCategory.Shared) return "Bendri";
    return "Nepriskirti";
  };

  const systemCategoryOrder = (category: SystemCategory | null | undefined) => {
    if (category === SystemCategory.Ground) return 0;
    if (category === SystemCategory.FlatRoof) return 1;
    if (category === SystemCategory.SlopedRoof) return 2;
    if (category === SystemCategory.Shared) return 3;
    return 4;
  };

  const normalizeSortText = (value: string | null | undefined) =>
    (value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const normalizeSortKey = (value: string | null | undefined) =>
    normalizeSortText(value).replace(/\s+/g, "");

  const getMaterialSortIndex = (product: Product | undefined, sortOrder: string[]) => {
    if (!product) return Number.MAX_SAFE_INTEGER;

    const skuKey = normalizeSortKey(product.sku);
    if (skuKey) {
      const skuMatchedIndex = sortOrder.findIndex((pattern) => normalizeSortKey(pattern) === skuKey);
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
  };

  const getSortIndex = (product: Product | undefined, category: SystemCategory | null | undefined) => {
    if (category === SystemCategory.Ground) return getMaterialSortIndex(product, GROUND_MATERIAL_SORT_ORDER);
    if (category === SystemCategory.FlatRoof) return getMaterialSortIndex(product, FLAT_ROOF_MATERIAL_SORT_ORDER);
    if (category === SystemCategory.SlopedRoof) return getMaterialSortIndex(product, SLOPED_ROOF_MATERIAL_SORT_ORDER);
    return Number.MAX_SAFE_INTEGER;
  };

  const resolveOrderSortCategory = (items: OrderItem[]): SystemCategory | null => {
    const counts: Record<number, number> = {};
    for (const item of items) {
      const category = productMap[item.productId]?.systemCategory;
      if (
        category === SystemCategory.Ground ||
        category === SystemCategory.FlatRoof ||
        category === SystemCategory.SlopedRoof
      ) {
        counts[category] = (counts[category] ?? 0) + 1;
      }
    }

    const orderedCategories = [SystemCategory.FlatRoof, SystemCategory.Ground, SystemCategory.SlopedRoof] as const;
    let best: SystemCategory | null = null;
    let bestCount = -1;
    for (const category of orderedCategories) {
      const count = counts[category] ?? 0;
      if (count > bestCount) {
        bestCount = count;
        best = category;
      }
    }
    return bestCount > 0 ? best : null;
  };

  const isVisibleSystemCategory = (category: SystemCategory | null | undefined): category is SystemCategory =>
    category === SystemCategory.Ground ||
    category === SystemCategory.FlatRoof ||
    category === SystemCategory.SlopedRoof;

  const getOrderSystemCategoryLabel = (order: Order) => {
    const systemNames = Array.from(new Set(
      (order.items ?? [])
        .map((item) => item.systemName?.trim())
        .filter((name): name is string => Boolean(name)),
    ));

    if (systemNames.length === 1) return systemNames[0];
    if (systemNames.length > 1) return systemNames.join(" / ");

    const categories = Array.from(new Set(
      (order.items ?? [])
        .map((item) => productMap[item.productId]?.systemCategory)
        .filter(isVisibleSystemCategory),
    ));

    if (categories.length === 0) return "—";
    if (categories.length === 1) return systemCategoryLabel(categories[0]);
    return categories.map((category) => systemCategoryLabel(category));
  };

  const setOrderReserveState = (orderId: string, state: ReserveState) =>
    setReserveStates((prev) => ({ ...prev, [orderId]: state }));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const normalizeOrderItemsByProduct = (items: OrderItem[]): OrderItem[] => {
    const maxQtyByProduct = new Map<string, number>();
    for (const item of items) {
      const current = maxQtyByProduct.get(item.productId) ?? 0;
      if (item.quantity > current) {
        maxQtyByProduct.set(item.productId, item.quantity);
      }
    }

    return Array.from(maxQtyByProduct.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
  };

  const getOrderLineItems = (order: Order): OrderItem[] => {
    const grouped = order.groupedItems ?? [];
    const groupedItems = grouped.flatMap((g) =>
      (g.items ?? []).map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );

    const sourceItems = groupedItems.length ? groupedItems : (order.items ?? []);
    return normalizeOrderItemsByProduct(sourceItems);
  };

  const sumQuantitiesByProductId = (items: OrderItem[]) =>
    items.reduce<Record<string, number>>((acc, item) => {
      acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
      return acc;
    }, {});

  const getDisplayLineItems = (order: Order): OrderItem[] => {
    return getOrderLineItems(order);
  };

  const handleReserveClick = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    setReserveError(null);
    try {
      const lowStock = await warehouseInventoryApi.getLowStock();
      const orderItems = getOrderLineItems(order);
      const requiredByProductId = sumQuantitiesByProductId(orderItems);
      const orderProductIds = new Set(Object.keys(requiredByProductId));
      const problematic = lowStock.filter((inv) => {
        if (!orderProductIds.has(inv.productId)) return false;
        const required = requiredByProductId[inv.productId] ?? 0;
        return inv.quantityCurrent < required;
      });
      if (problematic.length > 0) {
        setModalOrder(order);
      } else {
        await doReserve(order);
      }
    } catch {
      setModalOrder(order);
    }
  };

  const doReserve = async (order: Order) => {
    setOrderReserveState(order.id, "working");
    setReserveError(null);
    try {
      await ordersApi.reserve(order.id);
      setOrderReserveState(order.id, "reserved");
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "RESERVED" } : o));
    } catch {
      setReserveError("Nepavyko rezervuoti medžiagų. Bandykite dar kartą.");
      setOrderReserveState(order.id, "idle");
    }
  };

  const handlePause = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await ordersApi.pause(order.id);
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "PAUSED" } : o));
    } catch {
      setReserveError("Nepavyko sustabdyti užsakymo.");
    }
  };

  const handleResume = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await ordersApi.resume(order.id);
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "RESERVED" } : o));
    } catch {
      setReserveError("Nepavyko pratęsti užsakymo.");
    }
  };

  const handleDelete = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    const shouldDelete = window.confirm("Ar tikrai norite ištrinti šį užsakymą?");
    if (!shouldDelete) return;
    try {
      await ordersApi.delete(order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch {
      setReserveError("Nepavyko ištrinti užsakymo.");
    }
  };

  const handleCancel = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await ordersApi.updateStatus(order.id, "CANCELLED");
        setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "CANCELLED" } : o));
    } catch {
      setReserveError("Nepavyko atšaukti užsakymo.");
    }
  };

   const handleCollected = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await ordersApi.updateStatus(order.id, "COLLECTED");
        setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "COLLECTED" } : o));
    } catch {
      setReserveError("Nepavyko atšaukti užsakymo.");
    }
  };




  const handleModalConfirm = async () => {
    if (!modalOrder) return;
    const order = modalOrder;
    setModalOrder(null);
    await doReserve(order);
  };

  const handleComplete = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await ordersApi.complete(order.id);
      setOrderReserveState(order.id, "completed");
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "COMPLETED" } : o));
    } catch {
      setReserveError("Nepavyko užbaigti užsakymo.");
    }
  };

  const handleSendProposal = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);

    if (!order.pdfUrl) {
      alert("Šiam užsakymui PDF dar nėra. Pirmiausia sugeneruokite PDF.");
      return;
    }

    const items = order.items ?? [];

    const ggCode = (() => {
      for (const item of items) {
        const sku = productMap[item.productId]?.sku ?? "";
        if (/^GG-\d+$/i.test(sku)) return sku.toUpperCase();
      }
      return undefined;
    })();

    const systemType = (() => {
      const names = Array.from(new Set(
        items.map((i) => i.systemName?.trim()).filter((n): n is string => Boolean(n))
      ));
      const name = (names[0] ?? "").toLowerCase();
      if (name.includes("ežio") || name.includes("ezio") || name.includes("ezys")) return "ezys";
      if (name.includes("polin")) return "poline";
      return undefined;
    })();

    setProposalSending((prev) => ({ ...prev, [order.id]: true }));
    try {
      await ordersApi.sendClientProposalEmail(order.id, {
        moduleCount: order.moduleCount ?? undefined,
        moduleArea:   order.moduleArea   ?? undefined,
        moduleLength:    order.moduleLength    ?? undefined,
        ggCode,
        systemType,
      });
      alert(`✓ Pasiūlymas sėkmingai išsiųstas: ${order.user?.email}`);
    } catch {
      alert("Nepavyko išsiųsti pasiūlymo. Bandykite dar kartą.");
    } finally {
      setProposalSending((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleDownloadPdf = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    setPdfLoading((prev) => ({ ...prev, [order.id]: true }));
    try {
      const { url } = await ordersApi.getPdfUrl(order.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Nepavyko gauti PDF nuorodos. Bandykite dar kartą.");
    } finally {
      setPdfLoading((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const statusVariant = (status: string | null): string => {
    if (!status) return "gray";
    const s = status.toLowerCase();
    if (s.includes("complete")) return "green";
    if (s.includes("reserved")) return "blue";
    if (s.includes("pend"))     return "yellow";
    if (s.includes("pause"))    return "gray";
    if (s.includes("cancel") ) return "red";
    if(s.includes("collect")) return "teal";
    if(s.includes("delet")) return "red";
    return "blue";
  };

  const statusLabel = (status: string | null) => {
    if (!status) return "Nežinoma";
    const s = status.toLowerCase();
    if (s.includes("complete")) return "Užbaigtas";
    if (s.includes("reserved")) return "Rezervuotas";
    if (s.includes("pend"))     return "Laukiama";
    if (s.includes("pause"))    return "Sustabdytas";
    if (s.includes("cancel") ) return "Atšauktas";
    if(s.includes("collect")) return "Surinktas";
    if(s.includes("delet")) return "Ištrintas";
    return status;
  };

  const proposalLabel = (orderType: OrderType | null) => {
    if (orderType === OrderType.SpecialOffer)   return "Nori pasiūlymo";
    if (orderType === OrderType.NoSpecialOffer) return "Nenori pasiūlymo";
    return "—";
  };

  const proposalVariant = (orderType: OrderType | null): "blue" | "gray" =>
    orderType === OrderType.SpecialOffer ? "blue" : "gray";

  const ordersWithSystem = orders.filter((o) => getOrderSystemCategoryLabel(o) !== "—");

  const filtered = ordersWithSystem.filter((o) => {
    const s  = o.status?.toLowerCase() ?? "";
    const rs = reserveStates[o.id] ?? "idle";
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "working"   && rs === "working") ||
      (statusFilter === "reserved"  && (rs === "reserved" || s.includes("reserved"))) ||
      (statusFilter === "paused"    && s.includes("pause")) ||
      (statusFilter === "completed" && (s.includes("complete") || rs === "completed")) ||
      (statusFilter === "collected" && s.includes("collect")) ||
      (statusFilter === "cancelled" && (s.includes("cancel")));
    const matchProposal =
      proposalFilter === "all" ||
      (proposalFilter === "special"   && o.orderType === OrderType.SpecialOffer) ||
      (proposalFilter === "noSpecial" && (o.orderType === OrderType.NoSpecialOffer || o.orderType == null));
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.user?.name?.toLowerCase().includes(q) ||
      o.user?.email?.toLowerCase().includes(q) ||
      o.user?.companyCode?.toLowerCase().includes(q) ||
      o.user?.phone?.toLowerCase().includes(q);
    return matchStatus && matchProposal && matchSearch;
  });

  const pendingCount   = ordersWithSystem.filter((o) => o.status?.toLowerCase().includes("pend")).length;
  const cancelledCount = ordersWithSystem.filter((o) => {
    const s = o.status?.toLowerCase() ?? "";
    return s.includes("cancel") ;
  }).length;
  const completedCount = ordersWithSystem.filter((o) => o.status?.toLowerCase().includes("complete")).length;
  const specialCount   = ordersWithSystem.filter((o) => o.orderType === OrderType.SpecialOffer).length;
  const collectedCount = ordersWithSystem.filter((o) => o.status?.toLowerCase().includes("collected")).length;

  return (
    <div className="page all-orders-page">
      <div className="all-orders-content">
        <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Užsakymų sąrašas</h1>
        </div>
      </div>

      <div className="all-orders-summary-grid">
        <SummaryCard label="Visi užsakymai" value={ordersWithSystem.length}  color="var(--brand)" />
        <SummaryCard label="Laukiami"       value={pendingCount}   color="#d97706" />
        <SummaryCard label="Užbaigti"       value={completedCount} color="var(--success)" />
        <SummaryCard label="Nori pasiūlymo" value={specialCount}   color="#6366f1" />
        <SummaryCard label="Surinkti" value={collectedCount}   color="teal" />
        <SummaryCard label="Atšaukti"       value={cancelledCount} color="#ef4444" />
      </div>

      <div className="all-orders-toolbar">
        <div className="all-orders-toolbar-filters">
        <input
          className="input all-orders-search"
          placeholder="Ieškoti pagal vardą, el. paštą, įm. kodą…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="all-orders-filter-group">
          {([
            { key: "all",       label: "Visi" },
            { key: "reserved",  label: "Rezervuoti" },
            { key: "paused",    label: "Sustabdyti" },
            { key: "completed", label: "Užbaigti" },
            { key: "collected", label: "Surinkti" },
            { key: "cancelled", label: "Atšaukti" },
          ] as { key: StatusFilter; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`btn btn-sm ${statusFilter === key ? "btn-primary" : "btn-secondary"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="all-orders-filter-group all-orders-filter-group-proposals">
          {(["all", "special", "noSpecial"] as ProposalFilter[]).map((f) => (
            <button key={f} onClick={() => setProposalFilter(f)}
              className={`btn btn-sm ${proposalFilter === f ? "btn-primary" : "btn-secondary"}`}>
              {f === "all" ? "Visi pasiūlymai" : f === "special" ? "Nori pasiūlymo" : "Nenori pasiūlymo"}
            </button>
          ))}
        </div>
        </div>
        <span className="all-orders-count">
          {filtered.length} iš {ordersWithSystem.length}
        </span>
      </div>

      {error        && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {error}</div>}
      {reserveError && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {reserveError}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-2)", fontSize: 15, fontWeight: 500 }}>Kraunama…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center", padding: "48px 0", color: "var(--text-2)", fontSize: 15, fontWeight: 500 }}>
            {search || statusFilter !== "all" || proposalFilter !== "all"
              ? "Pagal paieškos kriterijus užsakymų nerasta"
              : "Užsakymų dar nėra"}
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: "visible", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 210 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 125 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 90}} />
            </colgroup>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--border)" }}>
                <th style={th()}></th>
                <th style={th()}>Data</th>
                <th style={th()}>Klientas</th>
                <th style={th("center")}>Užsakymo nr.</th>
                <th style={th()}>El. paštas / Tel.</th>
                <th style={th()}>Statusas</th>
                <th style={th()}>Pasiūlymas</th>
                <th style={th()}>Sistema</th>
                <th style={th("center")}>Prekės</th>
                <th style={th("center")}>Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const expanded     = expandedIds.has(order.id);
                const displayLineItems = getDisplayLineItems(order);
                const itemCount = displayLineItems.length;
                const isCompleted  = order.status?.toLowerCase().includes("complete");
                const isDbReserved = order.status?.toLowerCase().includes("reserved");
                const isPaused     = order.status?.toLowerCase().includes("pause");
                const isCollected   = order.status?.toLowerCase().includes("collected");
                const isPending    = order.status?.toLowerCase().includes("pend");
                const isCancelled  = (
                  order.status?.toLowerCase().includes("cancel") ||
                  order.status?.toLowerCase().includes("delet")
                );
                const reserveState = reserveStates[order.id] ?? "idle";
                const isWorking    = reserveState === "working";
                const isReserved   = reserveState === "reserved" || isDbReserved;
                const isSpecial    = order.orderType === OrderType.SpecialOffer;
                const menuOpen     = openMenu === order.id;

                const total = displayLineItems.reduce((sum, item) => {
                  const price = productMap[item.productId]?.price ?? 0;
                  return sum + price * item.quantity;
                }, 0);

                const orderSortCategory = resolveOrderSortCategory(displayLineItems);

                const sortedLineItems = displayLineItems
                  .map((item) => ({
                    constCategory: productMap[item.productId]?.systemCategory ?? null,
                    effectiveCategory:
                      productMap[item.productId]?.systemCategory === SystemCategory.Shared ||
                      productMap[item.productId]?.systemCategory == null
                        ? orderSortCategory
                        : productMap[item.productId]?.systemCategory,
                    item,
                    product: productMap[item.productId],
                  }))
                  .sort((a, b) => {
                    const excelDiff =
                      getSortIndex(a.product, a.effectiveCategory) - getSortIndex(b.product, b.effectiveCategory);
                    if (excelDiff !== 0) return excelDiff;

                    const categoryDiff = systemCategoryOrder(a.constCategory) - systemCategoryOrder(b.constCategory);
                    if (categoryDiff !== 0) return categoryDiff;

                    return (
                      (a.product?.sku ?? "").localeCompare(b.product?.sku ?? "") ||
                      (a.product?.name ?? "").localeCompare(b.product?.name ?? "") ||
                      a.item.productId.localeCompare(b.item.productId)
                    );
                  });

                return (
                  <Fragment key={order.id}>
                    <tr
                      onClick={() => toggleExpand(order.id)}
                      style={{
                        borderBottom: expanded ? "none" : "1px solid var(--border)",
                        cursor: "pointer",
                        background: expanded ? "#f0f4ff" : "var(--surface)",
                      }}
                      className="order-row"
                    >
                      {/* Expand toggle */}
                      <td style={{ ...td(), textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 20, height: 20, borderRadius: 4,
                          background: expanded ? "var(--brand)" : "var(--surface-2)",
                          color: expanded ? "#fff" : "var(--text-3)",
                          fontSize: 10, fontWeight: 700, transition: "all 0.15s",
                        }}>
                          {expanded ? "▾" : "▸"}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={td()}>
                        <span style={{ color: "var(--text-1)", fontSize: 13, fontWeight: 500 }}>
                          {order.createdDate
                            ? new Date(order.createdDate).toLocaleDateString("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" })
                            : "—"}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={td()}>
                        <div style={{ fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {order.user?.name || <span style={{ color: "var(--text-2)" }}>—</span>}
                        </div>
                        {order.user?.companyCode && (
                          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2, fontWeight: 500 }}>{order.user.companyCode}</div>
                        )}
                      </td>

                      {/* Order number */}
                      <td style={{ ...td(), textAlign: "center" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-1)", fontWeight: 600 }}>
                          {order.orderNumber || "—"}
                        </span>
                      </td>

                      {/* Email / Phone */}
                      <td style={td()}>
                        <div style={{ color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{order.user?.email || "—"}</div>
                        {order.user?.phone && (
                          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2, fontWeight: 500 }}>{order.user.phone}</div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td style={td()}>
                        <Badge className="order-badge-lg" variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                      </td>

                      {/* Proposal type */}
                      <td style={td()}>
                        <Badge className="order-badge-lg" variant={proposalVariant(order.orderType)}>{proposalLabel(order.orderType)}</Badge>
                      </td>

                      {/* System type */}
                      <td style={td()}>
                        <Badge className="order-badge-lg" variant="black">{getOrderSystemCategoryLabel(order)}</Badge>
                      </td>

                      {/* Item count */}
                      <td style={{ ...td(), textAlign: "center" }}>
                        <span style={{ display: "inline-block", minWidth: 24, padding: "2px 8px", background: "var(--surface-2)", borderRadius: 99, fontWeight: 700, fontSize: 12 }}>
                          {itemCount}
                        </span>
                      </td>

                      {/* ── Three-dot actions menu ── */}
                      <td style={{ ...td(), textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ position: "relative", display: "inline-block" }} ref={menuOpen ? menuRef : undefined}>
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1, padding: "2px 8px" }}
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(menuOpen ? null : order.id); }}
                            title="Veiksmai"
                          >
                            •••
                          </button>

                          {menuOpen && (
                            <div style={{
                              position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100,
                              background: "var(--surface)", border: "1px solid var(--border)",
                              borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                              minWidth: 190, padding: "4px 0",
                            }}>
                              {/* Reserve — only for PENDING */}
                              {((isPending || (!isReserved && !isPaused && !isCompleted && !isCollected))) && !isCancelled && (
                                <MenuItem
                                  icon="pi pi-check-circle"
                                  label={isWorking ? "Rezervuojama…" : "Rezervuoti"}
                                  color="#6366f1"
                                  disabled={isWorking}
                                  onClick={(e) => handleReserveClick(order, e)}
                                />
                              )}

                              {/* Collected — only for RESERVED */}
                              {(isReserved && !isPaused) && (
                                <MenuItem
                                  icon="pi pi-flag"
                                  label="Surinkti"
                                  color="teal"
                                  onClick={(e) => handleCollected(order, e)}
                                />
                              )}


                              {/* Complete — only for RESERVED */}
                              {(isReserved && !isPaused || isCollected) && (
                                <MenuItem
                                  icon="pi pi-flag"
                                  label="Užbaigti"
                                  color="#16a34a"
                                  onClick={(e) => handleComplete(order, e)}
                                />
                              )}

                              {/* Pause — only for RESERVED */}
                              {(isReserved && !isPaused) && (
                                <MenuItem
                                  icon="pi pi-pause"
                                  label="Sustabdyti"
                                  color="#64748b"
                                  onClick={(e) => handlePause(order, e)}
                                />
                              )}

                              {/* Cancel  */}
                              {(!isCompleted && !isCancelled) && (
                                <MenuItem
                                  icon="pi pi-pause"
                                  label="Atšaukti"
                                  color="#64748b"
                                  onClick={(e) => handleCancel(order, e)}
                                />
                              )}

                              {/* Delete  */}
                              {(!isCompleted &&
                                <MenuItem
                                  icon="pi pi-pause"
                                  label="Ištrinti"
                                  color="#64748b"
                                  onClick={(e) => handleDelete(order, e)}
                                />
                              )}

                              {/* Resume — only for PAUSED */}
                              {(isPaused || isCancelled) && (
                                <MenuItem
                                  icon="pi pi-play"
                                  label="Pratęsti"
                                  color="#0ea5e9"
                                  onClick={(e) => handleResume(order, e)}
                                />
                              )}

                              {/* Divider */}
                              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

                              {/* Send proposal — only for special offer */}
                              {isSpecial && (
                                <MenuItem
                                  icon="pi pi-send"
                                  label={proposalSending[order.id] ? "Siunčiama…" : "Siųsti pasiūlymą"}
                                  color="#0ea5e9"
                                  disabled={proposalSending[order.id]}
                                  onClick={(e) => handleSendProposal(order, e)}
                                />
                              )}

                              {/* PDF download */}
                              {order.pdfUrl ? (
                                <MenuItem
                                  icon="pi pi-file-pdf"
                                  label={pdfLoading[order.id] ? "Kraunama…" : "Atsisiųsti PDF"}
                                  color="#16a34a"
                                  disabled={pdfLoading[order.id]}
                                  onClick={(e) => handleDownloadPdf(order, e)}
                                />
                              ) : (
                                <MenuItem icon="pi pi-file-pdf" label="PDF nėra" color="var(--text-3)" disabled />
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded items sub-table */}
                    {expanded && (
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <td colSpan={10} style={{ padding: 0, background: "#f5f7ff", textAlign: "left" }}>
                          <div style={{ paddingLeft: 40 }}>
                            {!itemCount ? (
                              <div style={{ padding: "12px 16px", color: "var(--text-2)", fontStyle: "italic", fontSize: 14, fontWeight: 500 }}>Nėra prekių</div>
                            ) : (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
                                <colgroup>
                                  <col style={{ width: 300 }} />
                                  <col style={{ width: 200 }} />
                                  <col style={{ width: 110 }} />
                                  <col style={{ width: 60 }} />
                                  <col style={{ width: 90 }} />
                                  <col style={{ width: 90 }} />
                                </colgroup>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                    <th style={th()}>Produktas</th>
                                    <th style={th()}>Kodas</th>
                                    <th style={th("center")}>BENDRAS KIEKIS</th>
                                    <th style={th("center")}>Kiekis</th>
                                    <th style={th("right")}>Vnt. kaina</th>
                                    <th style={th("right")}>Suma</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedLineItems.map(({ item, product: prod }, idx) => {
                                    const lineTotal = (prod?.price ?? 0) * item.quantity;
                                    return (
                                      <tr key={`${item.productId}-${idx}`} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={td()}><span style={{ fontWeight: 600 }}>{prod?.name || <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-2)" }}>{item.productId.slice(0, 8)}…</span>}</span></td>
                                        <td style={td()}><span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-1)", fontWeight: 500 }}>{prod?.sku || "—"}</span></td>
                                        <td style={{ ...td(), textAlign: "center" }}><span style={{ fontWeight: 700, color: totalQuantityByProductId[item.productId] < item.quantity ? "var(--danger)" : "var(--text-1)" }}>{totalQuantityByProductId[item.productId]}</span></td>
                                        <td style={{ ...td(), textAlign: "center" }}><span style={{ fontWeight: 700 }}>×{item.quantity}</span></td>
                                        <td style={{ ...td(), textAlign: "right", color: "var(--text-1)", fontWeight: 500 }}>{prod?.price != null ? `${prod.price.toFixed(2)} €` : "—"}</td>
                                        <td style={{ ...td(), textAlign: "right", fontWeight: 700 }}>{lineTotal > 0 ? `${lineTotal.toFixed(2)} €` : "—"}</td>
                                      </tr>
                                    );
                                  })}
                                  {total > 0 && (
                                    <tr style={{ borderTop: "2px solid var(--border)" }}>
                                      <td colSpan={5} style={{ ...td(), textAlign: "right", fontWeight: 700, color: "var(--text-1)" }}>Iš viso:</td>
                                      <td style={{ ...td(), textAlign: "right", fontWeight: 800, fontSize: 14 }}>{total.toFixed(2)} €</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {modalOrder && (
        <LowStockModal
          order={modalOrder}
          productMap={productMap}
          onConfirm={handleModalConfirm}
          onCancel={() => setModalOrder(null)}
        />
      )}

      <style>{`
        .all-orders-page { max-width: none; }
        .all-orders-content {
          width: min(100%, 1320px);
          margin: 0 auto;
        }
        .all-orders-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }
        .all-orders-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .all-orders-toolbar-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1 1 0;
          min-width: 0;
          flex-wrap: wrap;
        }
        .all-orders-search {
          flex: 0 1 300px;
          max-width: 300px;
          min-width: 220px;
        }
        .all-orders-filter-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .all-orders-filter-group-proposals {
          border-left: 1px solid var(--border);
          padding-left: 10px;
        }
        .all-orders-count {
          font-size: 13px;
          color: var(--text-2);
          font-weight: 500;
          white-space: nowrap;
          margin-left: auto;
        }
        @media (max-width: 900px) {
          .all-orders-count {
            width: 100%;
            text-align: right;
          }
        }
        @media (max-width: 720px) {
          .all-orders-search {
            flex-basis: 100%;
            max-width: none;
          }
          .all-orders-filter-group-proposals {
            border-left: none;
            padding-left: 0;
          }
        }
        .order-row:hover { background: var(--surface-2) !important; }
        .menu-item:hover { background: var(--surface-2); }
        .order-badge-lg { font-size: 12px; }
      `}</style>
    </div>
  );
}

// ── Menu item component ──────────────────────────────────────────────────────
function MenuItem({
  icon, label, color, onClick, disabled = false,
}: {
  icon: string;
  label: string;
  color: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="menu-item"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 14px", border: "none",
        background: "transparent", cursor: disabled ? "default" : "pointer",
        fontSize: 13, color: disabled ? "var(--text-3)" : "var(--text-1)",
        textAlign: "left", opacity: disabled ? 0.5 : 1,
      }}
    >
      <i className={icon} style={{ fontSize: 13, color: disabled ? "var(--text-3)" : color, width: 16 }} />
      {label}
    </button>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: "16px 20px", marginTop: 16, minHeight: 80, boxSizing: "border-box" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function th(align: "left" | "center" | "right" = "left"): CSSProperties {
  return { padding: "10px 10px", textAlign: align, fontSize: 13, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap", lineHeight: 1.35 };
}

function td(): CSSProperties {
  return { padding: "12px 12px", verticalAlign: "middle", fontSize: 15, lineHeight: 1.45 };
}
