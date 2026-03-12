// ── Products ────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  sku: string | null;
  name: string | null;
  length: number | null;
  description: string | null;
}

export interface CreateProductCommand {
  sku?: string;
  name?: string;
  length?: number;
  description?: string;
}

export interface UpdateProductCommand {
  id: string;
  sku?: string;
  name?: string;
  length?: number;
  description?: string;
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

// ── Orders ───────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  warehouseId: string;
  status: string | null;
  items: OrderItem[] | null;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderCommand {
  warehouseId: string;
}

export interface AddOrderItemCommand {
  orderId: string;
  productId: string;
  quantity: number;
}
