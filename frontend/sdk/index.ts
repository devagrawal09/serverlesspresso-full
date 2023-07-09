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
      return await res.json();
    },
    async markOrderAsPrepared(id: string) {
      const res = await f(`${url}/barista/prepared/${id}`, {
        method: "PUT",
      });
      return await res.json();
    },
    async markOrderAsPickedUp(id: string) {
      const res = await f(`${url}/barista/picked-up/${id}`, {
        method: "PUT",
      });
      return await res.json();
    },
    async cancelOrder(id: string) {
      const res = await f(`${url}/barista/cancel/${id}`, {
        method: "PUT",
      });
      return await res.json();
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

function customerLiveview(url: string) {
  return {
    subscribe(customerId: string, callback: (order: Order) => void) {
      // replace http with ws or https with wss
      const wsUrl = url.replace(/^http/, "ws");
      const socket = new WebSocket(wsUrl);

      socket.addEventListener("open", () => {
        console.log("Socket opened");

        const message: OrderLiveViews = {
          view: "customer_orders",
          customerId,
        };

        socket.send(JSON.stringify(message));
      });

      socket.addEventListener("message", (event) => {
        const data: CustomerOrderView = JSON.parse(event.data);

        console.log("Received message from socket", data);
        if (data.view !== "customer_order") return;
        if (!data.order) return;

        console.log(data);

        callback(data.order);
      });

      return () => socket.close(1000, "Cleanup");
    },
  };
}

function baristaLiveview(url: string) {
  return {
    subscribe(callback: (orders: Order[]) => void) {
      // replace http with ws or https with wss
      const wsUrl = url.replace(/^http/, "ws");
      const socket = new WebSocket(wsUrl);

      socket.addEventListener("open", () => {
        console.log("Socket opened");

        const message: OrderLiveViews = {
          view: "barista_orders",
        };

        socket.send(JSON.stringify(message));
      });

      socket.addEventListener("message", (event) => {
        const data: BaristaOrdersView = JSON.parse(event.data);

        console.log("Received message from socket", data);

        if (data.view !== "barista_orders") return;
        if (!data.orders) return;

        console.log(data);

        callback(data.orders);
      });

      return () => socket.close(1000, "Cleanup");
    },
  };
}

export function createServerlesspressoClient(url: string, f = myFetch) {
  return {
    barista: baristaApiClient(url, f),
    customer: customerApiClient(url, f),
    customerLiveview: customerLiveview(url),
    baristaLiveview: baristaLiveview(url),
  };
}
