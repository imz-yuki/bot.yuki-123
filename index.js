// ============================================
//   MEO BOT 🐱 — Discord Bot (JavaScript)
//   discord.js v14 | Deploy Railway/Replit
// ============================================

const { Client, GatewayIntentBits, EmbedBuilder,
        PermissionFlagsBits, ActivityType, Collection } = require("discord.js");
const fs   = require("fs");
const path = require("path");

// ─── Client ──────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
});

client.commands = new Collection();

// ─── Config ──────────────────────────────────────────────────────────────────
const PREFIX   = process.env.PREFIX   || "m!";
const TOKEN    = process.env.TOKEN;
const BOT_NAME = "Meo Bot 🐱";

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  PINK:   0xFF6FA0,
  CYAN:   0x5AE4FF,
  GOLD:   0xE8C76A,
  GREEN:  0x4DFFA0,
  RED:    0xFF5555,
  PURPLE: 0xB07DFF,
  BLUE:   0x5865F2,
};

// ─── Data (JSON files) ───────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const WARN_FILE = path.join(DATA_DIR, "warnings.json");
const ECO_FILE  = path.join(DATA_DIR, "economy.json");

let warnings = {};
let economy  = {};

function loadData() {
  if (fs.existsSync(WARN_FILE)) warnings = JSON.parse(fs.readFileSync(WARN_FILE));
  if (fs.existsSync(ECO_FILE))  economy  = JSON.parse(fs.readFileSync(ECO_FILE));
}

function saveData() {
  fs.writeFileSync(WARN_FILE, JSON.stringify(warnings, null, 2));
  fs.writeFileSync(ECO_FILE,  JSON.stringify(economy,  null, 2));
}

function getUser(userId) {
  const id = String(userId);
  if (!economy[id]) economy[id] = { coins: 0, dailyClaimed: "" };
  return economy[id];
}

// ─── Embed helper ────────────────────────────────────────────────────────────
function em(title, desc = "", color = C.PINK, footer = null) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc || null)
    .setColor(color)
    .setFooter({ text: footer || `Meo Bot 🐱 • ${PREFIX}help` })
    .setTimestamp();
}

// ─── Format number ───────────────────────────────────────────────────────────
function fmt(n) {
  return n.toLocaleString("vi-VN");
}

// ─── Rank helpers ─────────────────────────────────────────────────────────────
function bountyRank(n) {
  if (n >= 1e9)  return ["💀 LEGENDARY",    C.GOLD];
  if (n >= 5e8)  return ["🔴 WARLORD",      C.RED];
  if (n >= 1e8)  return ["🟠 EMPEROR",      0xFF9F4A];
  if (n >= 5e7)  return ["🟡 ELITE",        C.GOLD];
  if (n >= 1e7)  return ["🔵 VETERAN",      C.CYAN];
  if (n >= 1e6)  return ["🟣 HUNTER",       C.PURPLE];
  if (n >= 1e5)  return ["⚪ ROOKIE",        0xBDBDBD];
  return                 ["⬛ PEASANT",       0x555555];
}

// ══════════════════════════════════════════════════════════════════════════════
//  EVENTS
// ══════════════════════════════════════════════════════════════════════════════

client.once("ready", () => {
  loadData();
  console.log("╔════════════════════════════════╗");
  console.log(`║  🐱 MEO BOT online!             ║`);
  console.log(`║  Tag: ${client.user.tag.padEnd(25)}║`);
  console.log(`║  Servers: ${String(client.guilds.cache.size).padEnd(22)}║`);
  console.log("╚════════════════════════════════╝");

  const statuses = [
    { type: ActivityType.Watching,  name: `mọi người 🐱 | ${PREFIX}help` },
    { type: ActivityType.Listening, name: `${PREFIX}help` },
    { type: ActivityType.Playing,   name: "Pokémon 3D Skins" },
    { type: ActivityType.Watching,  name: "Aurramon shop 🛍️" },
    { type: ActivityType.Listening, name: "tiếng meo 😺" },
  ];
  let si = 0;
  const setStatus = () => {
    const s = statuses[si % statuses.length];
    client.user.setActivity(s.name, { type: s.type });
    si++;
  };
  setStatus();
  setInterval(setStatus, 3 * 60 * 1000);
});

// Welcome
client.on("guildMemberAdd", async (member) => {
  const ch = member.guild.channels.cache.find(
    c => ["welcome","chào-mừng","general","chung"].includes(c.name)
  ) || member.guild.systemChannel;
  if (!ch) return;
  const e = em(`🎉 Chào mừng ${member.displayName}!`,
    `${member} vừa tham gia **${member.guild.name}**!\n🐱 Meo Bot chào đón bạn~\nServer hiện có **${member.guild.memberCount}** thành viên!`,
    C.GREEN);
  e.setThumbnail(member.displayAvatarURL({ size: 256 }));
  ch.send({ embeds: [e] }).catch(() => {});
});

// Goodbye
client.on("guildMemberRemove", async (member) => {
  const ch = member.guild.channels.cache.find(
    c => ["goodbye","tạm-biệt","general"].includes(c.name)
  ) || member.guild.systemChannel;
  if (!ch) return;
  const e = em(`😢 Tạm biệt ${member.displayName}`,
    `**${member.user.tag}** đã rời khỏi server.\nServer còn lại **${member.guild.memberCount}** thành viên.`,
    C.RED);
  e.setThumbnail(member.displayAvatarURL({ size: 256 }));
  ch.send({ embeds: [e] }).catch(() => {});
});

// ══════════════════════════════════════════════════════════════════════════════
//  MESSAGE HANDLER
// ══════════════════════════════════════════════════════════════════════════════

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const args    = msg.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  // ── Error handler ──────────────────────────────────────────────────────────
  const reply = async (embed) => msg.reply({ embeds: [embed] }).catch(() => {});
  const errPerm = () => reply(em("❌ Thiếu quyền", "Bạn không có quyền dùng lệnh này!", C.RED));
  const errBot  = () => reply(em("❌ Bot thiếu quyền", "Bot cần thêm quyền để thực hiện!", C.RED));

  // ── Member fetch ───────────────────────────────────────────────────────────
  const getMember = async (query) => {
    if (!query) return null;
    const id = query.replace(/[<@!>]/g, "");
    return msg.guild.members.fetch(id).catch(() => null);
  };

  // ════════════════════════════════════════════════════════════════════════════
  //  HELP
  // ════════════════════════════════════════════════════════════════════════════

  if (command === "help" || command === "h") {
    const cats = {
      info: {
        name: "ℹ️ Info",
        cmds: [
          [`\`${PREFIX}ping\``,             "Kiểm tra độ trễ"],
          [`\`${PREFIX}info\``,             "Thông tin bot"],
          [`\`${PREFIX}serverinfo\``,       "Thông tin server"],
          [`\`${PREFIX}userinfo [@u]\``,    "Thông tin người dùng"],
          [`\`${PREFIX}avatar [@u]\``,      "Xem avatar"],
        ],
      },
      fun: {
        name: "🎉 Fun",
        cmds: [
          [`\`${PREFIX}meo\``,              "Meo! 🐱"],
          [`\`${PREFIX}say <msg>\``,        "Bot nói lại"],
          [`\`${PREFIX}8ball <câu hỏi>\``,  "Quả cầu ma thuật"],
          [`\`${PREFIX}roll [xdy]\``,       "Tung xúc xắc"],
          [`\`${PREFIX}coinflip\``,         "Tung đồng xu"],
          [`\`${PREFIX}rps <k/g/b>\``,      "Kéo Búa Bao"],
          [`\`${PREFIX}choose <a|b|c>\``,   "Chọn ngẫu nhiên"],
          [`\`${PREFIX}quote\``,            "Trích dẫn hay"],
          [`\`${PREFIX}love @u\``,          "% tình yêu"],
          [`\`${PREFIX}hug @u\``,           "Ôm ai đó"],
          [`\`${PREFIX}pat @u\``,           "Xoa đầu"],
          [`\`${PREFIX}slap @u\``,          "Tát ai đó"],
          [`\`${PREFIX}trivia\``,           "Câu hỏi kiến thức"],
          [`\`${PREFIX}wyr\``,              "Would You Rather?"],
        ],
      },
      mod: {
        name: "🔨 Moderation",
        cmds: [
          [`\`${PREFIX}kick @u [lý do]\``,  "Kick thành viên"],
          [`\`${PREFIX}ban @u [lý do]\``,   "Ban thành viên"],
          [`\`${PREFIX}unban <id>\``,        "Unban"],
          [`\`${PREFIX}mute @u [phút]\``,   "Timeout"],
          [`\`${PREFIX}unmute @u\``,        "Bỏ timeout"],
          [`\`${PREFIX}warn @u <lý do>\``,  "Cảnh cáo"],
          [`\`${PREFIX}warnings @u\``,      "Xem cảnh cáo"],
          [`\`${PREFIX}clearwarn @u\``,     "Xóa cảnh cáo"],
          [`\`${PREFIX}purge <số>\``,       "Xóa tin nhắn"],
          [`\`${PREFIX}slowmode <giây>\``,  "Chế độ chậm"],
          [`\`${PREFIX}lock\``,             "Khóa kênh"],
          [`\`${PREFIX}unlock\``,           "Mở kênh"],
          [`\`${PREFIX}nick @u <tên>\``,    "Đổi biệt danh"],
        ],
      },
      eco: {
        name: "💰 Economy",
        cmds: [
          [`\`${PREFIX}balance [@u]\``,     "Xem số xu"],
          [`\`${PREFIX}daily\``,            "Xu hàng ngày"],
          [`\`${PREFIX}give @u <số>\``,     "Chuyển xu"],
          [`\`${PREFIX}richlist\``,         "Bảng xếp hạng"],
          [`\`${PREFIX}slots\``,            "Máy đánh bạc"],
          [`\`${PREFIX}gamble <số>\``,      "Cá cược"],
          [`\`${PREFIX}work\``,             "Đi làm kiếm xu"],
        ],
      },
      util: {
        name: "⚙️ Utility",
        cmds: [
          [`\`${PREFIX}poll <câu hỏi>\``,   "Tạo bình chọn"],
          [`\`${PREFIX}timer <giây>\``,     "Đếm ngược"],
          [`\`${PREFIX}remind <t> <msg>\``, "Nhắc nhở"],
          [`\`${PREFIX}calc <biểu thức>\``, "Máy tính"],
          [`\`${PREFIX}embed <t|d>\``,      "Tạo embed"],
          [`\`${PREFIX}color <#hex>\``,     "Xem màu"],
          [`\`${PREFIX}translate <msg>\``,  "Dịch (tiếng Anh)"],
        ],
      },
    };

    const cat = args[0]?.toLowerCase();
    if (cat && cats[cat]) {
      const { name, cmds } = cats[cat];
      const e = em(name, "", C.PINK);
      cmds.forEach(([n, d]) => e.addFields({ name: n, value: d, inline: false }));
      return reply(e);
    }

    const e = em(`🐱 ${BOT_NAME} — Danh Sách Lệnh`,
      `Prefix: \`${PREFIX}\` • Dùng \`${PREFIX}help <danh mục>\` để xem chi tiết`, C.PINK);
    e.addFields(
      { name: "ℹ️ `info`",  value: "Thông tin bot & server",  inline: true },
      { name: "🎉 `fun`",   value: "Lệnh vui vẻ, game nhỏ",   inline: true },
      { name: "🔨 `mod`",   value: "Quản lý server",           inline: true },
      { name: "💰 `eco`",   value: "Hệ thống kinh tế",         inline: true },
      { name: "⚙️ `util`",  value: "Tiện ích hữu ích",         inline: true },
    );
    e.setThumbnail(client.user.displayAvatarURL());
    return reply(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  INFO
  // ════════════════════════════════════════════════════════════════════════════

  if (command === "ping") {
    const start = Date.now();
    const sent  = await msg.reply("🏓 Đang đo...");
    const ms    = Date.now() - start;
    const ws    = Math.round(client.ws.ping);
    const col   = ws < 100 ? C.GREEN : ws < 200 ? C.GOLD : C.RED;
    const e = em("🏓 Pong!", "", col);
    e.addFields(
      { name: "🌐 WebSocket", value: `\`${ws}ms\``,  inline: true },
      { name: "📨 Response",  value: `\`${ms}ms\``,  inline: true },
      { name: "📊 Đánh giá",  value: ws < 100 ? "`Xuất sắc`" : ws < 200 ? "`Tốt`" : "`Chậm`", inline: true },
    );
    return sent.edit({ content: null, embeds: [e] });
  }

  if (command === "info" || command === "botinfo") {
    const e = em(`🐱 ${BOT_NAME}`, "", C.PINK);
    e.setThumbnail(client.user.displayAvatarURL());
    e.addFields(
      { name: "👤 Bot",       value: `${client.user}`,                               inline: true },
      { name: "🏷️ Prefix",   value: `\`${PREFIX}\``,                                 inline: true },
      { name: "🖥️ Servers",  value: `${client.guilds.cache.size}`,                    inline: true },
      { name: "👥 Users",     value: `${client.users.cache.size}`,                    inline: true },
      { name: "⚡ Latency",   value: `${Math.round(client.ws.ping)}ms`,               inline: true },
      { name: "🛠️ Library",   value: "discord.js v14",                               inline: true },
      { name: "👑 Owner",     value: "Vũ Đức Mạnh",                                  inline: true },
      { name: "💬 Discord",   value: "[Server](https://discord.gg/CjNwU75h)",         inline: true },
    );
    return reply(e);
  }

  if (command === "serverinfo" || command === "si") {
    const g = msg.guild;
    await g.members.fetch();
    const e = em(`🏰 ${g.name}`, "", C.CYAN);
    if (g.iconURL()) e.setThumbnail(g.iconURL({ size: 256 }));
    e.addFields(
      { name: "🆔 ID",          value: g.id,                                    inline: true },
      { name: "👑 Owner",        value: `<@${g.ownerId}>`,                       inline: true },
      { name: "📅 Tạo lúc",     value: `<t:${Math.floor(g.createdTimestamp/1000)}:D>`, inline: true },
      { name: "👥 Thành viên",   value: `${g.memberCount}`,                      inline: true },
      { name: "📢 Kênh",         value: `${g.channels.cache.size}`,              inline: true },
      { name: "🎭 Roles",        value: `${g.roles.cache.size}`,                 inline: true },
      { name: "😀 Emoji",        value: `${g.emojis.cache.size}`,                inline: true },
      { name: "🚀 Boosts",       value: `${g.premiumSubscriptionCount || 0}`,    inline: true },
      { name: "🔐 Verification", value: `${g.verificationLevel}`,               inline: true },
    );
    return reply(e);
  }

  if (command === "userinfo" || command === "ui" || command === "whois") {
    const target = await getMember(args[0]) || msg.member;
    const u = target.user;
    const roles = target.roles.cache.filter(r => r.id !== msg.guild.id)
      .map(r => r.toString()).slice(0, 8);
    const e = em(`👤 ${target.displayName}`, "", C.PURPLE);
    e.setThumbnail(u.displayAvatarURL({ size: 256 }));
    e.addFields(
      { name: "🆔 ID",        value: u.id,                                          inline: true },
      { name: "🏷️ Tag",       value: u.tag,                                         inline: true },
      { name: "🤖 Bot",       value: u.bot ? "Có" : "Không",                        inline: true },
      { name: "📅 Tham gia",  value: `<t:${Math.floor(target.joinedTimestamp/1000)}:D>`, inline: true },
      { name: "📝 Đăng ký",   value: `<t:${Math.floor(u.createdTimestamp/1000)}:D>`,    inline: true },
      { name: "🎨 Top Role",  value: `${target.roles.highest}`,                     inline: true },
    );
    if (roles.length)
      e.addFields({ name: `🎭 Roles (${target.roles.cache.size - 1})`,
                    value: roles.join(" ") + (target.roles.cache.size > 9 ? "..." : ""),
                    inline: false });
    return reply(e);
  }

  if (command === "avatar" || command === "av" || command === "pfp") {
    const target = (await getMember(args[0]))?.user || msg.author;
    const url = target.displayAvatarURL({ size: 1024, extension: "png" });
    const e = em(`🖼️ Avatar — ${target.displayName}`, "", C.PINK);
    e.setImage(url);
    e.addFields({ name: "🔗 Link",
      value: `[PNG](${url}) • [JPG](${target.displayAvatarURL({ size:1024, extension:"jpg" })})` });
    return reply(e);
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  FUN
  // ════════════════════════════════════════════════════════════════════════════

  if (command === "meo" || command === "cat" || command === "meow") {
    const sounds = ["Meow~", "Mèoooo 🐱", "Purrrr...", "Nyaa~", "Meo meo meo!", "😺"];
    const e = em("🐱 Meo!", Math.random() < 0.5
      ? `**${sounds[Math.floor(Math.random() * sounds.length)]}**`
      : "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", C.PINK);
    return reply(e);
  }

  if (command === "say" || command === "echo") {
    if (!args.length) return reply(em("❌ Thiếu nội dung", "", C.RED));
    const txt = args.join(" ");
    await msg.delete().catch(() => {});
    const e = em("💬 Thông báo", txt, C.PINK);
    e.setFooter({ text: `Gửi bởi ${msg.author.tag}` });
    return msg.channel.send({ embeds: [e] });
  }

  if (command === "8ball" || command === "8b") {
    if (!args.length) return reply(em("❌ Nhập câu hỏi!", "", C.RED));
    const answers = [
      ["✅ Chắc chắn rồi!", C.GREEN],
      ["✅ Đúng vậy đó!", C.GREEN],
      ["✅ Hoàn toàn có thể!", C.GREEN],
      ["✅ Rõ ràng là vậy!", C.GREEN],
      ["❓ Hãy hỏi lại sau nhé", C.GOLD],
      ["❓ Tôi không chắc lắm...", C.GOLD],
      ["❓ Khó nói quá!", C.GOLD],
      ["❌ Không phải lúc này", C.RED],
      ["❌ Tôi nghĩ là không", C.RED],
      ["❌ Chắc chắn là không!", C.RED],
    ];
    const [ans, col] = answers[Math.floor(Math.random() * answers.length)];
    const e = em("🔮 Quả Cầu Ma Thuật", "", col);
    e.addFields(
      { name: "❓ Câu hỏi", value: args.join(" "), inline: false },
      { name: "🔮 Trả lời", value: ans,            inline: false },
    );
    return reply(e);
  }

  if (command === "roll" || command === "dice") {
    const dice  = args[0] || "1d6";
    const match = dice.toLowerCase().match(/^(\d+)d(\d+)$/);
    if (!match) return reply(em("❌ Sai định dạng", "Ví dụ: `m!roll 2d6`", C.RED));
    const [, num, sides] = match.map(Number);
    if (num < 1 || num > 20 || sides < 2 || sides > 100)
      return reply(em("❌ Giới hạn", "Số xúc xắc: 1-20 | Số mặt: 2-100", C.RED));
    const results = Array.from({ length: num }, () => Math.floor(Math.random() * sides) + 1);
    const total   = results.reduce((a, b) => a + b, 0);
    const e = em(`🎲 Tung ${dice}`, "", C.GOLD);
    e.addFields(
      { name: "🎯 Kết quả", value: results.join(" + "), inline: true },
      { name: "📊 Tổng",    value: `**${total}**`,       inline: true },
    );
    return reply(e);
  }

  if (command === "coinflip" || command === "flip") {
    const result = Math.random() > 0.5 ? "🌕 Mặt Ngửa" : "🌑 Mặt Sấp";
    return reply(em("🪙 Tung Đồng Xu", `Kết quả: **${result}**!`, C.GOLD));
  }

  if (command === "rps") {
    const map = { k: "✂️ Kéo", g: "🪨 Búa", b: "📄 Bao",
                  keo: "✂️ Kéo", bua: "🪨 Búa", bao: "📄 Bao" };
    const choice = args[0]?.toLowerCase();
    if (!map[choice])
      return reply(em("❌ Sai", "Nhập: k (kéo) / g (búa) / b (bao)", C.RED));
    const player  = map[choice];
    const botPick = ["✂️ Kéo","🪨 Búa","📄 Bao"][Math.floor(Math.random() * 3)];
    const wins    = new Set(["✂️ Kéo|📄 Bao","🪨 Búa|✂️ Kéo","📄 Bao|🪨 Búa"]);
    let result, col;
    if (player === botPick)           { result = "🤝 Hòa!";         col = C.GOLD;  }
    else if (wins.has(`${player}|${botPick}`)) { result = "🏆 Bạn thắng!"; col = C.GREEN; }
    else                              { result = "😿 Bot thắng!";   col = C.RED;   }
    const e = em("✊ Kéo Búa Bao", result, col);
    e.addFields({ name: "👤 Bạn", value: player, inline: true },
                { name: "🤖 Bot", value: botPick, inline: true });
    return reply(e);
  }

  if (command === "choose") {
    const choices = args.join(" ").split("|").map(s => s.trim()).filter(Boolean);
    if (choices.length < 2)
      return reply(em("❌ Cần ít nhất 2 lựa chọn", `Cách dùng: \`${PREFIX}choose a | b | c\``, C.RED));
    const picked = choices[Math.floor(Math.random() * choices.length)];
    const e = em("🎯 Meo Bot chọn...", `**${picked}**`, C.PINK);
    e.addFields({ name: "📋 Các lựa chọn", value: choices.join(" • "), inline: false });
    return reply(e);
  }

  if (command === "quote") {
    const quotes = [
      ["Hành trình ngàn dặm bắt đầu từ một bước chân.", "Lão Tử"],
      ["Thành công không phải chìa khóa của hạnh phúc. Hạnh phúc mới là chìa khóa của thành công.", "Albert Schweitzer"],
      ["Cuộc sống không phải là chờ cơn bão qua đi, mà là học cách nhảy múa trong mưa.", "Vivian Greene"],
      ["Mơ lớn hơn những gì bạn nghĩ bạn có thể.", "Khuyết danh"],
      ["Đừng xem đồng hồ — hãy làm như nó làm. Hãy tiếp tục tiến.", "Sam Levenson"],
      ["Kẻ không biết mình không biết, hãy tránh xa. Kẻ biết mình không biết, hãy giúp đỡ.", "Lady Burton"],
    ];
    const [q, a] = quotes[Math.floor(Math.random() * quotes.length)];
    return reply(em("💬 Trích Dẫn", `*"${q}"*\n\n— **${a}**`, C.PURPLE));
  }

  if (command === "love") {
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Tag ai đó!", "", C.RED));
    const pct  = target.id === msg.author.id ? Math.floor(Math.random()*41)+60 : Math.floor(Math.random()*101);
    const bar  = "❤️".repeat(Math.floor(pct/10)) + "🖤".repeat(10 - Math.floor(pct/10));
    const col  = pct >= 70 ? C.RED : pct >= 40 ? C.GOLD : C.PURPLE;
    const note = pct >= 90 ? "💍 Hoàn hảo! Cặp đôi trời sinh!" :
                 pct >= 70 ? "💗 Rất hợp nhau!" :
                 pct >= 40 ? "💛 Cũng được đó~" : "😅 Hmm... Có vẻ khó...";
    const e = em("💕 Máy Đo Tình Yêu", "", col);
    e.addFields(
      { name: "👫 Cặp đôi", value: `${msg.author} ❤️ ${target}`, inline: false },
      { name: "💯 Kết quả", value: `**${pct}%**\n${bar}`,         inline: false },
      { name: "💬 Nhận xét", value: note,                          inline: false },
    );
    return reply(e);
  }

  if (command === "hug") {
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Tag ai đó!", "", C.RED));
    return reply(em("🤗 Ôm!", `${msg.author} đã ôm ${target}! 🫂`, C.PINK));
  }

  if (command === "pat") {
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Tag ai đó!", "", C.RED));
    return reply(em("🫶 Xoa Đầu!", `${msg.author} xoa đầu ${target}! (◕ᴗ◕✿)`, C.PINK));
  }

  if (command === "slap") {
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Tag ai đó!", "", C.RED));
    return reply(em("👋 Tát!", `${msg.author} đã tát ${target}! 💥`, C.RED));
  }

  if (command === "trivia") {
    const qs = [
      { q: "Pokémon nào là biểu tượng của Pokémon?", a: "Pikachu", choices: ["Charizard","Pikachu","Mewtwo","Eevee"] },
      { q: "Thủ đô của Việt Nam là gì?", a: "Hà Nội", choices: ["TP.HCM","Đà Nẵng","Hà Nội","Huế"] },
      { q: "1 + 1 = ?", a: "2", choices: ["1","2","3","11"] },
      { q: "Mặt Trời là gì?", a: "Ngôi sao", choices: ["Hành tinh","Ngôi sao","Mặt trăng","Thiên hà"] },
      { q: "Ngôn ngữ nào phổ biến nhất thế giới?", a: "Tiếng Anh", choices: ["Tiếng Hoa","Tiếng Tây Ban Nha","Tiếng Anh","Tiếng Ả Rập"] },
    ];
    const q = qs[Math.floor(Math.random() * qs.length)];
    const shuffled = [...q.choices].sort(() => Math.random() - 0.5);
    const letters  = ["🇦","🇧","🇨","🇩"];
    const correct  = letters[shuffled.indexOf(q.a)];
    const e = em("🧠 Câu Hỏi Trivia", q.q, C.CYAN);
    e.addFields({ name: "Lựa chọn", value: shuffled.map((c,i) => `${letters[i]} ${c}`).join("\n") });
    e.setFooter({ text: "React đáp án của bạn!" });
    const sent = await msg.channel.send({ embeds: [e] });
    for (const l of letters.slice(0, shuffled.length)) await sent.react(l).catch(() => {});
    const filter = (r, u) => letters.includes(r.emoji.name) && !u.bot;
    const collected = await sent.awaitReactions({ filter, max: 1, time: 15000 }).catch(() => null);
    if (!collected || !collected.size) return sent.edit({ embeds: [e.setDescription(`⏰ Hết giờ! Đáp án: **${q.a}**`)] });
    const picked = collected.first().emoji.name;
    if (picked === correct) {
      const d = getUser(msg.author.id);
      d.coins += 50;
      saveData();
      sent.edit({ embeds: [e.setColor(C.GREEN).setDescription(`✅ **Đúng rồi!** +50 xu 🎉\nĐáp án: **${q.a}**`)] });
    } else {
      sent.edit({ embeds: [e.setColor(C.RED).setDescription(`❌ **Sai rồi!**\nĐáp án đúng: **${q.a}**`)] });
    }
    return;
  }

  if (command === "wyr") {
    const scenarios = [
      ["Bay được như chim", "Bơi được như cá"],
      ["Nói được 10 thứ tiếng", "Chơi được 10 loại nhạc cụ"],
      ["Sống 200 năm nhưng không có internet", "Sống 80 năm với internet tốc độ cao"],
      ["Được tất cả mọi người yêu quý", "Vô cùng giàu có nhưng ít bạn"],
      ["Biết trước tương lai", "Quay ngược được thời gian"],
    ];
    const [a, b] = scenarios[Math.floor(Math.random() * scenarios.length)];
    const e = em("🤔 Would You Rather?", "", C.VIOLET || C.PURPLE);
    e.addFields(
      { name: "🅰️ Lựa chọn A", value: a, inline: true },
      { name: "🅱️ Lựa chọn B", value: b, inline: true },
    );
    const sent = await msg.channel.send({ embeds: [e] });
    await sent.react("🅰️");
    await sent.react("🅱️");
    return;
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  MODERATION
  // ════════════════════════════════════════════════════════════════════════════

  if (command === "kick") {
    if (!msg.member.permissions.has(PermissionFlagsBits.KickMembers)) return errPerm();
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) return errBot();
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Không tìm thấy thành viên", "", C.RED));
    if (target.roles.highest.position >= msg.member.roles.highest.position)
      return reply(em("❌ Không thể kick", "Role của bạn không đủ cao!", C.RED));
    const reason = args.slice(1).join(" ") || "Không có lý do";
    await target.send(em("👟 Bạn đã bị kick",
      `Server: **${msg.guild.name}**\nLý do: ${reason}`, C.RED)).catch(() => {});
    await target.kick(reason);
    const e = em("👟 Đã Kick", "", C.GOLD);
    e.addFields(
      { name: "👤 Thành viên", value: `${target.user.tag} (\`${target.id}\`)`, inline: false },
      { name: "📋 Lý do",     value: reason,                                   inline: false },
      { name: "🔨 Bởi",       value: msg.author.tag,                           inline: false },
    );
    return reply(e);
  }

  if (command === "ban") {
    if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) return errPerm();
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return errBot();
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Không tìm thấy thành viên", "", C.RED));
    if (target.roles.highest.position >= msg.member.roles.highest.position)
      return reply(em("❌ Không thể ban", "Role không đủ cao!", C.RED));
    const reason = args.slice(1).join(" ") || "Không có lý do";
    await target.send(em("🔨 Bạn đã bị ban",
      `Server: **${msg.guild.name}**\nLý do: ${reason}`, C.RED)).catch(() => {});
    await target.ban({ reason });
    const e = em("🔨 Đã Ban", "", C.RED);
    e.addFields(
      { name: "👤 Thành viên", value: `${target.user.tag}`, inline: false },
      { name: "📋 Lý do",     value: reason,                inline: false },
      { name: "🔨 Bởi",       value: msg.author.tag,        inline: false },
    );
    return reply(e);
  }

  if (command === "unban") {
    if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) return errPerm();
    const id = args[0];
    if (!id) return reply(em("❌ Nhập ID người dùng!", "", C.RED));
    await msg.guild.members.unban(id).then(u =>
      reply(em("✅ Đã Unban", `**${u.tag}** đã được unban!`, C.GREEN))
    ).catch(() =>
      reply(em("❌ Lỗi", "Không tìm thấy user hoặc chưa bị ban!", C.RED))
    );
    return;
  }

  if (command === "mute" || command === "timeout") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return errPerm();
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Không tìm thấy thành viên", "", C.RED));
    const minutes = parseInt(args[1]) || 10;
    const reason  = args.slice(2).join(" ") || "Không có lý do";
    await target.timeout(minutes * 60 * 1000, reason);
    const e = em("🔇 Đã Tắt Tiếng", "", C.GOLD);
    e.addFields(
      { name: "👤 Thành viên", value: target.toString(), inline: true },
      { name: "⏱️ Thời gian",  value: `${minutes} phút`, inline: true },
      { name: "📋 Lý do",     value: reason,              inline: false },
    );
    return reply(e);
  }

  if (command === "unmute") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return errPerm();
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Không tìm thấy thành viên", "", C.RED));
    await target.timeout(null);
    return reply(em("🔊 Đã Bỏ Tắt Tiếng", `${target} có thể nói chuyện rồi!`, C.GREEN));
  }

  if (command === "warn") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return errPerm();
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Không tìm thấy thành viên", "", C.RED));
    const reason = args.slice(1).join(" ");
    if (!reason) return reply(em("❌ Nhập lý do cảnh cáo!", "", C.RED));
    const gid = msg.guild.id, uid = target.id;
    if (!warnings[gid]) warnings[gid] = {};
    if (!warnings[gid][uid]) warnings[gid][uid] = [];
    warnings[gid][uid].push({ reason, by: msg.author.tag, at: new Date().toISOString() });
    saveData();
    const count = warnings[gid][uid].length;
    const e = em(`⚠️ Cảnh Cáo #${count}`, "", C.GOLD);
    e.addFields(
      { name: "👤 Thành viên", value: target.toString(), inline: true },
      { name: "🔢 Lần",        value: `${count}`,        inline: true },
      { name: "📋 Lý do",     value: reason,              inline: false },
    );
    await target.send(em(`⚠️ Bạn bị cảnh cáo lần ${count}`,
      `Server: **${msg.guild.name}**\nLý do: ${reason}`, C.GOLD)).catch(() => {});
    return reply(e);
  }

  if (command === "warnings") {
    const target = await getMember(args[0]) || msg.member;
    const ws = warnings[msg.guild.id]?.[target.id] || [];
    if (!ws.length) return reply(em("✅ Chưa có cảnh cáo", `${target} chưa bị cảnh cáo!`, C.GREEN));
    const e = em(`⚠️ Cảnh cáo — ${target.displayName}`, "", C.GOLD);
    ws.forEach((w, i) =>
      e.addFields({ name: `#${i+1} — ${new Date(w.at).toLocaleDateString("vi-VN")}`,
                    value: `${w.reason} *(bởi ${w.by})*`, inline: false })
    );
    return reply(e);
  }

  if (command === "clearwarn") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return errPerm();
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Không tìm thấy thành viên", "", C.RED));
    if (warnings[msg.guild.id]) warnings[msg.guild.id][target.id] = [];
    saveData();
    return reply(em("✅ Đã Xóa Cảnh Cáo", `Xóa hết cảnh cáo của ${target}!`, C.GREEN));
  }

  if (command === "purge" || command === "clear") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return errPerm();
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return errBot();
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100)
      return reply(em("❌ Sai số lượng", "Nhập từ 1 đến 100!", C.RED));
    const deleted = await msg.channel.bulkDelete(amount + 1, true).catch(() => null);
    if (!deleted) return reply(em("❌ Lỗi", "Không thể xóa tin nhắn quá 14 ngày tuổi!", C.RED));
    const info = await msg.channel.send({ embeds: [em("🗑️ Đã Xóa", `Đã xóa **${deleted.size - 1}** tin nhắn!`, C.GREEN)] });
    setTimeout(() => info.delete().catch(() => {}), 3000);
    return;
  }

  if (command === "slowmode") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return errPerm();
    const secs = parseInt(args[0]) || 0;
    await msg.channel.setRateLimitPerUser(secs);
    return reply(secs === 0
      ? em("✅ Tắt chế độ chậm", "Kênh đã trở lại bình thường!", C.GREEN)
      : em("🐢 Chế Độ Chậm", `Đặt **${secs}** giây / tin nhắn!`, C.GOLD)
    );
  }

  if (command === "lock") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return errPerm();
    await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: false });
    return reply(em("🔒 Kênh Đã Khóa", `**#${msg.channel.name}** đã bị khóa!`, C.RED));
  }

  if (command === "unlock") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return errPerm();
    await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: true });
    return reply(em("🔓 Kênh Đã Mở", `**#${msg.channel.name}** đã được mở!`, C.GREEN));
  }

  if (command === "nick") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageNicknames)) return errPerm();
    const target = await getMember(args[0]);
    if (!target) return reply(em("❌ Không tìm thấy thành viên", "", C.RED));
    const newNick = args.slice(1).join(" ");
    if (!newNick) return reply(em("❌ Nhập biệt danh mới!", "", C.RED));
    const old = target.displayName;
    await target.setNickname(newNick);
    return reply(em("✏️ Đổi Biệt Danh", `\`${old}\` → \`${newNick}\``, C.GREEN));
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  ECONOMY
  // ════════════════════════════════════════════════════════════════════════════

  if (command === "balance" || command === "bal" || command === "coins") {
    const target = (await getMember(args[0])) || msg.member;
    const data = getUser(target.id);
    const e = em(`💰 Số Dư — ${target.displayName}`, "", C.GOLD);
    e.setThumbnail(target.displayAvatarURL({ size: 128 }));
    e.addFields({ name: "🪙 Xu hiện có", value: `**${fmt(data.coins)}** xu`, inline: false });
    return reply(e);
  }

  if (command === "daily") {
    const data  = getUser(msg.author.id);
    const today = new Date().toISOString().slice(0, 10);
    if (data.dailyClaimed === today)
      return reply(em("⏳ Đã nhận hôm nay", "Quay lại vào ngày mai nhé! 🌙", C.GOLD));
    const reward = Math.floor(Math.random() * 401) + 100; // 100-500
    data.coins       += reward;
    data.dailyClaimed = today;
    saveData();
    const e = em("🎁 Daily Reward!", "", C.GREEN);
    e.addFields(
      { name: "🪙 Nhận được",  value: `**+${fmt(reward)}** xu`, inline: true },
      { name: "💰 Tổng cộng",  value: `**${fmt(data.coins)}** xu`, inline: true },
    );
    return reply(e);
  }

  if (command === "work") {
    const data = getUser(msg.author.id);
    const jobs = [
      ["lập trình viên", 80, 200],
      ["đầu bếp", 60, 150],
      ["thiết kế đồ họa", 70, 180],
      ["streamer", 40, 300],
      ["bác sĩ", 100, 250],
      ["giáo viên", 60, 160],
    ];
    const [job, min, max] = jobs[Math.floor(Math.random() * jobs.length)];
    const earned = Math.floor(Math.random() * (max - min + 1)) + min;
    data.coins += earned;
    saveData();
    return reply(em("💼 Đi Làm",
      `Bạn làm **${job}** và kiếm được **+${fmt(earned)}** xu!\nTổng: **${fmt(data.coins)}** xu 💰`, C.GREEN));
  }

  if (command === "give" || command === "transfer") {
    const target = await getMember(args[0]);
    if (!target || target.id === msg.author.id)
      return reply(em("❌ Lỗi", "Tag người nhận hợp lệ!", C.RED));
    const amount = parseInt(args[1]);
    if (!amount || amount <= 0) return reply(em("❌ Sai số lượng", "", C.RED));
    const sender = getUser(msg.author.id);
    if (sender.coins < amount)
      return reply(em("❌ Không đủ xu", `Bạn chỉ có **${fmt(sender.coins)}** xu!`, C.RED));
    const recv   = getUser(target.id);
    sender.coins -= amount;
    recv.coins   += amount;
    saveData();
    const e = em("💸 Chuyển Xu Thành Công!", "", C.GREEN);
    e.addFields(
      { name: "📤 Gửi",  value: `${msg.author}: -${fmt(amount)}`, inline: true },
      { name: "📥 Nhận", value: `${target}: +${fmt(amount)}`,     inline: true },
    );
    return reply(e);
  }

  if (command === "richlist" || command === "top") {
    const sorted = Object.entries(economy)
      .sort(([,a],[,b]) => b.coins - a.coins).slice(0, 10);
    if (!sorted.length) return reply(em("📊 Trống", "Chưa có dữ liệu!", C.GOLD));
    const medals = ["🥇","🥈","🥉"];
    const e = em("💰 Bảng Xếp Hạng Giàu", "", C.GOLD);
    for (let i = 0; i < sorted.length; i++) {
      const [uid, d] = sorted[i];
      const user = await client.users.fetch(uid).catch(() => null);
      const medal = medals[i] || `**#${i+1}**`;
      e.addFields({ name: `${medal} ${user?.username || "Ẩn danh"}`,
                    value: `**${fmt(d.coins)}** xu`, inline: false });
    }
    return reply(e);
  }

  if (command === "slots") {
    const data = getUser(msg.author.id);
    const cost = 50;
    if (data.coins < cost) return reply(em("❌ Không đủ xu",
      `Cần **${cost}** xu! Bạn có **${fmt(data.coins)}** xu.`, C.RED));
    data.coins -= cost;
    const syms = ["🍒","🍋","🍊","🍇","⭐","💎","🐱"];
    const reels = Array.from({ length: 3 }, () => syms[Math.floor(Math.random() * syms.length)]);
    let win = 0, msg2, col;
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      win  = cost * (reels[0] === "💎" ? 20 : reels[0] === "⭐" ? 10 : 5);
      msg2 = `🎉 **JACKPOT!** +**${fmt(win)}** xu!`;
      col  = C.GREEN;
    } else if (reels[0] === reels[1] || reels[1] === reels[2]) {
      win  = cost * 2;
      msg2 = `😊 Thắng nhỏ! +**${fmt(win)}** xu!`;
      col  = C.GOLD;
    } else {
      msg2 = `😢 Thua! -${cost} xu`;
      col  = C.RED;
    }
    data.coins += win;
    saveData();
    const e = em("🎰 Máy Đánh Bạc", `[ ${reels.join(" | ")} ]`, col);
    e.addFields(
      { name: "📊 Kết quả", value: msg2,                   inline: false },
      { name: "💰 Số dư",   value: `**${fmt(data.coins)}** xu`, inline: false },
    );
    return reply(e);
  }

  if (command === "gamble") {
    const data   = getUser(msg.author.id);
    const amount = parseInt(args[0]);
    if (!amount || amount <= 0) return reply(em("❌ Nhập số xu!", "", C.RED));
    if (data.coins < amount) return reply(em("❌ Không đủ xu",
      `Bạn có **${fmt(data.coins)}** xu!`, C.RED));
    const win = Math.random() < 0.45; // 45% thắng
    data.coins += win ? amount : -amount;
    saveData();
    return reply(em("🎲 Cá Cược", "", win ? C.GREEN : C.RED)
      .addFields(
        { name: "📊 Kết quả", value: win ? `🎉 Thắng **+${fmt(amount)}** xu!` : `😢 Thua **-${fmt(amount)}** xu!`, inline: false },
        { name: "💰 Số dư",   value: `**${fmt(data.coins)}** xu`, inline: false },
      ));
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  UTILITY
  // ════════════════════════════════════════════════════════════════════════════

  if (command === "poll") {
    const question = args.join(" ");
    if (!question) return reply(em("❌ Nhập câu hỏi!", "", C.RED));
    const e = em(`📊 Bình Chọn`, `**${question}**`, C.BLUE);
    e.setFooter({ text: `Bình chọn bởi ${msg.author.tag}` });
    await msg.delete().catch(() => {});
    const sent = await msg.channel.send({ embeds: [e] });
    await sent.react("👍");
    await sent.react("👎");
    await sent.react("🤷");
    return;
  }

  if (command === "timer") {
    const secs = parseInt(args[0]);
    if (!secs || secs < 1 || secs > 3600)
      return reply(em("❌ Nhập 1-3600 giây!", "", C.RED));
    await reply(em("⏱️ Bắt Đầu Đếm", `Hẹn giờ **${secs}** giây!`, C.CYAN));
    setTimeout(async () => {
      msg.channel.send(`⏰ ${msg.author} Hẹn giờ **${secs}** giây đã kết thúc!`).catch(() => {});
    }, secs * 1000);
    return;
  }

  if (command === "remind") {
    const timeStr = args[0];
    const message = args.slice(1).join(" ");
    if (!timeStr || !message) return reply(em("❌ Thiếu tham số", `Ví dụ: \`${PREFIX}remind 30m Ăn cơm\``, C.RED));
    const units = { s: 1000, m: 60000, h: 3600000 };
    const unit  = timeStr.slice(-1).toLowerCase();
    const val   = parseInt(timeStr);
    if (!units[unit] || isNaN(val)) return reply(em("❌ Sai định dạng", "Dùng s/m/h (ví dụ: 30m)", C.RED));
    await reply(em("⏰ Đã Đặt Nhắc Nhở", `Sẽ nhắc sau **${timeStr}**!`, C.GREEN));
    setTimeout(() => {
      msg.channel.send(`⏰ ${msg.author} **Nhắc nhở:** ${message}`).catch(() => {});
    }, val * units[unit]);
    return;
  }

  if (command === "calc") {
    const expr = args.join(" ");
    if (!expr) return reply(em("❌ Nhập biểu thức!", "", C.RED));
    try {
      const safe   = expr.replace(/\^/g, "**");
      const result = Function(`"use strict"; return (${safe})`)();
      const e = em("🧮 Kết Quả", "", C.CYAN);
      e.addFields(
        { name: "📝 Biểu thức", value: `\`${expr}\``, inline: false },
        { name: "✅ Kết quả",   value: `**${result}**`, inline: false },
      );
      return reply(e);
    } catch {
      return reply(em("❌ Lỗi tính toán", "Biểu thức không hợp lệ!", C.RED));
    }
  }

  if (command === "embed") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return errPerm();
    const parts = args.join(" ").split("|");
    const title = parts[0]?.trim() || "Thông báo";
    const desc  = parts[1]?.trim() || "";
    let   col   = C.PINK;
    if (parts[2]) {
      try { col = parseInt(parts[2].trim().replace("#",""), 16); } catch {}
    }
    await msg.delete().catch(() => {});
    return msg.channel.send({ embeds: [em(title, desc, col)] });
  }

  if (command === "color") {
    const hex = args[0]?.replace("#","");
    if (!hex || !/^[0-9a-fA-F]{6}$/.test(hex))
      return reply(em("❌ Sai định dạng", "Ví dụ: `m!color #FF6FA0`", C.RED));
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    const e = new EmbedBuilder()
      .setTitle(`🎨 #${hex.toUpperCase()}`)
      .setColor(parseInt(hex, 16))
      .addFields(
        { name: "🔴 Red",   value: `${r}`, inline: true },
        { name: "🟢 Green", value: `${g}`, inline: true },
        { name: "🔵 Blue",  value: `${b}`, inline: true },
      )
      .setImage(`https://singlecolorimage.com/get/${hex}/400x100`);
    return reply(e);
  }

  if (command === "translate") {
    if (!args.length) return reply(em("❌ Nhập văn bản!", "", C.RED));
    const text = args.join(" ");
    const e = em("🌐 Dịch thuật", "", C.CYAN);
    e.addFields(
      { name: "📝 Văn bản gốc", value: text, inline: false },
      { name: "🔤 Gợi ý", value: "Tích hợp Google Translate API để dùng tính năng này!\nXem README để biết cách thêm.", inline: false },
    );
    return reply(e);
  }

});

// ── Login ─────────────────────────────────────────────────────────────────────
if (!TOKEN) {
  console.error("❌ Thiếu TOKEN! Thêm TOKEN vào .env hoặc biến môi trường Railway.");
  process.exit(1);
}

client.login(TOKEN);
