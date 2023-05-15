import { data } from "@ampt/data";
import { type SocketConnection, ws } from "@ampt/sdk";
import { getOrdersByCustomerId } from "./domain";
import {
  BaristaOrdersView,
  CustomerOrdersView,
  Order,
} from "../../../types/orders";

export async function baristaView(connection: SocketConnection) {
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

type CustomerSubscription = { customerId: string; connectionId: string };

export async function customerView(
  connection: SocketConnection,
  customerId: string
) {
  const subscriptions = ((await data.get<CustomerSubscription[]>(
    `customer_orders:subscriptions`
  )) ?? []) as CustomerSubscription[];

  if (
    !subscriptions.find(
      (s) =>
        s.customerId === customerId &&
        s.connectionId === connection.connectionId
    )
  ) {
    subscriptions.push({ customerId, connectionId: connection.connectionId });
    await data.set(`customer_orders:subscriptions`, subscriptions);
  }

  const orders = await getOrdersByCustomerId(customerId);

  const message: CustomerOrdersView = {
    view: "customer_orders",
    orders,
    customerId,
  };

  await connection.send(message);
}

export async function updateCustomerView(customerId: string) {
  console.debug(`updating customer view for ${customerId}`);
  const subscriptions = (await data.get<CustomerSubscription[]>(
    `customer_orders:subscriptions`
  )) as CustomerSubscription[];

  if (!subscriptions?.length) return;

  const orders = await getOrdersByCustomerId(customerId);

  const message: CustomerOrdersView = {
    view: "customer_orders",
    orders,
    customerId,
  };

  await Promise.all(
    subscriptions
      .filter((s) => s.customerId === customerId)
      .map((s) => ws.send(s.connectionId, message))
  );
}

export async function unsubscribeFromCustomerView(
  connection: SocketConnection
) {
  const subscriptions = (await data.get<CustomerSubscription[]>(
    `customer_orders:subscriptions`
  )) as CustomerSubscription[];

  if (!subscriptions?.length) return;

  const remaining = subscriptions.filter(
    (s) => s.connectionId !== connection.connectionId
  );

  await data.set(`customer_orders:subscriptions`, remaining);
}
