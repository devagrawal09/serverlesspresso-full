const devMode = process.env.NODE_ENV === "development";

function model<T extends object>(name: string, val: T): T {
  if (!devMode) return val;

  // create a proxy that logs all accesses to the model
  return new Proxy(val, {
    get(target, prop) {
      console.log(`accessing ${name}.${prop.toString()}`);
      return Reflect.get(target, prop);
    },
  });
}

export const api = model;
export const useCase = model;
export const database = model;
export const subscription = model;
export const liveview = model;
