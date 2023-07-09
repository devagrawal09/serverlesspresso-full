import { data } from "@ampt/data";
import { OrderNotFoundError, Orders } from "./orders";
import { CustomerOrderView, OrderLiveViews } from "../../../types/orders";

type CustomerSubscription = { customerId: string; connectionId: string };

const CustomerSubscriptions = {
  async get() {
    return ((await data.get<CustomerSubscription[]>(
      `customer_order:subscriptions`
    )) ?? []) as CustomerSubscription[];
  },

  async set(subscriptions: CustomerSubscription[]) {
    return await data.set(`customer_order:subscriptions`, subscriptions);
  },
};

export const CustomerLiveview = ({
  on,
  send,
}: {
  on: (
    cb: (connection: string, message: OrderLiveViews | "close") => Promise<any>
  ) => void;
  send: (connection: string, message: CustomerOrderView) => Promise<any>;
}) => {
  const orders = Orders;
  const customerSubscriptions = CustomerSubscriptions;

  on(async (connection, message) => {
    if (message === "close") {
      const subscriptions = await customerSubscriptions.get();

      if (!subscriptions?.length) return;

      const remaining = subscriptions.filter(
        (s) => s.connectionId !== connection
      );

      await customerSubscriptions.set(remaining);
    } else if (message.view === "customer_order") {
      const subscriptions = await customerSubscriptions.get();

      const { customerId, orderId } = message;

      if (
        !subscriptions.find(
          (s) => s.customerId === customerId && s.connectionId === connection
        )
      ) {
        subscriptions.push({
          customerId,
          connectionId: connection,
        });
        await customerSubscriptions.set(subscriptions);
      }

      const order = await orders.getOrderById(orderId);

      if (order instanceof OrderNotFoundError) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const data: CustomerOrderView = {
        view: "customer_order",
        order,
        customerId,
      };

      await send(connection, data);
    }
  });

  orders.onOrderUpdate(async (e, order) => {
    const customerId = order.customerId;
    // console.debug(`updating customer view for ${customerId}`);
    const subscriptions = await customerSubscriptions.get();

    if (!subscriptions?.length) return;

    const message: CustomerOrderView = {
      view: "customer_order",
      order,
      customerId,
    };

    await Promise.all(
      subscriptions
        .filter((s) => s.customerId === customerId)
        .map((s) => send(s.connectionId, message))
    );
  });
};
