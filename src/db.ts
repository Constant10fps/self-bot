import { kv } from "./mod.ts";

export const isAllowed = async (id: number) =>
  (await kv.get<boolean>(["channel", id])).value ?? false;

export const setAllowed = async (id: number, allowed: boolean) =>
  await kv.set(["channel", id], allowed);
