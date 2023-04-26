// @ampt/api is experimental and subject to change. DO NOT use this for production apps.
// Please report any bugs to Discord!

// import { api } from "@ampt/api";
import { KeyValue, data } from "@ampt/data";
import z from "zod";
import { v4 as uuid } from "uuid";
import { ws } from "@ampt/sdk";

import { http } from "@ampt/sdk";

import fastify from "fastify";
import cors from "@fastify/cors";
const fastifyApp = fastify();

await fastifyApp.register(cors, { origin: "*" });

const placeOrderSchema = z.object({ userId: z.string() });

type Order = {
  id: string;
  userId: string;
  status: "placed" | "prepared" | "pickedup" | "cancelled";
};

fastifyApp.post("/customer/orders", async (req, res) => {
  try {
    const storeOpen = await data.get<boolean>("store:open");

    if (!storeOpen) {
      return res.status(400).send({ error: "Store is closed" });
    }

    const body = req.body;
    const { userId } = placeOrderSchema.parse(body);

    const orderId = uuid();

    const order = await data.set<Order>(`order:${orderId}`, {
      id: orderId,
      userId,
      status: "placed",
    });

    return res.status(201).send(order);
  } catch (e) {
    return res.status(500).send({ error: e });
  }
});

/*
// place order
publicApi.post("/order", async (event) => {
  // check if store is open
  console.log("Checking if store is open");
  const storeOpen = await data.get<boolean>("store:open");

  if (!storeOpen) {
    console.log("Store is closed");
    return event.status(400).body({ error: "Store is closed" });
  }

  const body = await event.request.body();

  const { userId } = placeOrderSchema.parse(body);

  const orderId = uuid();

  console.log(`Placing order ${orderId} for user ${userId}`);
  const order = await data.set<Order>(`order:${orderId}`, {
    id: orderId,
    userId,
    status: "placed",
  });

  console.log(`Order placed: ${JSON.stringify(order)}`);
  return event.status(201).body(order);
});

publicApi.options("/order", async (event) => {
  console.log("OPTIONS WTTTFFFF");
});

// open store
publicApi.put("/store", async (event) => {
  await data.set("store:open", true);
  return event.status(201);
});

// close store
publicApi.delete("/store", async (event) => {
  await data.set("store:open", false);
  return event.status(204);
});

// prepare order
publicApi.patch("/order/:id/prepare", async (event) => {
  const { id } = event.params;
  const order = await data.get<Order>(`order:${id}`);

  if (!order) return event.status(404);

  if ((order as Order).status !== "placed") {
    return event.status(400);
  }

  await data.set<Order>(`order:${id}`, {
    ...order,
    status: "prepared",
  });

  return event.status(200);
});

// pick up order
publicApi.patch("/order/:id/pickup", async (event) => {
  const { id } = event.params;
  const order = await data.get<Order>(`order:${id}`);

  if (!order) return event.status(404);

  if ((order as Order).status !== "prepared") {
    return event.status(400);
  }

  await data.set<Order>(`order:${id}`, {
    ...order,
    status: "pickedup",
  });

  return event.status(200);
});

// cancel order
publicApi.delete("/order/:id", async (event) => {
  const { id } = event.params;
  const order = await data.get<Order>(`order:${id}`);

  if (!order) return event.status(404);

  if ((order as Order).status !== "placed") {
    return event.status(400);
  }

  await data.set<Order>(`order:${id}`, {
    ...order,
    status: "cancelled",
  });

  return event.status(200);
});

// store info
publicApi.get("/store", async (event) => {
  const storeOpen = await data.get<boolean>("store:open");
  return event.status(200).body({ open: storeOpen });
});

// order info for barista
publicApi.get("/order/:id", async (event) => {
  const { id } = event.params;
  const order = await data.get<Order>(`order:${id}`);

  return event.status(200).body(order);
}); */

// order info for customer
fastifyApp.get("/customer/orders/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const order = await data.get<Order>(`order:${id}`, { meta: true });
    console.log(order);
    return res.status(200).send(order);
  } catch (e) {
    console.log("error", e);
    return res.status(500).send({ error: e });
  }
});

// store info
fastifyApp.get("/barista/store", async (req, res) => {
  try {
    const storeOpen = await data.get<boolean>("store:open");
    return res.status(200).send({ open: storeOpen });
  } catch (e) {
    return res.status(500).send({ error: e });
  }
});

// open/close store
fastifyApp.put("/barista/store", async (req, res) => {
  try {
    console.log("toggling store");
    const open = await data.get<boolean>("store:open");
    console.log("open", open);
    await data.set("store:open", !open);
    return res.status(200).send({ open: !open });
  } catch (e) {
    return res.status(500).send({ error: e });
  }
});

ws.on("connected", (connection) => {
  console.log(`Client connected: ${connection.connectionId}`);
});

ws.on("disconnected", async (connection, reason) => {
  console.log(`Client disconnected: ${connection.connectionId}: ${reason}`);

  // unsubscribe from all views
  const baristaViewSubscriptions = (await data.get(
    "barista_orders:subscriptions"
  )) as string[];

  if (baristaViewSubscriptions) {
    const index = baristaViewSubscriptions.indexOf(connection.connectionId);
    if (index > -1) {
      baristaViewSubscriptions.splice(index, 1);
    }

    await data.set("barista_orders:subscriptions", baristaViewSubscriptions);
  }
});

// type OrderEvent = {
//   name: "created" | "updated" | "deleted";
//   item: KeyValue<Order>;
//   previous?: KeyValue<Order>;
// };
// data.on("updated:order:*", async (event) => {
//   const { name, item, previous } = event as OrderEvent;

//   console.log(JSON.stringify({ name, item, previous, event }, null, 2));
// });

type WsSubscription = { view: string };

ws.on("message", async (connection, message: WsSubscription) => {
  // handle incoming message

  if (message.view === "barista_orders") {
    const orders = await data.get<Order>("order:*", { meta: true });
    connection.send({
      view: "barista_orders",
      data: orders,
    });

    const subscriptions =
      ((await data.get<string[]>(
        "barista_orders:subscriptions"
      )) as string[]) || [];

    if (!subscriptions.includes(connection.connectionId)) {
      subscriptions.push(connection.connectionId);
      await data.set("barista_orders:subscriptions", subscriptions);
    }
  }
});

// change order status
fastifyApp.put("/barista/orders/:id", async (req, res) => {
  const { id } = req.params as { id: string };
  console.log(`preparing order ${id}`);
  const order = await data.get<Order>(`order:${id}`);

  if (!order) {
    console.log("order not found");
    return res.status(404).send({ error: "order not found" });
  }

  if ((order as Order).status !== "placed") {
    console.log("order invalid status");
    return res.status(400).send({ error: "order invalid status" });
  }

  await data.set<Order>(`order:${id}`, {
    ...order,
    status: "prepared",
  });

  return res.status(200).send({ status: "prepared" });
});

type OrderEvent = {
  name: "created" | "updated" | "deleted";
  item: KeyValue<Order>;
  previous?: KeyValue<Order>;
};

data.on("*:order:*", async (event) => {
  const { name, item, previous } = event as OrderEvent;

  console.log(JSON.stringify({ name, item, previous, event }, null, 2));

  console.log("sending update to all barista clients");

  const [subscriptions, orders] = await Promise.all([
    data.get<string[]>("barista_orders:subscriptions"),
    data.get<Order>("order:*", { meta: true }),
  ]);

  (subscriptions as string[]).forEach((subscription) => {
    ws.send(subscription, {
      view: "barista_orders",
      data: orders,
    });
  });
});

http.useNodeHandler(fastifyApp);
