import type { BaristaOrdersView } from "../../types/orders";
import type {
  CustomerOrderView,
  Order,
  OrderLiveViews,
} from "../../types/orders";

async function myFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (res.status >= 400) {
    throw new Error(await res.text());
  }
  return res;
}

function myWs(url: string) {
  const socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    console.log("connected");
  });

  function on(cb: (m) => void) {
    socket.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);
      cb(data);
    });
  }

  function send(m: OrderLiveViews | "close") {
    socket.send(JSON.stringify(m));
  }

  return { on, send };
}

function baristaApiClient(url: string, f: typeof myFetch) {
  return {
    async getStore() {
      const res = await f(`${url}/barista/store`);
      const result: { open: boolean } = await res.json();
      return result;
    },
    async toggleStore() {
      const res = await f(`${url}/barista/store`, {
        method: "PUT",
      });
      const result: { open: boolean } = await res.json();
      return result;
    },
    async markOrderAsPreparing(id: string) {
      const res = await f(`${url}/barista/preparing/${id}`, {
        method: "PUT",
      });
      return (await res.json()) as Order;
    },
    async markOrderAsPrepared(id: string) {
      const res = await f(`${url}/barista/prepared/${id}`, {
        method: "PUT",
      });
      return (await res.json()) as Order;
    },
    async markOrderAsPickedUp(id: string) {
      const res = await f(`${url}/barista/picked-up/${id}`, {
        method: "PUT",
      });
      return (await res.json()) as Order;
    },
    async cancelOrder(id: string) {
      const res = await f(`${url}/barista/cancel/${id}`, {
        method: "PUT",
      });
      return (await res.json()) as Order;
    },
  };
}

function customerApiClient(url: string, f: typeof myFetch) {
  async function placeOrder(customerId: string, productId: string) {
    const res = await f(`${url}/customer/orders`, {
      method: "POST",
      body: JSON.stringify({ customerId, productId }),
      headers: { "Content-Type": "application/json" },
    });
    return (await res.json()) as Order;
  }

  async function getOrder(id: string) {
    const res = await f(`${url}/customer/orders/${id}`);
    return (await res.json()) as Order;
  }

  async function cancelOrder(id: string) {
    const res = await f(`${url}/customer/orders/${id}`, {
      method: "DELETE",
    });
    return (await res.json()) as Order;
  }

  async function getOrders(customerId: string) {
    const res = await f(`${url}/customer/${customerId}/orders`);
    return (await res.json()) as Order[];
  }

  return { placeOrder, getOrder, cancelOrder, getOrders };
}

function customerLiveview(
  on: (cb: (m: CustomerOrderView) => void) => void,
  send: (m: OrderLiveViews | "close") => void
) {
  return {
    subscribe(
      customerId: string,
      orderId: string,
      callback: (order: Order) => void
    ) {
      send({ view: "customer_order", customerId, orderId });

      on((data) => {
        // console.log("Received message from socket", data);
        if (data.view !== "customer_order") return;
        if (!data.order) return;
        if (data.order.id !== orderId) return;

        callback(data.order);
      });

      return () => send("close");
    },
  };
}

function baristaLiveview(
  on: (cb: (m: BaristaOrdersView) => void) => void,
  send: (m: OrderLiveViews | "close") => void
) {
  return {
    subscribe(callback: (orders: Order[]) => void) {
      send({ view: "barista_orders" });

      on((data) => {
        // console.log("Received message from socket", data);
        if (data.view !== "barista_orders") return;
        if (!data.orders) return;

        callback(data.orders);
      });

      return () => send("close");
    },
  };
}

export function createServerlesspressoClient(
  httpUrl: string,
  wsUrl: string,
  f = myFetch,
  w = myWs
) {
  const { on, send } = w(wsUrl);
  return {
    barista: baristaApiClient(httpUrl, f),
    customer: customerApiClient(httpUrl, f),
    customerLiveview: customerLiveview(on, send),
    baristaLiveview: baristaLiveview(on, send),
  };
}
