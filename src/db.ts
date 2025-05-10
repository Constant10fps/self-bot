import { kv } from "./mod.ts";

interface Reply {
  chatId: number;
  msgId: number;
}

export const getReply = async () => (await kv.get<Reply>(["reply"])).value;
export const setReply = async (chatId: number, msgId: number) =>
  await kv.set(["reply"], { chatId, msgId } as Reply);
export const removeReply = async () => await kv.delete(["reply"]);
