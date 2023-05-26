import { data } from "@ampt/data";

async function isStoreOpen() {
  const res = await data.get<boolean>("store:open");

  return res as boolean;
}

async function openStore() {
  await data.set<boolean>("store:open", true);
}

async function closeStore() {
  await data.set<boolean>("store:open", false);
}

function onStoreUpdate(cb: (open: boolean) => void) {
  return data.on("*:store:open", ({ item }) => cb(item.value as boolean));
}

export const Store = {
  isStoreOpen,
  openStore,
  closeStore,
  onStoreUpdate,
};
