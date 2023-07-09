import { BaristaLiveview } from "./src/baristaLiveview";
import { ws } from "@ampt/sdk";
import { http } from "@ampt/sdk";
import fastify from "fastify";
import cors from "@fastify/cors";
import { CustomerApi } from "./src/customerApi";
import { BaristaApi } from "./src/baristaApi";
import { CustomerLiveview } from "./src/customerLiveview";

const fastifyApp = fastify();

fastifyApp.register(cors, { origin: "*" });

// setup apis
fastifyApp.register(CustomerApi, { prefix: "/customer" });
fastifyApp.register(BaristaApi, { prefix: "/barista" });

// setup liveviews
BaristaLiveview({
  on(cb) {
    ws.on("message", (c, m) => cb(c.connectionId, m));
    ws.on("disconnected", (c, r) => cb(c.connectionId, "close"));
  },
  send: (c, m) => ws.send(c, m),
});
CustomerLiveview({
  on(cb) {
    ws.on("message", (c, m) => cb(c.connectionId, m));
    ws.on("disconnected", (c, r) => cb(c.connectionId, "close"));
  },
  send: (c, m) => ws.send(c, m),
});

http.useNodeHandler(fastifyApp);

ws.on("connected", (connection) => {
  console.log(`Client connected: ${connection.connectionId}`);
});
