// ── System Category ──────────────────────────────────────────────────────────
export enum SystemCategory {
  Shared     = 0,
  Ground     = 1,
  FlatRoof   = 2,
  SlopedRoof = 3,
  RoofShared = 4,
}

export const SYSTEM_CATEGORY_LABELS: Record<SystemCategory, string> = {
  [SystemCategory.Shared]:     "Bendros (visos sistemos)",
  [SystemCategory.Ground]:     "Žemės sistemos",
  [SystemCategory.FlatRoof]:   "Plokščio stogo sistemos",
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
  SpecialOffer   = 1,
  NoSpecialOffer = 2,
}

// ── Orders ───────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  warehouseId: string;
  status: string | null;
  createdDate: string;
  orderType: OrderType | null;
  pdfUrl: string | null;
  user: User | null;
  items?: OrderItem[] | null;

  groupedItems?: OrderGroupedItemsGroup[] | null;
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
  "k-1e",
  "k-2e",
  "stryp",
  "k-1",
  "k-2",
  "grebestas 41x41",
  "r-1",
  "r-2",
  "gg-0",
  "gg-1",
  "gg-2",
  "gg-3",
  "gb-1",
  "gb-2",
  "ZN41x41 Grebėstas 41x41",
  "gbj",
  "clamp g 35 juoda",
  "clamp g 30 juoda",
  "clamp v juoda",
  "clamp g 35",
  "clamp g 30",
  "clamp v 35",
  "m8 varztas cilindrine galvute 40",
  "m8 spyruokline poverzle",
  "aliuminio plokstele 60x60",
  "rombines verzles fiksatorius",
  "rombine verzle 18x37",
  "m10 varztas cilindrine galvute 30",
  "m10 poverzles",
  "m10 verzle su isoneliu",
  "m12 varztas 30",
  "m12 poverzle",
  "m12 spyruokline poverzle",
  "m12 verzle",
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
  "lovys balastui",
  "padukai balastui",
  "uzdylimo ploksteles 300x300",
  "m10 spec. varztas uzdylimo plokstelei",
  "m10 verzle su sioneliu",
  "galiniai prispaudejai 35",
  "galiniai prispaudejai 30",
  "vidiniai prispaudejai 35",
  "galiniai prispaudejai 35 juoda",
  "galiniai prispaudejai 30 juoda",
  "vidiniai prispaudejai juoda",
];

export const SLOPED_ROOF_MATERIAL_SORT_ORDER = [
  "kvadratinis begelis",
  "begelis su epdm guma 40",
  "begelis su epdm guma 80",
  "begelis su epdm guma mini",
  "kvadratinio begelio jungtis",
  "KvBeEND",
  "smeiges 180",
  "spaustukas valcuotai skardai",
  "kabliai cerpiniam stogui",
  "spec savisriegiai begeliui",
  "m8 menuliukai",
  "m8 rombine verzle",
  "m8 varztas cilindrine galvute 30",
  "m8 varztas cilindrine galvute 25",
  "m8 varztas cilindrine galvute 20",
  "m10 varztas 20",
  "m10 verzle su soneliu",
  "galiniai prispaudejai 35",
  "galiniai prispaudejai 30",
  "vidiniai prispaudejai",
  "galiniai prispaudejai 35 juoda",
  "galiniai prispaudejai 30 juoda",
  "vidiniai prispaudejai juoda",
];