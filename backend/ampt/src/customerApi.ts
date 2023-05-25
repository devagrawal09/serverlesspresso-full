import { FastifyPluginAsync } from "fastify";
import { OrderNotFoundError, getOrderById, placeOrder } from "./orders";
import { z } from "zod";
import { isStoreOpen } from "./store";
import { Container } from "../arch";

const placeOrderSchema = z.object({ userId: z.string() });

@Container("storefront")
export const storefrontApi: FastifyPluginAsync = async (fastify) => {
  fastify.post("/orders", async (req, res) => {
    try {
      const storeOpen = await isStoreOpen();

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

  fastify.get("/orders/:id", async (req, res) => {
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

  return;
};
