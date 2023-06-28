"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { client } from "../client";

type Order = {
  id: string;
  userId: string;
  status: "placed" | "prepared" | "pickedup" | "cancelled";
};

export const OrderEspresso = () => {
  const [selectedEspresso, setSelected] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const { status, error, mutate } = useMutation(async function placeOrder() {
    setOrdering(true);
    const userId = `devagrawal09`;

    const data = await client.customer.placeOrder(userId);

    router.push(`/customer/orders/${data.id}`);
  });

  const router = useRouter();

  return (
    <>
      <div
        className={`flex rounded-2xl cursor-pointer hover:scale-105 transition ${
          selectedEspresso ? "bg-amber-800 scale-105" : "bg-amber-700"
        }`}
        onClick={() => setSelected(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.acouplecooks.com/wp-content/uploads/2021/08/How-to-make-espresso-009s.jpg"
          alt="Espresso"
          width={120}
          className="rounded-full m-3"
        />
        <p className="flex items-center justify-center flex-col px-10">
          <span className="text-2xl">Espresso</span>
          <span className="text-xl">$4.99</span>
        </p>
      </div>

      {selectedEspresso && (
        <div className="flex flex-col items-center gap-10 py-24 px-10">
          <h3>Are you sure you want to place this order?</h3>
          <div className="flex flex-row gap-10">
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              disabled={ordering}
              onClick={() => mutate()}
            >
              Yes
            </button>
            <button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => setSelected(false)}
            >
              No
            </button>
          </div>
        </div>
      )}
    </>
  );
};
