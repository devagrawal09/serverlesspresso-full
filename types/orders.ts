export interface Order {
  id: string;
  productId: string;
  customerId: string;
  status: "placed" | "preparing" | "prepared" | "picked up" | "cancelled";

  log: OrderEvent[];
}

export type OrderPlaced = {
  type: "order placed";
  id: string;
  productId: string;
  customerId: string;
  timestamp: string;
};

export type OrderPreparing = {
  type: "order preparing";
  id: string;
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
  | OrderPreparing
  | OrderPrepared
  | OrderPickedUp
  | OrderCancelled;

export type OrderLiveViews =
  | { view: "barista_orders" }
  | { view: "customer_order"; customerId: string; orderId: string };

export type BaristaOrdersView = {
  view: "barista_orders";
  orders: Order[];
};

export type CustomerOrderView = {
  view: "customer_order";
  order?: Order;
  customerId: string;
};
