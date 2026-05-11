// index.js
// Meo Media Bot 🐱 | discord.js v14
// Commands:
//   !mhelp
//   !mdsetup
//   !mdunset
//   !ping
//
// Tính năng:
// - Set 1 kênh chuyên nhận link
// - Chỉ xử lý link trong đúng kênh đó
// - Repost file media trực tiếp nếu link trả về video/gif hợp lệ
// - Chặn các host: YouTube / TikTok / BiliBili



const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  EmbedBuilder,
  Collection,
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const os = require("os");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");

const PREFIX = process.env.PREFIX || "!";
const TOKEN = process.env.TOKEN;
const BOT_NAME = "Meo Media Bot 🐱";

if (!TOKEN) {
  console.error("❌ Missing TOKEN in .env");
  process.exit(1);
}

const C = {
  PINK: 0xff6fa0,
  CYAN: 0x5ae4ff,
  GOLD: 0xe8c76a,
  GREEN: 0x4dffa0,
  RED: 0xff5555,
  PURPLE: 0xb07dff,
  BLUE: 0x5865f2,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

const DATA_DIR = path.join(__dirname, "data");
const MEDIA_FILE = path.join(DATA_DIR, "mediaChannels.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let mediaChannels = {};

function loadData() {
  try {
    if (fs.existsSync(MEDIA_FILE)) {
      mediaChannels = JSON.parse(fs.readFileSync(MEDIA_FILE, "utf8"));
    }
  } catch {
    mediaChannels = {};
  }
}

function saveData() {
  fs.writeFileSync(MEDIA_FILE, JSON.stringify(mediaChannels, null, 2));
}

function em(title, desc = "", color = C.PINK) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc || null)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: `${BOT_NAME} • ${PREFIX}mhelp` });
}

function extractUrls(text) {
  return text.match(/https?:\/\/[^\s<>]+/gi) || [];
}

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  const blocked = [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "music.youtube.com",
    "tiktok.com",
    "www.tiktok.com",
    "vm.tiktok.com",
    "vt.tiktok.com",
    "bilibili.com",
    "www.bilibili.com",
    "bilibili.tv",
    "www.bilibili.tv",
    "bili.im",
    "b23.tv",
  ];
  return blocked.includes(h) || h.endsWith(".youtube.com") || h.endsWith(".tiktok.com") || h.endsWith(".bilibili.com");
}

function isDirectMediaPath(urlStr) {
  try {
    const u = new URL(urlStr);
    const ext = path.extname(u.pathname).toLowerCase();
    return [".mp4", ".webm", ".mov", ".m4v", ".gif", ".avi", ".mkv"].includes(ext);
  } catch {
    return false;
  }
}

async function downloadToTemp(url) {
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  if (!res.body) throw new Error("NO_BODY");

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const contentLength = Number(res.headers.get("content-length") || 0);

  const maxBytes = 25 * 1024 * 1024; // 25MB
  if (contentLength && contentLength > maxBytes) {
    throw new Error("FILE_TOO_LARGE");
  }

  const ext =
    contentType.includes("mp4") ? ".mp4" :
    contentType.includes("webm") ? ".webm" :
    contentType.includes("quicktime") ? ".mov" :
    contentType.includes("gif") ? ".gif" :
    ".bin";

  const tempPath = path.join(os.tmpdir(), `meo_${Date.now()}${ext}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tempPath));

  return {
    filePath: tempPath,
    contentType,
    size: contentLength || fs.statSync(tempPath).size,
  };
}

function getMediaChannelId(guildId) {
  return mediaChannels[guildId] || null;
}

function setMediaChannelId(guildId, channelId) {
  mediaChannels[guildId] = channelId;
  saveData();
}

function clearMediaChannelId(guildId) {
  delete mediaChannels[guildId];
  saveData();
}

client.once("ready", () => {
  loadData();
  console.log(`✅ ${BOT_NAME} online as ${client.user.tag}`);

  const statuses = [
    { name: `${PREFIX}mhelp`, type: 3 }, // Watching
    { name: "media links", type: 2 },    // Listening
    { name: "direct video files", type: 0 }, // Playing
  ];

  let i = 0;
  setInterval(() => {
    const s = statuses[i % statuses.length];
    client.user.setPresence({
      activities: [{ name: s.name, type: s.type }],
      status: "online",
    });
    i++;
  }, 10_000);

  client.user.setPresence({
    activities: [{ name: `${PREFIX}mhelp`, type: 3 }],
    status: "online",
  });
});

client.on("guildCreate", async (guild) => {
  try {
    const ch = guild.systemChannel;
    if (ch) {
      await ch.send({
        embeds: [
          em(
            "🐱 Meo Media Bot đã vào server",
            `Dùng \`${PREFIX}mhelp\` để xem hướng dẫn.\nDùng \`${PREFIX}mdsetup\` trong kênh muốn nhận link media.`,
            C.GREEN
          ),
        ],
      });
    }
  } catch {}
});

client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const content = msg.content.trim();
  const isCommand = content.startsWith(PREFIX);

  const reply = (embed) => msg.reply({ embeds: [embed] }).catch(() => {});
  const errPerm = () => reply(em("❌ Thiếu quyền", "Bạn không có quyền dùng lệnh này.", C.RED));
  const errBot = () => reply(em("❌ Bot thiếu quyền", "Bot cần quyền gửi tin nhắn / embed / đính kèm file.", C.RED));

  // Commands
  if (isCommand) {
    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const command = (args.shift() || "").toLowerCase();

    if (command === "mhelp" || command === "help" || command === "mdhelp") {
      const mediaCh = getMediaChannelId(msg.guild.id);
      const e = em("🐱 Meo Media Bot — Hướng dẫn", "", C.PINK);
      e.addFields(
        { name: `${PREFIX}mdsetup`, value: "Thiết lập kênh hiện tại thành kênh nhận link media.", inline: false },
        { name: `${PREFIX}mdunset`, value: "Hủy thiết lập kênh media.", inline: false },
        { name: `${PREFIX}mhelp`, value: "Xem hướng dẫn.", inline: false },
        { name: `${PREFIX}ping`, value: "Kiểm tra bot có phản hồi không.", inline: false },
        { name: "Kênh hiện tại", value: mediaCh ? `<#${mediaCh}>` : "Chưa thiết lập", inline: false },
        {
          name: "Cách hoạt động",
          value:
            "Sau khi setup, chỉ tin nhắn có link trong đúng kênh đó mới được bot xử lý.\n" +
            "Bot chỉ hỗ trợ link media trực tiếp hợp lệ hoặc URL trả về video/gif trực tiếp.",
          inline: false,
        },
        {
          name: "Bị chặn",
          value: "YouTube / TikTok / BiliBili và các host tương tự.",
          inline: false,
        }
      );
      return reply(e);
    }

    if (command === "ping") {
      const start = Date.now();
      const sent = await msg.reply("🏓 Đang đo...").catch(() => null);
      if (!sent) return;

      const ms = Date.now() - start;
      const ws = Math.round(client.ws.ping);
      const col = ws < 100 ? C.GREEN : ws < 200 ? C.GOLD : C.RED;

      const e = em("🏓 Pong!", "", col);
      e.addFields(
        { name: "WebSocket", value: `\`${ws}ms\``, inline: true },
        { name: "Response", value: `\`${ms}ms\``, inline: true },
        { name: "Trạng thái", value: ws < 100 ? "Tốt" : ws < 200 ? "Ổn" : "Chậm", inline: true }
      );
      return sent.edit({ content: null, embeds: [e] }).catch(() => {});
    }

    if (command === "mdsetup" || command === "msetup") {
      if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return errPerm();
      setMediaChannelId(msg.guild.id, msg.channel.id);
      return reply(
        em(
          "✅ Đã thiết lập kênh media",
          `Kênh **#${msg.channel.name}** đã được đặt làm kênh nhận link.\nChỉ kênh này mới được bot xử lý.`,
          C.GREEN
        )
      );
    }

    if (command === "mdunset") {
      if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return errPerm();
      clearMediaChannelId(msg.guild.id);
      return reply(em("✅ Đã hủy thiết lập", "Server này không còn kênh media mặc định nữa.", C.GREEN));
    }

    return;
  }

  // Media handler
  const mediaChannelId = getMediaChannelId(msg.guild.id);
  if (!mediaChannelId || msg.channel.id !== mediaChannelId) return;

  const urls = extractUrls(msg.content);
  if (!urls.length) return;

  if (!msg.guild.members.me) {
    try {
      await msg.guild.members.fetchMe();
    } catch {}
  }

  const me = msg.guild.members.me;
  if (!me) return;

  const canSend = msg.channel
    .permissionsFor(me)
    ?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles]);

  if (!canSend) return;

  const url = urls[0];

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return reply(em("❌ Link không hợp lệ", "Hãy gửi URL hợp lệ.", C.RED));
  }

  if (isBlockedHost(parsed.hostname)) {
    return reply(
      em(
        "⛔ Nguồn không hỗ trợ",
        "Bot không hỗ trợ trích xuất/tải video từ YouTube, TikTok, BiliBili.",
        C.RED
      )
    );
  }

  try {
    // Ưu tiên link trực tiếp
    if (isDirectMediaPath(url)) {
      const { filePath } = await downloadToTemp(url);
      await msg.channel.send({
        content: `📥 ${msg.author}`,
        files: [{ attachment: filePath, name: path.basename(filePath) }],
      });
      fs.unlink(filePath, () => {});
      return;
    }

    // Thử tải nếu server trả về video/gif trực tiếp
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (!res.ok) {
      return reply(em("❌ Không tải được", `HTTP ${res.status}`, C.RED));
    }

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("video/") && !ct.includes("gif")) {
      return reply(
        em(
          "❌ Chưa hỗ trợ nguồn này",
          "Bot chỉ xử lý link media trực tiếp hoặc URL trả về video/gif trực tiếp.",
          C.RED
        )
      );
    }

    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength && contentLength > 25 * 1024 * 1024) {
      return reply(em("❌ File quá lớn", "Giới hạn hiện tại: 25MB.", C.RED));
    }

    const ext = ct.includes("gif") ? ".gif" : ".mp4";
    const tempPath = path.join(os.tmpdir(), `meo_${Date.now()}${ext}`);
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tempPath));

    await msg.channel.send({
      content: `📥 ${msg.author}`,
      files: [{ attachment: tempPath, name: path.basename(tempPath) }],
    });

    fs.unlink(tempPath, () => {});
  } catch (err) {
    if (String(err?.message) === "FILE_TOO_LARGE") {
      return reply(em("❌ File quá lớn", "Giới hạn hiện tại: 25MB.", C.RED));
    }
    return reply(em("❌ Lỗi xử lý", "Link này không thể xử lý hoặc máy chủ nguồn đã chặn truy cập.", C.RED));
  }
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

client.login(TOKEN);
