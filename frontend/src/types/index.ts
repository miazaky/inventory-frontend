// ── System Category ──────────────────────────────────────────────────────────
export enum SystemCategory {
  Shared = 0,
  Ground = 1,
  FlatRoof = 2,
  SlopedRoof = 3,
  RoofShared = 4,
}

export const SYSTEM_CATEGORY_LABELS: Record<SystemCategory, string> = {
  [SystemCategory.Shared]: "Bendros (visos sistemos)",
  [SystemCategory.Ground]: "Žemės sistemos",
  [SystemCategory.FlatRoof]: "Plokščio stogo sistemos",
  [SystemCategory.SlopedRoof]: "Šlaitinio stogo sistemos",
  [SystemCategory.RoofShared]: "Stogų sistemos (bendros)",
};

// ── Products ────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  sku: string | null;
  name: string | null;
  length: number | null;
  description: string | null;
  price: number | null;
  systemCategory: SystemCategory;
}

export interface CreateProductCommand {
  sku?: string;
  name?: string;
  length?: number;
  description?: string;
  price?: number;
  systemCategory?: SystemCategory;
}

export interface UpdateProductCommand {
  id: string;
  sku?: string;
  name?: string;
  length?: number;
  description?: string;
  price?: number;
  systemCategory?: SystemCategory;
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  deliveryAddress: string;
  companyCode: string;
  vatCode: string;
}

// ── Warehouses ───────────────────────────────────────────────────────────────
export interface Warehouse {
  id: string;
  name: string | null;
  location: string | null;
}

export interface CreateWarehouseCommand {
  name?: string;
  location?: string;
}

export interface UpdateWarehouseCommand {
  id: string;
  name?: string;
  location?: string;
}

// ── Warehouse Inventories ────────────────────────────────────────────────────
export interface WarehouseInventory {
  id: string;
  warehouseId: string;
  productId: string;
  quantityCurrent: number;
  quantityMin: number;
  quantityMax: number;
}

export interface CreateWarehouseInventoryCommand {
  warehouseId: string;
  productId: string;
  quantityCurrent: number;
  quantityMin: number;
  quantityMax: number;
}

export interface UpdateWarehouseInventoryQuantityCommand {
  id: string;
  newQuantity: number;
}

// ── Inventory Transactions ───────────────────────────────────────────────────
export enum TransactionType {
  Inbound = 1,
  Outbound = 2,
}

export interface InventoryTransaction {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  type: TransactionType;
  createdDate: string;
}

export interface CreateTransactionCommand {
  warehouseId: string;
  productId: string;
  quantity: number;
}

// ── Transfers ────────────────────────────────────────────────────────────────
export interface TransferInventoryCommand {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
}

// ── Order Type ───────────────────────────────────────────────────────────────
export enum OrderType {
  SpecialOffer = 1,
  NoSpecialOffer = 2,
}

// ── Orders ───────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  orderNumber?: string | null;
  warehouseId: string;
  status: string | null;
  createdDate: string;
  orderType: OrderType | null;
  pdfUrl: string | null;
  user: User | null;
  items?: OrderItem[] | null;

  groupedItems?: OrderGroupedItemsGroup[] | null;
  moduleCount?: number | null;
  moduleArea?: number | null;
  moduleLength?: number | null;
}

export interface OrderGroupedItemsGroup {
  groupId: string;
  groupName: string;
  items: OrderGroupedItem[];
}

export interface OrderGroupedItem {
  productId: string;
  sku: string | null;
  name: string | null;
  quantity: number;
  length: number | null;
  description: string | null;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  systemName?: string | null;
}

export interface CreateOrderCommand {
  warehouseId: string;
  userId?: string;
}

export interface AddOrderItemCommand {
  orderId: string;
  productId: string;
  quantity: number;
}

// ── Material Sort Orders ─────────────────────────────────────────────────────
export const GROUND_MATERIAL_SORT_ORDER = [
  "K-1E",
  "K-2E",
  "STR1200",
  "K-1",
  "K-2",
  "R-1",
  "R-2",
  "GG-0",
  "GG-1",
  "GG-2",
  "GG-3",
  "Gb-1",
  "Gb-2",
  "Gb-3",
  "ZN41x41",
  "Gbj",
  "Clamp G35",
  "Clamp G30",
  "Clamp V",
  "Clamp G35J",
  "Clamp G30J",
  "Clamp VJ",
  "M8-40",
  "M8-spp",
  "PL60x60",
  "Rfix",
  "Romb 18x37",
  "M10-30",
  "M10-pov",
  "M10-vs",
  "M12-30",
  "M12-pov",
  "M12-spp",
  "M12-Ve",
];

export const FLAT_ROOF_MATERIAL_SORT_ORDER = [
  "pt15-1",
  "pt15-2",
  "pt15-3",
  "pt15-4",
  "pt15-5",
  "pt15-1(p)",
  "pt15-3(p)",
  "pt15-l",
  "pt10-1",
  "pt10-2",
  "pt10-3",
  "pt10-4",
  "pt10-1(p)",
  "pt10-4(p)",
  "pt05-1",
  "pt05-2",
  "pt05-3",
  "pt20-1",
  "pt20-2",
  "pt20-3",
  "rv10-1",
  "rv10-2",
  "rv10-3",
  "rv10-4",
  "rv10-1(p)",
  "rv10-2(p)",
  "rv10-z",
  "VEJ2000",
  "LEV2400",
  "LEV2050",
  "LOV890",
  "PADU",
  "Plok300y",
  "M10-uzr",
  "Clamp G35",
  "Clamp G30",
  "Clamp V",
  "Clamp G35J",
  "Clamp G30J",
  "Clamp VJ",
  "M8-30",
  "M8 vs",
  "SAV Vej.",
];

export const SLOPED_ROOF_MATERIAL_SORT_ORDER = [
  "KvBe",
  "Qraqi6300",
  "Qraqi16300",
  "Begelis su EPDM guma 40",
  "Qrai6000",
  "Qrai16000",
  "Qrail6000",
  "Begelis su EPDM guma 80",
  "QraiMini",
  "Begelis su EPDM guma mini",
  "JungAL",
  "KvBeEND",
  "SM180",
  "SPValc",
  "Kab",
  "SavBeg",
  "M8Men",
  "M8KvBe",
  "M8-30",
  "M8-25",
  "M8-20",
  "M10-20",
  "M10-vs",
  "Clamp G35",
  "Clamp G30",
  "Clamp V",
  "Clamp G35J",
  "Clamp G30J",
  "Clamp VJ",
];
