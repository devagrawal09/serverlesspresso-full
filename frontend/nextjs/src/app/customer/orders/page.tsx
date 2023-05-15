import { CustomerOrders } from "./orders";

export default async function CustomerOrderApp() {
  return (
    <>
      <header className="flex justify-between m-6">
        <h1 className="text-3xl">Serverlesspresso Orders</h1>
      </header>
      <main>
        <CustomerOrders />
      </main>
    </>
  );
}
