const devMode = process.env.NODE_ENV === "development";

function model<T extends Function>(name: string, val: T): T {
  return val;
}

export const api = model;
export const useCase = model;
export const database = model;
export const subscription = model;
export const liveview = model;
