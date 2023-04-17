import { BaristaOrders } from "./orders";
import { ToggleStore } from "./toggle-store";

export default async function BaristaApp() {
  const result = await fetch(
    `https://brilliant-idea-n2c95.ampt.app/barista/store`,
    {
      cache: "no-store",
    }
  );

  const data: { open: boolean } = await result.json();

  if (result.status !== 200) {
    console.log(data);
    return (
      <>
        <h1>Failed to load store</h1>
      </>
    );
  }

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
