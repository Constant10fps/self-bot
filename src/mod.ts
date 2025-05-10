import { Bot, Context, InlineKeyboard, session, SessionFlavor } from "grammy";
import { DenoKVAdapter } from "grammy/storages/denokv";
import { getReply, removeReply, setReply } from "./db.ts";

interface SessionData {
  status?: "anon" | "signed" | "reply";
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

bot.chatType("private").command("start", async (ctx) => {
  ctx.session.status = undefined;
  const reply_markup = new InlineKeyboard()
    .text("Отправить анонимное сообщение", "anon")
    .row()
    .text("Отправить подписанное сообщение", "signed");

  await ctx.reply(
    "Доброго времени суток! Это бот для контакта @constant0fps, выбери способ контакта",
    { reply_markup },
  );
});

bot.chatType("private").callbackQuery("anon", async (ctx) => {
  ctx.session.status = "anon";
  await ctx.reply("Напиши сообщение, которое нужно отправить");
});

bot.chatType("private").callbackQuery("signed", async (ctx) => {
  ctx.session.status = "signed";
  await ctx.reply("Напиши сообщение, которое нужно отправить");
});

const isAuthor = (ctx: BotContext) => ctx.from?.id == authorId;
bot.chatType("private").filter(isAuthor)
  .callbackQuery(/reply:.+_.+/, async (ctx) => {
    const ids = ctx.callbackQuery.data.split(":")[1].split("_");
    const chatId = Number(ids[0]), msgId = Number(ids[1]);

    await setReply(chatId, msgId);
    ctx.session.status = "reply";
    await ctx.reply("Жду ответа");
  });

bot.chatType("private").filter(isAuthor)
  .filter((ctx) => ctx.session.status == "reply")
  .on("msg:text", async (ctx) => {
    ctx.session.status = undefined;
    const reply = await getReply();
    if (!reply) return;
    await ctx.api.sendMessage(
      reply.chatId,
      `Ответ автора:\n<blockquote>${ctx.msg.text}</blockquote>`,
      { reply_parameters: { message_id: reply.msgId }, parse_mode: "HTML" },
    );
    await ctx.reply("Ответ отправлен.");
    await removeReply();
  });

bot.chatType("private").on("msg:text", async (ctx) => {
  if (!ctx.session.status) {
    await ctx.reply("Укажи тип сообщения с помощью /start");
    return;
  }
  const reply_markup = new InlineKeyboard()
    .text("Ответить", `reply:${ctx.from.id}_${ctx.msgId}`);

  await ctx.api.sendMessage(
    authorId,
    `Новое сообщение${
      ctx.session.status == "anon"
        ? " (анонимное)"
        : ` от @${ctx.from.username}`
    }:\n<blockquote>${ctx.message.text}</blockquote>`,
    { reply_markup, parse_mode: "HTML" },
  );

  ctx.session.status = undefined;
  await ctx.reply("Сообщение отправлено.");
});

bot.catch(console.error);
