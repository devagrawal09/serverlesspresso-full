export interface Order {
  id: string;
  productId: string;
  customerId: string;
  status: "placed" | "prepared" | "picked up" | "cancelled";

  log: OrderEvent[];
}

export type OrderPlaced = {
  type: "order placed";
  id: string;
  productId: string;
  customerId: string;
  timestamp: string;
};

export type OrderPrepared = {
  type: "order prepared";
  id: string;
  timestamp: string;
};

export type OrderPickedUp = {
  type: "order picked up";
  id: string;
  timestamp: string;
};

export type OrderCancelled = {
  type: "order cancelled";
  id: string;
  timestamp: string;
};

export type OrderEvent =
  | OrderPlaced
  | OrderPrepared
  | OrderPickedUp
  | OrderCancelled;

export type OrderLiveViews =
  | { view: "barista_orders" }
  | { view: "customer_orders"; customerId: string };

export type BaristaOrdersView = {
  view: "barista_orders";
  orders: Order[];
};

export type CustomerOrdersView = {
  view: "customer_orders";
  orders: Order[];
  customerId: string;
};
