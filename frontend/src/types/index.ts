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
  items: OrderItem[] | null;
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
