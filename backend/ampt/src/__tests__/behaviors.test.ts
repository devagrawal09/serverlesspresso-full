import fastify, { InjectOptions } from "fastify";
import { beforeEach, describe, expect, test } from "vitest";
import { createServerlesspressoClient } from "../../../../frontend/sdk";
import {
  BaristaOrdersView,
  CustomerOrderView,
  Order,
  OrderLiveViews,
} from "../../../../types/orders";
import { BaristaApi } from "../baristaApi";
import { CustomerApi } from "../customerApi";
import { data } from "@ampt/data";
import { Subject } from "rxjs";
import { BaristaLiveview } from "../baristaLiveview";
import { CustomerLiveview } from "../customerLiveview";

const fastifyApp = fastify();
fastifyApp.register(CustomerApi, { prefix: "/customer" });
fastifyApp.register(BaristaApi, { prefix: "/barista" });

const serverToClient = new Subject<BaristaOrdersView | CustomerOrderView>();
const clientToServer = new Subject<OrderLiveViews | "close">();
const clientId = "test-client-id";

BaristaLiveview({
  async send(connection, message) {
    serverToClient.next(message);
  },
  on(cb) {
    clientToServer.subscribe((m) => cb(clientId, m));
  },
});

CustomerLiveview({
  async send(connection, message) {
    serverToClient.next(message);
  },
  on(cb) {
    clientToServer.subscribe((m) => cb(clientId, m));
  },
});

const client = createServerlesspressoClient(
  "",
  "ws://localhost:3002",
  async (url, options) => {
    const res = await fastifyApp.inject({
      url,
      method: (options?.method as InjectOptions["method"]) || "GET",
      payload: options?.body ? JSON.parse(options.body as string) : undefined,
    });
    if (res.statusCode >= 400) {
      throw new Error(res.payload);
    }
    return new Response(res.payload, { status: res.statusCode });
  },
  () => {
    function on(cb: (m) => void) {
      serverToClient.subscribe(cb);
    }

    function send(m: OrderLiveViews | "close") {
      clientToServer.next(m);
    }

    return { on, send };
  }
);

const customerId = "123";
const productId = "456";

async function ensureStoreIsOpen() {
  const store = await client.barista.getStore();
  if (!store.open) {
    await client.barista.toggleStore();
  }
}

async function cleanupOrders() {
  const orders = await data.get<Order>("order:*", { meta: true });
  (await orders.items.length)
    ? data.remove(orders.items.map((o) => o.key))
    : null;
}

describe("serverlesspresso", () => {
  beforeEach(ensureStoreIsOpen);

  describe("customer api", () => {
    test("customer can place order", async () => {
      const order = await client.customer.placeOrder(customerId, productId);

      expect(order.customerId).toBe(customerId);
      expect(order.status).toBe("placed");
      expect(order.log).toHaveLength(1);
      expect(order.log[0].type).toBe("order placed");
    });

    test("customer fails to place order if store is closed", async () => {
      const store = await client.barista.toggleStore();
      expect(store.open).toBe(false);

      try {
        await client.customer.placeOrder(customerId, productId);
      } catch (e) {
        expect(e.message).toBe("Store is closed");
        return;
      }
      expect("should have failed").toBe("but did not");
    });

    test("customer can get order", async () => {
      const order = await client.customer.placeOrder(customerId, productId);

      const fetchedOrder = await client.customer.getOrder(order.id);

      expect(fetchedOrder).toEqual(order);
    });

    test("customer can cancel order", async () => {
      const order = await client.customer.placeOrder(customerId, productId);

      const cancelledOrder = await client.customer.cancelOrder(order.id);

      expect(cancelledOrder.status).toBe("cancelled");
      expect(cancelledOrder.log).toHaveLength(2);
      expect(cancelledOrder.log[1].type).toBe("order cancelled");
    });
  });

  describe("barista api", () => {
    test("barista can mark order as preparing", async () => {
      const order = await client.customer.placeOrder(customerId, productId);

      const preparingOrder = await client.barista.markOrderAsPreparing(
        order.id
      );

      expect(preparingOrder.status).toBe("preparing");
      expect(preparingOrder.log).toHaveLength(2);
      expect(preparingOrder.log[1].type).toBe("order preparing");
    });

    test("barista can mark order as prepared", async () => {
      const order = await client.customer.placeOrder(customerId, productId);
      await client.barista.markOrderAsPreparing(order.id);

      const preparedOrder = await client.barista.markOrderAsPrepared(order.id);

      expect(preparedOrder.status).toBe("prepared");
      expect(preparedOrder.log).toHaveLength(3);
      expect(preparedOrder.log[2].type).toBe("order prepared");
    });

    test("barista can mark order as picked up", async () => {
      const order = await client.customer.placeOrder(customerId, productId);
      await client.barista.markOrderAsPreparing(order.id);
      await client.barista.markOrderAsPrepared(order.id);

      const pickedUpOrder = await client.barista.markOrderAsPickedUp(order.id);

      expect(pickedUpOrder.status).toBe("picked up");
      expect(pickedUpOrder.log).toHaveLength(4);
      expect(pickedUpOrder.log[3].type).toBe("order picked up");
    });

    test("barista can cancel placed order", async () => {
      const order = await client.customer.placeOrder(customerId, productId);

      const cancelledOrder = await client.barista.cancelOrder(order.id);

      expect(cancelledOrder.status).toBe("cancelled");
      expect(cancelledOrder.log).toHaveLength(2);
      expect(cancelledOrder.log[1].type).toBe("order cancelled");
    });

    test("barista can cancel preparing order", async () => {
      const order = await client.customer.placeOrder(customerId, productId);
      await client.barista.markOrderAsPreparing(order.id);

      const cancelledOrder = await client.barista.cancelOrder(order.id);

      expect(cancelledOrder.status).toBe("cancelled");
      expect(cancelledOrder.log).toHaveLength(3);
      expect(cancelledOrder.log[2].type).toBe("order cancelled");
    });

    test("barista can cancel prepared order", async () => {
      const order = await client.customer.placeOrder(customerId, productId);
      await client.barista.markOrderAsPreparing(order.id);
      await client.barista.markOrderAsPrepared(order.id);

      const cancelledOrder = await client.barista.cancelOrder(order.id);

      expect(cancelledOrder.status).toBe("cancelled");
      expect(cancelledOrder.log).toHaveLength(4);
      expect(cancelledOrder.log[3].type).toBe("order cancelled");
    });

    test("barista cannot cancel picked up order", async () => {
      const order = await client.customer.placeOrder(customerId, productId);
      await client.barista.markOrderAsPreparing(order.id);
      await client.barista.markOrderAsPrepared(order.id);
      await client.barista.markOrderAsPickedUp(order.id);

      try {
        await client.barista.cancelOrder(order.id);

        expect("should have failed").toBe("but did not");
      } catch (e) {
        expect(e.message).toBe("Order already picked up");
      }
    });

    test("barista cannot prepare cancelled order", async () => {
      const order = await client.customer.placeOrder(customerId, productId);
      await client.barista.cancelOrder(order.id);

      try {
        await client.barista.markOrderAsPreparing(order.id);

        expect("should have failed").toBe("but did not");
      } catch (e) {
        expect(e.message).toBe("Order already preparing");
      }
    });
  });

  describe("barista view", () => {
    beforeEach(cleanupOrders);

    test("placed order shows up in barista's orders", () =>
      withSubscription(
        async () => {},
        () => client.customer.placeOrder(customerId, productId),
        (orders: Order[]) => {
          // console.log({ orders });
          expect(orders).toHaveLength(1);
          expect(orders[0].status).toBe("placed");
        },
        (cb) => client.baristaLiveview.subscribe(cb)
      ));

    test("cancelled order shows up in barista's orders", () =>
      withSubscription(
        () => client.customer.placeOrder(customerId, productId),
        (order) => client.barista.cancelOrder(order.id),
        (orders: Order[]) => {
          expect(orders).toHaveLength(1);
          expect(orders[0].status).toBe("cancelled");
        },
        (cb) => client.baristaLiveview.subscribe(cb)
      ));

    test("preparing order shows up in barista's orders", () =>
      withSubscription(
        () => client.customer.placeOrder(customerId, productId),
        (order) => client.barista.markOrderAsPreparing(order.id),
        (orders: Order[]) => {
          expect(orders).toHaveLength(1);
          expect(orders[0].status).toBe("preparing");
        },
        (cb) => client.baristaLiveview.subscribe(cb)
      ));

    test("prepared order shows up in barista's orders", () =>
      withSubscription(
        async () => {
          const order = await client.customer.placeOrder(customerId, productId);
          return client.barista.markOrderAsPreparing(order.id);
        },
        (order) => client.barista.markOrderAsPrepared(order.id),
        (orders: Order[]) => {
          expect(orders).toHaveLength(1);
          expect(orders[0].status).toBe("prepared");
        },
        (cb) => client.baristaLiveview.subscribe(cb)
      ));

    test("picked up order shows up in barista's orders", () =>
      withSubscription(
        async function () {
          const order = await client.customer.placeOrder(customerId, productId);
          await client.barista.markOrderAsPreparing(order.id);
          return client.barista.markOrderAsPrepared(order.id);
        },
        async function (order) {
          client.barista.markOrderAsPickedUp(order.id);
        },
        async function (orders: Order[]) {
          expect(orders).toHaveLength(1);
          expect(orders[0].status).toBe("picked up");
        },
        (cb) => client.baristaLiveview.subscribe(cb)
      ));
  });

  describe("customer view", () => {
    beforeEach(cleanupOrders);

    test("customer is notified when order is preparing", () =>
      withSubscription(
        () => client.customer.placeOrder(customerId, productId),
        (order) => client.barista.markOrderAsPreparing(order.id),
        (order: Order) => {
          expect(order.status).toBe("preparing");
        },
        (cb, order) =>
          client.customerLiveview.subscribe(customerId, order.id, cb)
      ));

    test("customer is notified when order is prepared", () =>
      withSubscription(
        async () => {
          const order = await client.customer.placeOrder(customerId, productId);
          return client.barista.markOrderAsPreparing(order.id);
        },
        (order) => client.barista.markOrderAsPrepared(order.id),
        (order: Order) => {
          expect(order.status).toBe("prepared");
        },
        (cb, order) =>
          client.customerLiveview.subscribe(customerId, order.id, cb)
      ));

    test("customer is notified when order is picked up", () =>
      withSubscription(
        async () => {
          const order = await client.customer.placeOrder(customerId, productId);
          await client.barista.markOrderAsPreparing(order.id);
          return client.barista.markOrderAsPrepared(order.id);
        },
        (order) => client.barista.markOrderAsPickedUp(order.id),
        (order: Order, d) => {
          expect(order.status).toBe("picked up");
        },
        (cb, order) =>
          client.customerLiveview.subscribe(customerId, order.id, cb)
      ));
  });
});

const withSubscription = async <T, D>(
  given: () => Promise<D>,
  when: (data: D) => Promise<any>,
  then: (view: T, data: D) => any,
  sub: (cb: (view: T) => void, data: D) => () => void
) =>
  new Promise((res) => {
    let requestPlaced = false;
    given().then(async (data) => {
      const cleanup = sub((view) => {
        if (requestPlaced) {
          requestPlaced = false;
          // console.log(`got the final event`);
          then(view, data);

          cleanup();
          res(true);
        } else {
          expect(view).toBeDefined();
        }
      }, data);

      const promise = await when(data);
      requestPlaced = true;
      return promise;
    });
    // .then((response) => console.log({ response }));
  });
