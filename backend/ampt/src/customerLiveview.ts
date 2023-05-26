import { data } from "@ampt/data";
import { ws } from "@ampt/sdk";
import { Orders } from "./orders";
import { CustomerOrdersView, OrderLiveViews } from "../../../types/orders";

type CustomerSubscription = { customerId: string; connectionId: string };

const CustomerSubscriptions = {
  async get() {
    return ((await data.get<CustomerSubscription[]>(
      `customer_orders:subscriptions`
    )) ?? []) as CustomerSubscription[];
  },

  async set(subscriptions: CustomerSubscription[]) {
    return await data.set(`customer_orders:subscriptions`, subscriptions);
  },
};

export const CustomerLiveview = () => {
  const orders = Orders;
  const customerSubscriptions = CustomerSubscriptions;

  ws.on("message", async (connection, message: OrderLiveViews) => {
    if (message.view === "customer_orders") {
      const subscriptions = await customerSubscriptions.get();

      const customerId = message.customerId;

      if (
        !subscriptions.find(
          (s) =>
            s.customerId === customerId &&
            s.connectionId === connection.connectionId
        )
      ) {
        subscriptions.push({
          customerId,
          connectionId: connection.connectionId,
        });
        await customerSubscriptions.set(subscriptions);
      }

      const ordersData = await orders.getOrdersByCustomerId(customerId);

      const send: CustomerOrdersView = {
        view: "customer_orders",
        orders: ordersData,
        customerId,
      };

      await connection.send(send);
    }
  });

  ws.on("disconnected", async (connection, reason) => {
    console.log(`Client disconnected: ${connection.connectionId}: ${reason}`);
    const subscriptions = await customerSubscriptions.get();

    if (!subscriptions?.length) return;

    const remaining = subscriptions.filter(
      (s) => s.connectionId !== connection.connectionId
    );

    await customerSubscriptions.set(remaining);
  });

  orders.onOrderUpdate(async (e, o) => {
    const customerId = o.customerId;
    console.debug(`updating customer view for ${customerId}`);
    const subscriptions = await customerSubscriptions.get();

    if (!subscriptions?.length) return;

    const ordersData = await orders.getOrdersByCustomerId(customerId);

    const message: CustomerOrdersView = {
      view: "customer_orders",
      orders: ordersData,
      customerId,
    };

    await Promise.all(
      subscriptions
        .filter((s) => s.customerId === customerId)
        .map((s) => ws.send(s.connectionId, message))
    );
  });
};
