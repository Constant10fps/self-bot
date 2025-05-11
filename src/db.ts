import { kv } from "./mod.ts";

interface Reply {
  chatId: number;
  msgId: number;
}

const replyKey = (chatId: number, msgId: number) => ["reply", chatId, msgId];

export const getReply = async (chatId: number, msgId: number) =>
  (await kv.get<Reply>(replyKey(chatId, msgId))).value;

// creates a link between messages of two different chats
export const setReply = async (
  currentChatId: number,
  currentMsgId: number,
  chatId: number,
  msgId: number,
) =>
  await kv.set(
    replyKey(currentChatId, currentMsgId),
    { chatId, msgId } as Reply,
  );

export const removeReply = async (chatId: number, msgId: number) =>
  await kv.delete(replyKey(chatId, msgId));
