import { FastifyPluginAsync } from "fastify";
import {
  OrderNotFoundError,
  OrderAlreadyPreparedError,
  Orders,
  OrderAlreadyPickedUp,
  OrderAlreadyPreparingError,
} from "./orders";
import { Store } from "./store";

export const BaristaApi: FastifyPluginAsync = async (fastify) => {
  const store = Store;
  const orders = Orders;

  fastify.get("/store", async (req, res) => {
    try {
      const storeOpen = await store.isStoreOpen();
      return res.status(200).send({ open: storeOpen });
    } catch (e) {
      return res.status(500).send(e);
    }
  });

  fastify.put("/store", async (req, res) => {
    try {
      const open = await store.isStoreOpen();

      if (open) {
        await store.closeStore();
      } else {
        await store.openStore();
      }

      return res.status(200).send({ open: !open });
    } catch (e) {
      return res.status(500).send(e);
    }
  });

  fastify.put("/preparing/:id", async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      const order = await orders.markOrderAsPreparing(id);

      if (order instanceof OrderNotFoundError) {
        return res.status(404).send(order.message);
      }

      if (order instanceof OrderAlreadyPreparingError) {
        return res.status(400).send(order.message);
      }

      return res.status(200).send(order);
    } catch (e) {
      return res.status(500).send(e.message);
    }
  });

  fastify.put("/prepared/:id", async (req, res) => {
    const { id } = req.params as { id: string };

    const order = await orders.markOrderAsPrepared(id);

    if (order instanceof OrderNotFoundError) {
      return res.status(404).send(order.message);
    }

    if (order instanceof OrderAlreadyPreparedError) {
      return res.status(400).send(order.message);
    }

    return res.status(200).send(order);
  });

  fastify.put("/picked-up/:id", async (req, res) => {
    const { id } = req.params as { id: string };

    const order = await orders.markOrderAsPickedUp(id);

    if (order instanceof OrderNotFoundError) {
      return res.status(404).send(order.message);
    }

    if (order instanceof OrderAlreadyPickedUp) {
      return res.status(400).send(order.message);
    }

    return res.status(200).send(order);
  });

  fastify.put("/cancel/:id", async (req, res) => {
    const { id } = req.params as { id: string };

    const order = await orders.cancelOrder(id);

    if (order instanceof OrderNotFoundError) {
      return res.status(404).send(order.message);
    }

    if (order instanceof OrderAlreadyPickedUp) {
      return res.status(400).send(order.message);
    }

    return res.status(200).send(order);
  });

  return;
};
