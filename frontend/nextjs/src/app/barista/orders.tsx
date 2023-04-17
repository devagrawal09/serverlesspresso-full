"use client";

import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";

type OrderItem = {
  key: string;
  created: string;
  modified: string;
  value: {
    id: string;
    status: string;
    userId: string;
  };
};
type OrderItemsMessage = {
  view: "barista_orders";
  data: {
    items: OrderItem[];
  };
};

export function BaristaOrders() {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderItem[]>();
  const socketRef = useRef<WebSocket>();

  useEffect(() => {
    const socket = new WebSocket("wss://brilliant-idea-n2c95.ampt.app/_ws");
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      console.log("Socket opened");
      socket.send(
        JSON.stringify({
          action: "subscribe",
          view: "barista_orders",
        })
      );
    });

    socket.addEventListener("message", (event) => {
      // const message = messageSchema.parse(JSON.parse(event.data));
      const data: OrderItemsMessage = JSON.parse(event.data);
      console.log("Received message from socket", data);
      if (data.view !== "barista_orders") return;
      if (!data.data) return;

      console.log(data);

      setOrders(data.data.items);
      setIsLoading(false);
    });

    return () =>
      socket.close(1000, "Closing socket because the component unmounted");
  }, []);

  function prepareOrder(order: OrderItem) {
    console.log("Preparing order", order);
    console.log("Sending message to socket", socketRef.current);

    socketRef.current?.send(
      JSON.stringify({
        action: "prepare_order",
        data: order.value.id,
      })
    );
  }

  return (
    <>
      <h2 className="text-2xl text-center">Orders</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {orders?.map((order) => (
            <li
              key={order.key}
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
                  {order.value.userId}
                </p>
              </div>
              <div className="px-6 py-3 flex justify-between">
                <div>
                  <p className="text-lg font-bold">
                    {DateTime.fromISO(order.created).toLocaleString(
                      DateTime.DATETIME_MED
                    )}
                  </p>
                  <p className="text-lg font-bold">
                    Status: {order.value.status}
                  </p>
                </div>
                <button
                  className="bg-amber-700 p-3 rounded"
                  onClick={() => prepareOrder(order)}
                >
                  Prepared
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
