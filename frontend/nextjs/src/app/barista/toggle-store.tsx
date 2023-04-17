"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export const ToggleStore = ({ open }: { open: boolean }) => {
  const router = useRouter();

  const { status, error, mutate } = useMutation(async function toggleStore() {
    const result = await fetch(
      `https://brilliant-idea-n2c95.ampt.app/barista/store`,
      {
        method: `PUT`,
      }
    );

    const data: { open: boolean } = await result.json();

    if (result.status !== 200) {
      console.log(data);
      throw new Error(
        `Failed to toggle store: ${result.status} ${result.statusText}`
      );
    }

    router.refresh();
  });

  return (
    <>
      <button
        className="bg-amber-700  rounded-2xl px-6 py-3 text-white font-bold text-xl hover:bg-amber-800 disabled:opacity-50"
        onClick={() => mutate()}
        disabled={status === "loading"}
      >
        {open ? "Close Store" : "Open Store"}
      </button>
    </>
  );
};
