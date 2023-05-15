import { DateTime } from "luxon";
import { Order } from "../../../../../../../types/orders";

export default async function OrderPage({
  params,
}: {
  params: { orderId: string };
}) {
  const result = await fetch(
    `https://brilliant-idea-n2c95.ampt.app/customer/orders/${params.orderId}`
  );

  const data: Order = await result.json();

  if (result.status !== 200) {
    return <h1>Failed to load order</h1>;
  }

  return (
    <>
      <h1 className="text-3xl text-center mt-9">Orders</h1>
      <div className="border border-white mx-16 my-5 rounded">
        <div className="bg-amber-700 py-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.acouplecooks.com/wp-content/uploads/2021/08/How-to-make-espresso-009s.jpg"
            alt="Espresso"
            width={50}
            className="rounded-full ml-6"
          />
          <h2 className="text-2xl">Espresso ($4.99)</h2>
        </div>
        <div className="px-6 py-3">
          <p className="text-lg font-bold">
            {DateTime.fromISO(data.log[0].timestamp).toLocaleString(
              DateTime.DATETIME_MED
            )}
          </p>
          <p className="text-lg font-bold">Status: {data.status}</p>
        </div>
      </div>
    </>
  );
}
