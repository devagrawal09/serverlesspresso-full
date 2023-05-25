import { data } from "@ampt/data";

export async function isStoreOpen() {
  const res = await data.get<boolean>("store:open");

  return res as boolean;
}

export async function openStore() {
  await data.set<boolean>("store:open", true);
}

export async function closeStore() {
  await data.set<boolean>("store:open", false);
}

export function onStoreUpdate(cb: (open: boolean) => void) {
  return data.on("*:store:open", ({ item }) => cb(item.value as boolean));
}
