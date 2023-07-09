import { data } from "@ampt/data";
import { v4 as uuid } from "uuid";
import { Order, OrderEvent } from "../../../types/orders";

type Handler = (event: OrderEvent, order: Order) => Promise<void>;
const handlers: Set<Handler> = new Set();

async function getOrderById(id: string) {
  const res = await data.get<Order>(`order:${id}`);
  if (!res) return new OrderNotFoundError();

  return res as Order;
}

async function getAllOrders() {
  const res = await data.get<Order>("order:*", { meta: true });

  return res.items.map((i) => i.value);
}

async function placeOrder(input: {
  productId: string;
  customerId: string;
}): Promise<Order> {
  const order: Order = {
    id: uuid(),
    productId: input.productId,
    customerId: input.customerId,
    status: "placed",

    log: [
      {
        type: "order placed",
        id: uuid(),
        productId: input.productId,
        customerId: input.customerId,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const placed = await data.set<Order>(`order:${order.id}`, order, {
    label1: `orders:${input.customerId}`,
  });
  handlers.forEach((h) => h(order.log[order.log.length - 1], order));

  return placed as Order;
}

async function markOrderAsPreparing(id: string) {
  const order = await getOrderById(id);

  if (order instanceof OrderNotFoundError) return order;

  if (order.status !== "placed") return new OrderAlreadyPreparingError();

  order.status = "preparing";
  order.log.push({
    type: "order preparing",
    id: uuid(),
    timestamp: new Date().toISOString(),
  });

  const preparing = await data.set<Order>(`order:${id}`, order);

  handlers.forEach((h) => h(order.log[order.log.length - 1], order));
  return preparing as Order;
}

async function markOrderAsPrepared(id: string) {
  const order = await getOrderById(id);

  if (order instanceof OrderNotFoundError) return order;

  if (order.status !== "preparing") return new OrderAlreadyPreparedError();

  order.status = "prepared";
  order.log.push({
    type: "order prepared",
    id: uuid(),
    timestamp: new Date().toISOString(),
  });

  const prepared = await data.set<Order>(`order:${id}`, order);

  handlers.forEach((h) => h(order.log[order.log.length - 1], order));
  return prepared as Order;
}

async function markOrderAsPickedUp(id: string) {
  const order = await getOrderById(id);

  if (order instanceof OrderNotFoundError) return order;

  if (order.status !== "prepared") return new OrderCannotBePickedUp();

  order.status = "picked up";
  order.log.push({
    type: "order picked up",
    id: uuid(),
    timestamp: new Date().toISOString(),
  });

  const pickedUp = await data.set<Order>(`order:${id}`, order);

  handlers.forEach((h) => h(order.log[order.log.length - 1], order));
  return pickedUp as Order;
}

async function cancelOrder(id: string) {
  const order = await getOrderById(id);

  if (order instanceof OrderNotFoundError) return order;

  if (order.status === "picked up") return new OrderAlreadyPickedUp();
  if (order.status === "cancelled") return new OrderAlreadyCancelled();

  order.status = "cancelled";
  order.log.push({
    type: "order cancelled",
    id: uuid(),
    timestamp: new Date().toISOString(),
  });

  const cancelled = await data.set<Order>(`order:${id}`, order);

  handlers.forEach((h) => h(order.log[order.log.length - 1], order));
  return cancelled as Order;
}

async function getOrdersByCustomerId(customerId: string) {
  const orderData = await data.getByLabel<Order>(
    "label1",
    `orders:${customerId}`
  );

  return (orderData as any).items.map(({ key, value }) => value) as Order[];
}

// async function getCurrentOrderForCustomer(customerId: string) {
//   const orders = await getOrdersByCustomerId(customerId);

//   return orders.find((order) => order.status !== "picked up");
// }

export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found");
  }
}

export class OrderAlreadyPreparingError extends Error {
  constructor() {
    super("Order already preparing");
  }
}

export class OrderAlreadyPreparedError extends Error {
  constructor() {
    super("Order cannot be prepared");
  }
}

export class OrderCannotBePickedUp extends Error {
  constructor() {
    super("Order cannot be picked up");
  }
}

export class OrderAlreadyPickedUp extends Error {
  constructor() {
    super("Order already picked up");
  }
}

export class OrderAlreadyCancelled extends Error {
  constructor() {
    super("Order already cancelled");
  }
}

function onOrderUpdate(callback: Handler) {
  // data.on("*:order:*", async ({ item }) => {
  //   const order = item.value as Order;
  //   const event = order.log[order.log.length - 1];
  //   console.log("order event", { event, order });
  //   return callback(event, order);
  // });

  handlers.add(callback);
}

export const Orders = {
  getOrderById,
  getAllOrders,
  placeOrder,
  markOrderAsPreparing,
  markOrderAsPrepared,
  markOrderAsPickedUp,
  cancelOrder,
  getOrdersByCustomerId,
  // getCurrentOrderForCustomer,
  onOrderUpdate,
};
