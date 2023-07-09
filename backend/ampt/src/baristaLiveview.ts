import { data } from "@ampt/data";
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

export const BaristaLiveview = ({
  on,
  send,
}: {
  on: (
    cb: (connection: string, message: OrderLiveViews | "close") => Promise<any>
  ) => void;
  send: (connection: string, message: BaristaOrdersView) => Promise<any>;
}) => {
  const baristaSubscriptions = BaristaSubscriptions;
  const orders = Orders;

  on(async (connection, message) => {
    if (message === "close") {
      const subscriptions = await baristaSubscriptions.get();

      if (!subscriptions?.length) return;

      const index = subscriptions.indexOf(connection);

      if (index > -1) {
        subscriptions.splice(index, 1);
        await baristaSubscriptions.set(subscriptions);
      }
    } else if (message.view === "barista_orders") {
      const subscriptions = await baristaSubscriptions.get();

      if (!subscriptions.includes(connection)) {
        subscriptions.push(connection);
        await baristaSubscriptions.set(subscriptions);
      }

      const ordersData = await orders.getAllOrders();

      const message: BaristaOrdersView = {
        view: "barista_orders",
        orders: ordersData,
      };

      send(connection, message);
    }
  });

  orders.onOrderUpdate(async (e, o) => {
    // console.debug("updating barista view");
    const subscriptions = await baristaSubscriptions.get();

    if (!subscriptions?.length) return;

    const ordersData = await orders.getAllOrders();

    const message: BaristaOrdersView = {
      view: "barista_orders",
      orders: ordersData,
    };

    await Promise.all(
      subscriptions.map((connection) => send(connection, message))
    );
  });
};
