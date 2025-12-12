import { Bot, Context, session, SessionFlavor } from "grammy";
import { DenoKVAdapter } from "grammy/storages/denokv";
import { isAllowed, setAllowed } from "./db.ts";

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

bot.chatType(["group", "supergroup"]).on("message").use(async (ctx, next) => {
  const member = await ctx.getChatMember(ctx.from.id);
  if (member.status == "left" && !isAllowed(ctx.from.id)) {
    await ctx.api.sendMessage(
      authorId,
      `${ctx.from.first_name} ${ctx.from.id}`,
    );
    await ctx.deleteMessage();
  } else {
    await next();
  }
});

bot.chatType(["group", "supergroup"]).command("duty@moyaey", async (ctx) => {
  await ctx.reply(
    "Сегодня дежурит Ракутунавалуна Равелумпара Ромео и Моисеев Артем",
  );
});

bot.chatType("private").command("allow", async (ctx) => {
  const id = Number(ctx.match);
  await setAllowed(id, true);
  await ctx.react("⚡");
});

bot.chatType("private").command("allow_group", async (ctx) => {
  const id = Number(ctx.match);
  await setAllowed(id, true);
  await ctx.react("⚡");
});

bot.chatType("private").command("ping", async (ctx) => {
  await ctx.reply("pong");
  await ctx.api.sendMessage(
    ctx.chat.id,
    `your id: ${ctx.from.id}, [${ctx.from.first_name}](tg://user?id=${ctx.from.id})`,
    { parse_mode: "Markdown" },
  );
});

bot.catch(console.error);
