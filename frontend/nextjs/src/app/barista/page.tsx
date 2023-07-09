import { client } from "../client";
import { BaristaOrders } from "./orders";
import { ToggleStore } from "./toggle-store";

export default async function BaristaApp() {
  const data = await client.barista.getStore();
  console.log({ data });
  return (
    <>
      <header className="flex justify-between m-6">
        <h1 className="text-3xl">Serverlesspresso Barista</h1>
        <ToggleStore open={data.open} />
      </header>
      <main>
        {data.open ? (
          <BaristaOrders />
        ) : (
          <h2 className="text-2xl text-center">
            Store is closed, please open to start accepting orders
          </h2>
        )}
      </main>
    </>
  );
}
