"use client";

import { useMutation } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { Order } from "../../../../../../types/orders";
import { client } from "@/app/client";

export function CustomerOrders() {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>();

  useEffect(
    () => client.customerLiveview.subscribe(`devagrawal09`, setOrders),
    []
  );

  const { status, mutate: cancelOrder } = useMutation(
    client.customer.cancelOrder
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
                  onClick={() => cancelOrder(order.id)}
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
