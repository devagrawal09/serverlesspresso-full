// @ampt/api is experimental and subject to change. DO NOT use this for production apps.
// Please report any bugs to Discord!

// import { api } from "@ampt/api";
import { data } from "@ampt/data";
import z from "zod";
import { ws } from "@ampt/sdk";
import { http } from "@ampt/sdk";
import fastify from "fastify";
import cors from "@fastify/cors";
import {
  OrderAlreadyPreparedError,
  OrderNotFoundError,
  getOrderById,
  onOrderUpdate,
  placeOrder,
  prepareOrder,
} from "./orders/domain";
import {
  baristaView,
  customerView,
  unsubscribeFromBaristaView,
  unsubscribeFromCustomerView,
  updateBaristaView,
  updateCustomerView,
} from "./orders/liveviews";
import { OrderLiveViews } from "../../types/orders";

const fastifyApp = fastify();

await fastifyApp.register(cors, { origin: "*" });

const placeOrderSchema = z.object({ userId: z.string() });

fastifyApp.post("/customer/orders", async (req, res) => {
  try {
    const storeOpen = await data.get<boolean>("store:open");

    if (!storeOpen) {
      return res.status(400).send({ error: "Store is closed" });
    }

    const body = req.body;
    const { userId } = placeOrderSchema.parse(body);

    const order = await placeOrder({
      customerId: userId,
      productId: "espresso",
    });

    return res.status(201).send(order);
  } catch (e) {
    console.error(e);
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

    const order = await getOrderById(id);

    if (order instanceof OrderNotFoundError) {
      return res.status(404).send({ error: order.message });
    }
    console.log("order", order);
    return res.status(200).send(order);
  } catch (e) {
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
  unsubscribeFromBaristaView(connection);
  unsubscribeFromCustomerView(connection);
});

ws.on("message", async (connection, message: OrderLiveViews) => {
  if (message.view === "barista_orders") {
    await baristaView(connection);
  }

  if (message.view === "customer_orders") {
    await customerView(connection, message.customerId);
  }
});

// change order status
fastifyApp.put("/barista/orders/:id/prepare", async (req, res) => {
  const { id } = req.params as { id: string };

  const order = await prepareOrder(id);

  if (order instanceof OrderNotFoundError) {
    return res.status(404).send({ error: order.message });
  }

  if (order instanceof OrderAlreadyPreparedError) {
    return res.status(400).send({ error: order.message });
  }

  return res.status(200).send({ status: "prepared", order });
});

onOrderUpdate(async (e, o) => {
  updateBaristaView();
  updateCustomerView(o.customerId);
});

http.useNodeHandler(fastifyApp);
