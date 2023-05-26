import { BaristaLiveview } from "./src/baristaLiveview";
import { ws } from "@ampt/sdk";
import { http } from "@ampt/sdk";
import fastify from "fastify";
import cors from "@fastify/cors";
import { StorefrontApi } from "./src/customerApi";
import { BaristaApi } from "./src/baristaApi";
import { CustomerLiveview } from "./src/customerLiveview";

const fastifyApp = fastify();

fastifyApp.register(cors, { origin: "*" });

// setup apis
fastifyApp.register(StorefrontApi, { prefix: "/customer" });
fastifyApp.register(BaristaApi, { prefix: "/barista" });

// setup liveviews
BaristaLiveview();
CustomerLiveview();

http.useNodeHandler(fastifyApp);

ws.on("connected", (connection) => {
  console.log(`Client connected: ${connection.connectionId}`);
});
