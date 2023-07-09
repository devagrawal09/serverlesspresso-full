import {
  Order,
  OrderLiveViews,
  CustomerOrdersView,
  BaristaOrdersView,
} from "../../../../types/orders";

function baristaApiClient(url: string) {
  async function getStore() {
    const res = await fetch(`${url}/store`);
    const result: { open: boolean } = await res.json();
    return result;
  }

  async function toggleStore() {
    const res = await fetch(`${url}/store`, {
      method: "PUT",
    });
    const result: { open: boolean } = await res.json();
    return result;
  }

  async function prepareOrder(id: string) {
    const res = await fetch(`${url}/prepare/${id}`, {
      method: "PUT",
    });
    return await res.json();
  }

  return { getStore, toggleStore, prepareOrder };
}

function customerApiClient(url: string) {
  async function placeOrder(userId: string) {
    const res = await fetch(`${url}/customer/orders`, {
      method: "POST",
      body: JSON.stringify({ userId }),
      headers: { "Content-Type": "application/json" },
    });
    return (await res.json()) as Order;
  }

  async function getOrder(id: string) {
    const res = await fetch(`${url}/customer/orders/${id}`);
    return (await res.json()) as Order;
  }

  async function cancelOrder(id: string) {
    const res = await fetch(`${url}/customer/orders/${id}`, {
      method: "DELETE",
    });
    return (await res.json()) as Order;
  }

  return { placeOrder, getOrder, cancelOrder };
}

function customerLiveview(url: string) {
  function subscribe(customerId: string, callback: (orders: Order[]) => void) {
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
      const data: CustomerOrdersView = JSON.parse(event.data);

      console.log("Received message from socket", data);
      if (data.view !== "customer_orders") return;
      if (!data.orders) return;

      console.log(data);

      callback(data.orders);
    });

    return () => socket.close(1000, "Cleanup");
  }

  return { subscribe };
}

function baristaLiveview(url: string) {
  function subscribe(callback: (orders: Order[]) => void) {
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
  }

  return { subscribe };
}

export function createServerlesspressoClient(url: string) {
  return {
    barista: baristaApiClient(`${url}/barista`),
    customer: customerApiClient(`${url}/customer`),
    customerLiveview: customerLiveview(url),
    baristaLiveview: baristaLiveview(url),
  };
}
