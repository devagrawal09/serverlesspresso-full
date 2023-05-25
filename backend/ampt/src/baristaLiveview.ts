import { data } from "@ampt/data";
import { type SocketConnection, ws } from "@ampt/sdk";
import { BaristaOrdersView, Order } from "../../../types/orders";

export async function subscribeToBaristaView(connection: SocketConnection) {
  const subscriptions = ((await data.get<string[]>(
    "barista_orders:subscriptions"
  )) ?? []) as string[];

  if (!subscriptions.includes(connection.connectionId)) {
    subscriptions.push(connection.connectionId);
    await data.set("barista_orders:subscriptions", subscriptions);
  }

  const orders = await data.get<Order>("order:*", { meta: true });

  const message: BaristaOrdersView = {
    view: "barista_orders",
    orders: orders.items.map((i) => i.value),
  };

  await connection.send(message);
}

export async function updateBaristaView() {
  console.debug("updating barista view");
  const subscriptions = (await data.get<string[]>(
    "barista_orders:subscriptions"
  )) as string[];

  if (!subscriptions?.length) return;

  const orders = await data.get<Order>("order:*", { meta: true });

  const message: BaristaOrdersView = {
    view: "barista_orders",
    orders: orders.items.map((i) => i.value),
  };

  await Promise.all(
    subscriptions.map((connectionId) => ws.send(connectionId, message))
  );
}

export async function unsubscribeFromBaristaView(connection: SocketConnection) {
  const subscriptions = (await data.get<string[]>(
    "barista_orders:subscriptions"
  )) as string[];

  if (!subscriptions?.length) return;

  const index = subscriptions.indexOf(connection.connectionId);

  if (index > -1) {
    subscriptions.splice(index, 1);
    await data.set("barista_orders:subscriptions", subscriptions);
  }
}
