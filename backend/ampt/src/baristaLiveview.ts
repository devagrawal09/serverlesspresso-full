import { data } from "@ampt/data";
import { ws } from "@ampt/sdk";
import { BaristaOrdersView, OrderLiveViews } from "../../../types/orders";
import { Orders } from "./orders";

const BaristaSubscriptions = {
  async get() {
    return ((await data.get<string[]>("barista_orders:subscriptions")) ??
      []) as string[];
  },

  async set(subscriptions: string[]) {
    return data.set("barista_orders:subscriptions", subscriptions);
  },
};

export const BaristaLiveview = () => {
  const customerSubscriptions = BaristaSubscriptions;
  const orders = Orders;

  ws.on("message", async (connection, message: OrderLiveViews) => {
    if (message.view === "barista_orders") {
      const subscriptions = await customerSubscriptions.get();

      if (!subscriptions.includes(connection.connectionId)) {
        subscriptions.push(connection.connectionId);
        await customerSubscriptions.set(subscriptions);
      }

      const ordersData = await orders.getAllOrders();

      const message: BaristaOrdersView = {
        view: "barista_orders",
        orders: ordersData,
      };

      await connection.send(message);
    }
  });

  ws.on("disconnected", async (connection, reason) => {
    const subscriptions = await customerSubscriptions.get();

    if (!subscriptions?.length) return;

    const index = subscriptions.indexOf(connection.connectionId);

    if (index > -1) {
      subscriptions.splice(index, 1);
      await customerSubscriptions.set(subscriptions);
    }
  });

  orders.onOrderUpdate(async (e, o) => {
    console.debug("updating barista view");
    const subscriptions = await customerSubscriptions.get();

    if (!subscriptions?.length) return;

    const ordersData = await orders.getAllOrders();

    const message: BaristaOrdersView = {
      view: "barista_orders",
      orders: ordersData,
    };

    await Promise.all(
      subscriptions.map((connectionId) => ws.send(connectionId, message))
    );
  });
};
