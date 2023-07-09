import { FastifyPluginAsync } from "fastify";
import {
  OrderAlreadyPreparedError,
  OrderNotFoundError,
  Orders,
} from "./orders";
import { z } from "zod";
import { Store } from "./store";

const placeOrderSchema = z.object({
  customerId: z.string(),
  productId: z.string(),
});

export const CustomerApi: FastifyPluginAsync = async (fastify) => {
  const store = Store;
  const orders = Orders;

  fastify.post("/orders", async (req, res) => {
    try {
      const storeOpen = await store.isStoreOpen();

      if (!storeOpen) {
        return res.status(400).send("Store is closed");
      }

      const body = req.body;
      const result = placeOrderSchema.safeParse(body);

      if (!result.success) {
        return res.status(400).send(result.error.toString());
      }

      const { customerId, productId } = result.data;

      const order = await orders.placeOrder(result.data);

      return res.status(201).send(order);
    } catch (e) {
      console.error({ e });
      return res.status(500).send(e.message);
    }
  });

  fastify.get("/orders/:id", async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      const order = await orders.getOrderById(id);

      if (order instanceof OrderNotFoundError) {
        return res.status(404).send(order.message);
      }
      return res.status(200).send(order);
    } catch (e) {
      return res.status(500).send(e.message);
    }
  });

  fastify.delete("/orders/:id", async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      const order = await orders.cancelOrder(id);

      if (order instanceof OrderNotFoundError) {
        return res.status(404).send(order.message);
      }

      if (order instanceof OrderAlreadyPreparedError) {
        return res.status(400).send(order.message);
      }

      return res.status(200).send(order);
    } catch (e) {
      return res.status(500).send(e.message);
    }
  });

  return;
};
