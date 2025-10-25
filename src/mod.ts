import {
  Bot,
  Context,
  GrammyError,
  InlineKeyboard,
  session,
  SessionFlavor,
} from "grammy";
import { DenoKVAdapter } from "grammy/storages/denokv";
import { getReply, isAllowed, setAllowed, setReply } from "./db.ts";

interface SessionData {
  status?: "msg";
}

type BotContext = Context & SessionFlavor<SessionData>;
export const bot = new Bot<BotContext>(Deno.env.get("TOKEN") || "");
export const kv = await Deno.openKv();
export const authorId = Number(Deno.env.get("AUTHOR"));

bot.use(session(
  {
    initial: () => ({}),
    storage: new DenoKVAdapter(kv),
  },
));

bot.chatType(["group", "supergroup"]).command("duty@moyaey", async (ctx) => {
  await ctx.reply(
    "Сегодня дежурит Ракутунавалуна Равелумпара Ромео и Моисеев Артем",
  );
});

bot.chatType(["group", "supergroup"]).on("message", async (ctx) => {
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    await ctx.api.sendMessage(
      authorId,
      `${member.status}`,
    );
  } catch (error) {
    const allowed = await isAllowed(ctx.from.id);
    if (error instanceof GrammyError && !allowed) {
      await ctx.api.sendMessage(
        authorId,
        `${ctx.from.first_name} ${ctx.from.id}`,
      );
      await ctx.deleteMessage();
    }
  }
});

bot.chatType("private").command("allow", async (ctx) => {
  const id = Number(ctx.match);
  await setAllowed(id);
  await ctx.react("⚡");
});

bot.chatType("private").command("allow_group", async (ctx) => {
  const id = Number(ctx.match);
  await setAllowed(id);
  await ctx.react("⚡");
});

bot.chatType("private").command("get", async (ctx) => {
  const [chatId, userId] = ctx.match.split(" ").map(Number);
  await ctx.reply((await ctx.api.getChatMember(chatId, userId)).status);
});

bot.chatType("private").command("ping", async (ctx) => {
  await ctx.reply("pong");
  await ctx.api.sendMessage(
    ctx.chat.id,
    `your id: ${ctx.from.id}, [${ctx.from.first_name}](tg://user?id=${ctx.from.id})`,
    { parse_mode: "Markdown" },
  );
});

bot.chatType("private").command("start", async (ctx) => {
  const reply_markup = new InlineKeyboard()
    .text("Анонимное сообщение", "msg");

  await ctx.reply("Это бот @constant0fps", { reply_markup });
});

bot.chatType("private").callbackQuery("msg", async (ctx) => {
  ctx.session.status = "msg";
  await ctx.reply("Жду сообщения");
});

bot.chatType("private")
  .filter((ctx) => ctx.session.status == "msg")
  .on("msg:text", async (ctx) => {
    ctx.session.status = undefined;
    const msg = await ctx.api.sendMessage(
      authorId,
      `Новое анонимное сообщение:\n<blockquote>${ctx.msg.text}</blockquote>`,
      { parse_mode: "HTML" },
    );
    await setReply(
      msg.chat.id,
      msg.message_id,
      ctx.chat.id,
      ctx.msg.message_id,
    );
    await ctx.reply("Сообщение отправлено");
  });

const isReply = (ctx: BotContext) =>
  ctx.chat?.type == "private" && ctx.message?.reply_to_message != undefined;

bot.filter(isReply).on("msg:text", async (ctx) => {
  const reply_msg = ctx.message?.reply_to_message;
  if (!reply_msg) return;
  const reply = await getReply(reply_msg.chat.id, reply_msg.message_id);
  if (!reply) return;

  const msg = await ctx.api.sendMessage(
    reply.chatId,
    `<blockquote>${ctx.msg.text}</blockquote>`,
    {
      parse_mode: "HTML",
      reply_parameters: { message_id: reply.msgId },
    },
  );
  await setReply(msg.chat.id, msg.message_id, ctx.chat.id, ctx.msg.message_id);
});

bot.catch(console.error);
