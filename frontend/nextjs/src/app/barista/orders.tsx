"use client";

import { useMutation } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import {
  BaristaOrdersView,
  Order,
  OrderLiveViews,
} from "../../../../../types/orders";

async function prepareOrder(order: Order) {
  console.log("Preparing order", order);

  const res = await fetch(
    `https://brilliant-idea-n2c95.ampt.app/barista/orders/${order.id}/prepare`,
    {
      method: "PUT",
    }
  );
  console.log("Response from server", res);
  if (!res.ok) {
    console.error("Failed to prepare order");
    return;
  }
}

async function pickupOrder(order: Order) {
  console.log("Picking up order", order);

  const res = await fetch(
    `https://brilliant-idea-n2c95.ampt.app/barista/orders/${order.id}/pickup`,
    {
      method: "PUT",
    }
  );
  console.log("Response from server", res);
  if (!res.ok) {
    console.error("Failed to prepare order");
    return;
  }
}

export function BaristaOrders() {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>();

  const socketRef = useRef<WebSocket>();

  useEffect(() => {
    const socket = new WebSocket("wss://brilliant-idea-n2c95.ampt.app");
    socketRef.current = socket;

    const message: OrderLiveViews = { view: "barista_orders" };

    socket.addEventListener("open", () => {
      console.log("Socket opened");
      socket.send(JSON.stringify(message));
    });

    socket.addEventListener("message", (event) => {
      const data: BaristaOrdersView = JSON.parse(event.data);

      if (data.view !== "barista_orders") return;
      if (!data.orders) return;

      setOrders(data.orders);
      setIsLoading(false);
    });

    return () =>
      socket.close(1000, "Closing socket because the component unmounted");
  }, []);

  const {
    status: prepareStatus,
    mutate: prepareOrderMutation,
    variables: prepareVariables,
  } = useMutation(prepareOrder);

  const {
    status: pickupStatus,
    mutate: pickupOrderMutation,
    variables: pickupVariables,
  } = useMutation(pickupOrder);

  return (
    <>
      <h2 className="text-2xl text-center">Orders</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {orders?.length ? (
            orders.map((order) => (
              <li
                key={order.id}
                className="border border-white mx-16 my-5 rounded"
              >
                <div className="bg-amber-700 py-6 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://www.acouplecooks.com/wp-content/uploads/2021/08/How-to-make-espresso-009s.jpg"
                    alt="Espresso"
                    width={50}
                    className="rounded-full ml-6"
                  />
                  <h2 className="text-2xl">Espresso ($4.99)</h2>
                  <p>
                    <span className="font-bold">User ID:</span>{" "}
                    {order.customerId}
                  </p>
                </div>
                <div className="px-6 py-3 flex justify-between">
                  <div>
                    <p className="text-lg font-bold">
                      {DateTime.fromISO(order.log[0].timestamp).toLocaleString(
                        DateTime.DATETIME_MED
                      )}
                    </p>
                    <p className="text-lg font-bold">Status: {order.status}</p>
                  </div>
                  {order.status === "placed" ? (
                    <button
                      className="bg-amber-700 p-3 rounded disabled:opacity-75"
                      onClick={() => prepareOrderMutation(order)}
                      disabled={
                        prepareStatus === "loading" &&
                        prepareVariables?.id === order.id
                      }
                    >
                      {prepareStatus === "loading" &&
                      prepareVariables?.id === order.id
                        ? "Preparing..."
                        : "Prepared"}
                    </button>
                  ) : order.status === "prepared" ? (
                    <button
                      className="bg-amber-700 p-3 rounded disabled:opacity-75"
                      onClick={() => pickupOrderMutation(order)}
                      disabled={
                        pickupStatus === "loading" &&
                        pickupVariables?.id === order.id
                      }
                    >
                      {pickupStatus === "loading" &&
                      pickupVariables?.id === order.id
                        ? "Picking up..."
                        : "Picked up"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))
          ) : (
            <p className="text-center">No orders</p>
          )}
        </ul>
      )}
    </>
  );
}
