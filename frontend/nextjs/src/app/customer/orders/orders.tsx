"use client";

import { useMutation } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import {
  CustomerOrdersView,
  Order,
  OrderLiveViews,
} from "../../../../../../types/orders";

export function CustomerOrders() {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>();
  const socketRef = useRef<WebSocket>();

  useEffect(() => {
    const socket = new WebSocket("wss://brilliant-idea-n2c95.ampt.app/");
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      console.log("Socket opened");

      const message: OrderLiveViews = {
        view: "customer_orders",
        customerId: "devagrawal09",
      };

      socket.send(JSON.stringify(message));
    });

    socket.addEventListener("message", (event) => {
      const data: CustomerOrdersView = JSON.parse(event.data);

      console.log("Received message from socket", data);
      if (data.view !== "customer_orders") return;
      if (!data.orders) return;

      console.log(data);

      setOrders(data.orders);
      setIsLoading(false);
    });

    return () =>
      socket.close(1000, "Closing socket because the component unmounted");
  }, []);

  const { status, mutate: cancelOrder } = useMutation(
    async function cancelOrder(order: Order) {
      console.log("Preparing order", order);

      const res = await fetch(
        `https://brilliant-idea-n2c95.ampt.app/customer/orders/${order.id}/cancel`,
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
  );

  return (
    <>
      <h2 className="text-2xl text-center">Orders</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {orders?.map((order) => (
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
                  <span className="font-bold">User ID:</span> {order.customerId}
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
                <button
                  className="bg-amber-700 p-3 rounded"
                  onClick={() => cancelOrder(order)}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Cancelling..." : "Cancel"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
