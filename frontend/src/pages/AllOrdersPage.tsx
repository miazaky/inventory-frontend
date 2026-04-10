import { useEffect, useState, Fragment, useRef, type CSSProperties } from "react";
import { ordersApi } from "../api/orders";
import { productsApi } from "../api/products";
import { warehouseInventoryApi } from "../api/warehouseInventory";
import type { Order, Product, WarehouseInventory } from "../types";
import { OrderType, SystemCategory } from "../types";
import { Badge } from "../components/Badge";
import { LowStockModal } from "../components/LowStockModal";

type StatusFilter = "all" | "working" | "reserved" | "paused" | "completed" | "cancelled";
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([ordersApi.getAll(), productsApi.getAll(), warehouseInventoryApi.getAll()])
      .then(([o, p, inv]) => {
        setOrders(o || []);
        setProducts(p || []);
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
  };

  const getOrderSystemCategoryLabel = (order: Order) => {
    const categories = Array.from(new Set(
      (order.items ?? [])
        .map((item) => productMap[item.productId]?.systemCategory)
        .filter((category): category is SystemCategory => category != null),
    ));

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

  const handleReserveClick = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    setReserveError(null);
    try {
      const lowStock = await warehouseInventoryApi.getLowStock();
      const orderProductIds = new Set((order.items ?? []).map((i) => i.productId));
      const problematic = lowStock.filter((inv) => {
        if (!orderProductIds.has(inv.productId)) return false;
        const required = order.items?.find((i) => i.productId === inv.productId)?.quantity ?? 0;
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

  const handleSendProposal = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu(null);
    // TODO: implement send proposal
    alert(`Siųsti pasiūlymą: ${order.user?.email ?? order.id.slice(0, 8)}`);
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

  const statusVariant = (status: string | null): "green" | "yellow" | "blue" | "gray" | "red" => {
    if (!status) return "gray";
    const s = status.toLowerCase();
    if (s.includes("complete")) return "green";
    if (s.includes("reserved")) return "blue";
    if (s.includes("pend"))     return "yellow";
    if (s.includes("pause"))    return "gray";
    if (s.includes("cancel") ) return "red";
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

  const filtered = orders.filter((o) => {
    const s  = o.status?.toLowerCase() ?? "";
    const rs = reserveStates[o.id] ?? "idle";
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "working"   && rs === "working") ||
      (statusFilter === "reserved"  && (rs === "reserved" || s.includes("reserved"))) ||
      (statusFilter === "paused"    && s.includes("pause")) ||
      (statusFilter === "completed" && (s.includes("complete") || rs === "completed")) ||
      (statusFilter === "cancelled" && (s.includes("cancel")));
    const matchProposal =
      proposalFilter === "all" ||
      (proposalFilter === "special"   && o.orderType === OrderType.SpecialOffer) ||
      (proposalFilter === "noSpecial" && (o.orderType === OrderType.NoSpecialOffer || o.orderType == null));
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.user?.name?.toLowerCase().includes(q) ||
      o.user?.email?.toLowerCase().includes(q) ||
      o.user?.companyCode?.toLowerCase().includes(q) ||
      o.user?.phone?.toLowerCase().includes(q);
    return matchStatus && matchProposal && matchSearch;
  });

  const pendingCount   = orders.filter((o) => o.status?.toLowerCase().includes("pend")).length;
  const cancelledCount = orders.filter((o) => {
    const s = o.status?.toLowerCase() ?? "";
    return s.includes("cancel") ;
  }).length;
  const completedCount = orders.filter((o) => o.status?.toLowerCase().includes("complete")).length;
  const specialCount   = orders.filter((o) => o.orderType === OrderType.SpecialOffer).length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Užsakymų sąrašas</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <SummaryCard label="Visi užsakymai" value={orders.length}  color="var(--brand)" />
        <SummaryCard label="Laukiami"       value={pendingCount}   color="#d97706" />
        <SummaryCard label="Užbaigti"       value={completedCount} color="var(--success)" />
        <SummaryCard label="Atšaukti"       value={cancelledCount} color="#ef4444" />
        <SummaryCard label="Nori pasiūlymo" value={specialCount}   color="#6366f1" />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Ieškoti pagal vardą, el. paštą, įm. kodą…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {([
            { key: "all",       label: "Visi" },
            { key: "reserved",  label: "Rezervuoti" },
            { key: "paused",    label: "Sustabdyti" },
            { key: "completed", label: "Užbaigti" },
            { key: "cancelled", label: "Atšaukti" },
          ] as { key: StatusFilter; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setStatusFilter(key)}
              className={`btn btn-sm ${statusFilter === key ? "btn-primary" : "btn-secondary"}`}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, borderLeft: "1px solid var(--border)", paddingLeft: 10 }}>
          {(["all", "special", "noSpecial"] as ProposalFilter[]).map((f) => (
            <button key={f} onClick={() => setProposalFilter(f)}
              className={`btn btn-sm ${proposalFilter === f ? "btn-primary" : "btn-secondary"}`}>
              {f === "all" ? "Visi pasiūlymai" : f === "special" ? "Nori pasiūlymo" : "Nenori pasiūlymo"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: "auto" }}>
          {filtered.length} iš {orders.length}
        </span>
      </div>

      {error        && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {error}</div>}
      {reserveError && <div className="alert alert-error" style={{ marginBottom: 14 }}>⚠ {reserveError}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-3)", fontSize: 14 }}>Kraunama…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: "center", padding: "48px 0", color: "var(--text-3)", fontSize: 14 }}>
            {search || statusFilter !== "all" || proposalFilter !== "all"
              ? "Pagal paieškos kriterijus užsakymų nerasta"
              : "Užsakymų dar nėra"}
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden", padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 165 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 50 }} />
              <col style={{ width: 60 }} />
            </colgroup>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "2px solid var(--border)" }}>
                <th style={th()}></th>
                <th style={th()}>Data</th>
                <th style={th()}>Klientas</th>
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
                const itemCount    = order.items?.length ?? 0;
                const isCompleted  = order.status?.toLowerCase().includes("complete");
                const isDbReserved = order.status?.toLowerCase().includes("reserved");
                const isPaused     = order.status?.toLowerCase().includes("pause");
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

                const total = order.items?.reduce((sum, item) => {
                  const price = productMap[item.productId]?.price ?? 0;
                  return sum + price * item.quantity;
                }, 0) ?? 0;

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
                        <span style={{ color: "var(--text-2)", fontSize: 12 }}>
                          {order.createdDate
                            ? new Date(order.createdDate).toLocaleDateString("lt-LT", { year: "numeric", month: "2-digit", day: "2-digit" })
                            : "—"}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={td()}>
                        <div style={{ fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {order.user?.name || <span style={{ color: "var(--text-3)" }}>—</span>}
                        </div>
                        {order.user?.companyCode && (
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{order.user.companyCode}</div>
                        )}
                      </td>

                      {/* Email / Phone */}
                      <td style={td()}>
                        <div style={{ color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.user?.email || "—"}</div>
                        {order.user?.phone && (
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{order.user.phone}</div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td style={td()}>
                        <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                      </td>

                      {/* Proposal type */}
                      <td style={td()}>
                        <Badge variant={proposalVariant(order.orderType)}>{proposalLabel(order.orderType)}</Badge>
                      </td>

                      {/* System type */}
                      <td style={td()}>
                        <Badge variant="gray">{getOrderSystemCategoryLabel(order)}</Badge>
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
                              {((isPending || (!isReserved && !isPaused && !isCompleted ))) && !isCancelled && (
                                <MenuItem
                                  icon="pi pi-check-circle"
                                  label={isWorking ? "Rezervuojama…" : "Rezervuoti"}
                                  color="#6366f1"
                                  disabled={isWorking}
                                  onClick={(e) => handleReserveClick(order, e)}
                                />
                              )}

                              {/* Complete — only for RESERVED */}
                              {(isReserved && !isPaused) && (
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
                                  label="Siųsti pasiūlymą"
                                  color="#0ea5e9"
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
                        <td colSpan={9} style={{ padding: 0, background: "#f5f7ff", textAlign: "left" }}>
                          <div style={{ paddingLeft: 40 }}>
                            {!itemCount ? (
                              <div style={{ padding: "12px 16px", color: "var(--text-3)", fontStyle: "italic", fontSize: 13 }}>Nėra prekių</div>
                            ) : (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
                                <colgroup>
                                  <col style={{ width: 300 }} /><col style={{ width: 200 }} />
                                  <col style={{ width: 110 }} /><col style={{ width: 60 }} /><col style={{ width: 90 }} />
                                </colgroup>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                    <th style={th()}>Produktas</th><th style={th()}>Kodas</th>
                                    <th style={th("center")}>BENDRAS KIEKIS</th><th style={th("center")}>Kiekis</th><th style={th("right")}>Vnt. kaina</th><th style={th("right")}>Suma</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items!.map((item, idx) => {
                                    const prod = productMap[item.productId];
                                    const lineTotal = (prod?.price ?? 0) * item.quantity;
                                    return (
                                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={td()}><span style={{ fontWeight: 500 }}>{prod?.name || <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-3)" }}>{item.productId.slice(0, 8)}…</span>}</span></td>
                                        <td style={td()}><span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-2)" }}>{prod?.sku || "—"}</span></td>
                                        <td style={{ ...td(), textAlign: "center" }}><span style={{ fontWeight: 700 }}>{totalQuantityByProductId[item.productId]}</span></td>
                                        <td style={{ ...td(), textAlign: "center" }}><span style={{ fontWeight: 700 }}>×{item.quantity}</span></td>
                                        <td style={{ ...td(), textAlign: "right", color: "var(--text-2)" }}>{prod?.price != null ? `${prod.price.toFixed(2)} €` : "—"}</td>
                                        <td style={{ ...td(), textAlign: "right", fontWeight: 700 }}>{lineTotal > 0 ? `${lineTotal.toFixed(2)} €` : "—"}</td>
                                      </tr>
                                    );
                                  })}
                                  {total > 0 && (
                                    <tr style={{ borderTop: "2px solid var(--border)" }}>
                                      <td colSpan={4} style={{ ...td(), textAlign: "right", fontWeight: 600, color: "var(--text-2)" }}>Iš viso:</td>
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

      {modalOrder && (
        <LowStockModal
          order={modalOrder}
          productMap={productMap}
          onConfirm={handleModalConfirm}
          onCancel={() => setModalOrder(null)}
        />
      )}

      <style>{`
        .order-row:hover { background: var(--surface-2) !important; }
        .menu-item:hover { background: var(--surface-2); }
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
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function th(align: "left" | "center" | "right" = "left"): CSSProperties {
  return { padding: "9px 10px", textAlign: align, fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" };
}

function td(): CSSProperties {
  return { padding: "11px 12px", verticalAlign: "middle" };
}
