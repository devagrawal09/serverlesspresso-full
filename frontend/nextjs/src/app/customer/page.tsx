import Image from "next/image";
import { Inter } from "next/font/google";
import { OrderEspresso } from "./ordering";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-24">
      <h1 className="text-4xl">Welcome to the Serverlesspresso Cafe</h1>
      <OrderEspresso />
    </main>
  );
}
