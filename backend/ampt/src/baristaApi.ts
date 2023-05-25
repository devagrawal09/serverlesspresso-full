import { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  prepareOrder,
  OrderNotFoundError,
  OrderAlreadyPreparedError,
} from "./orders";
import { closeStore, isStoreOpen, openStore } from "./store";
import { Container } from "../arch";

@Container("barista")
export class BaristaAPI {
  baristaApi(fastify: FastifyInstance) {
    fastify.get("/barista/store", async (req, res) => {
      try {
        const storeOpen = await isStoreOpen();
        return res.status(200).send({ open: storeOpen });
      } catch (e) {
        return res.status(500).send({ error: e });
      }
    });

    fastify.put("/barista/store", async (req, res) => {
      try {
        console.log("toggling store");
        const open = await isStoreOpen();
        console.log("open", open);

        if (open) {
          await closeStore();
        } else {
          await openStore();
        }

        return res.status(200).send({ open: !open });
      } catch (e) {
        return res.status(500).send({ error: e });
      }
    });

    fastify.put("/barista/orders/:id/prepare", async (req, res) => {
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

    return;
  }
}
