import { RouteHandlerMethod, FastifyPluginAsync } from "fastify";
import {
  OrderNotFoundError,
  OrderAlreadyPreparedError,
  Orders,
} from "./orders";
import { Store } from "./store";
import { api, useCase } from "../arch";

export const BaristaApi = api<FastifyPluginAsync>(
  `BaristaApi`,
  async (fastify) => {
    const store = Store();
    const orders = Orders();

    fastify.get(
      "/barista/store",
      useCase<RouteHandlerMethod>(`GET barista/store`, async (req, res) => {
        try {
          const storeOpen = await store.isStoreOpen();
          return res.status(200).send({ open: storeOpen });
        } catch (e) {
          return res.status(500).send({ error: e });
        }
      })
    );

    fastify.put(
      "/barista/store",
      useCase<RouteHandlerMethod>(`PUT barista/store`, async (req, res) => {
        try {
          console.log("toggling store");
          const open = await store.isStoreOpen();
          console.log("open", open);

          if (open) {
            await store.closeStore();
          } else {
            await store.openStore();
          }

          return res.status(200).send({ open: !open });
        } catch (e) {
          return res.status(500).send({ error: e });
        }
      })
    );

    fastify.put(
      "/barista/orders/:id/prepare",
      useCase<RouteHandlerMethod>(
        `PUT barista/orders/:id/prepare`,
        async (req, res) => {
          const { id } = req.params as { id: string };

          const order = await orders.prepareOrder(id);

          if (order instanceof OrderNotFoundError) {
            return res.status(404).send({ error: order.message });
          }

          if (order instanceof OrderAlreadyPreparedError) {
            return res.status(400).send({ error: order.message });
          }

          return res.status(200).send({ status: "prepared", order });
        }
      )
    );

    return;
  }
);
