import { data } from "@ampt/data";
import { type SocketConnection, ws } from "@ampt/sdk";
import { getOrdersByCustomerId } from "./orders";
import { CustomerOrdersView } from "../../../types/orders";

type CustomerSubscription = { customerId: string; connectionId: string };

export async function subscribeToCustomerView(
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
