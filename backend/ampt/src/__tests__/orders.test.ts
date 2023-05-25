import { describe, expect, test } from "vitest";
import { faker } from "@faker-js/faker";

import {
  getOrderById,
  getOrdersByCustomerId,
  placeOrder,
  prepareOrder,
} from "../orders";
import { Order } from "../../../../types/orders";

describe("orders", () => {
  test("placeOrder", async () => {
    const order = await placeOrder({
      productId: "123",
      customerId: "456",
    });

    expect(order.customerId).toBe("456");
    expect(order.productId).toBe("123");

    expect(order.log).toHaveLength(1);
    expect(order.log[0].type).toBe("order placed");
  });

  test("order can be fetched after placing", async () => {
    const order = await placeOrder({
      productId: "123",
      customerId: "456",
    });

    const fetchedOrderOrError = await getOrderById(order.id);

    expect(fetchedOrderOrError).not.toBeInstanceOf(Error);
    expect((fetchedOrderOrError as Order).id).toBe(order.id);
  });

  test("order can be fetched by customer id", async () => {
    const fakeCustomerId = faker.string.uuid();

    await placeOrder({
      productId: "123",
      customerId: fakeCustomerId,
    });

    const orders = await getOrdersByCustomerId(fakeCustomerId);
    expect(orders).toHaveLength(1);
    expect(orders[0].customerId).toBe(fakeCustomerId);
    expect(orders[0].productId).toBe("123");
  });

  test("multiple orders can be fetched by customer id", async () => {
    const fakeCustomerId = faker.string.uuid();
    await placeOrder({
      productId: "123",
      customerId: fakeCustomerId,
    });

    await placeOrder({
      productId: "456",
      customerId: fakeCustomerId,
    });

    const orders = await getOrdersByCustomerId(fakeCustomerId);
    expect(orders).toHaveLength(2);
  });

  test("placed order can be prepared", async () => {
    const order = await placeOrder({
      productId: "123",
      customerId: "456",
    });

    const preparedOrder = await prepareOrder(order.id);

    expect(preparedOrder).not.toBeInstanceOf(Error);
    expect((preparedOrder as Order).status).toBe("prepared");
  });
});
