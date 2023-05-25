import { updateBaristaView } from "./baristaLiveview";
import { updateCustomerView } from "./customerLiveview";
import { onOrderUpdate } from "./orders";

export const setupOrderSubscriptions = () => {
  onOrderUpdate(async (e, o) => {
    updateBaristaView();
    updateCustomerView(o.customerId);
  });
};
