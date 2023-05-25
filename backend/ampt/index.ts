// import { api } from "@ampt/api";
import { ws } from "@ampt/sdk";
import { http } from "@ampt/sdk";
import fastify from "fastify";
import cors from "@fastify/cors";
import {
  subscribeToBaristaView,
  unsubscribeFromBaristaView,
} from "./src/baristaLiveview";
import { OrderLiveViews } from "../../types/orders";
import { storefrontApi } from "./src/customerApi";
import { baristaApi } from "./src/baristaApi";
import {
  unsubscribeFromCustomerView,
  subscribeToCustomerView,
} from "./src/customerLiveview";
import { setupOrderSubscriptions } from "./src/subscriptions";

const fastifyApp = fastify();

fastifyApp.register(cors, { origin: "*" });

// setup apis
fastifyApp.register(storefrontApi, { prefix: "/customer" });

fastifyApp.register(baristaApi, { prefix: "/barista" });

http.useNodeHandler(fastifyApp);

// setup liveviews
ws.on("message", async (connection, message: OrderLiveViews) => {
  if (message.view === "barista_orders") {
    await subscribeToBaristaView(connection);
  }

  if (message.view === "customer_orders") {
    await subscribeToCustomerView(connection, message.customerId);
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

// setup event listeners
setupOrderSubscriptions();

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
