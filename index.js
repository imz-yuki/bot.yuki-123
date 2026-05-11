// ============================================
//   MEO MEDIA BOT 🐱 — Discord Bot (JavaScript)
//   discord.js v14
//   !mdsetup  -> set kênh nhận link
//   !mhelp    -> hướng dẫn
//   Hỗ trợ: link media trực tiếp hợp lệ (mp4/webm/mov/gif...)
// ============================================

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const C = {
  PINK: 0xFF6FA0,
  CYAN: 0x5AE4FF,
  GOLD: 0xE8C76A,
  GREEN: 0x4DFFA0,
  RED: 0xFF5555,
  PURPLE: 0xB07DFF,
  BLUE: 0x5865F2,
};

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

function getMediaChannel(guildId) {
  return mediaChannels[guildId] || null;
}

function setMediaChannel(guildId, channelId) {
  mediaChannels[guildId] = channelId;
  saveData();
}

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  return [
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
  ].includes(h) || h.endsWith(".youtube.com") || h.endsWith(".tiktok.com") || h.endsWith(".bilibili.com");
}

function extractUrls(text) {
  const matches = text.match(/https?:\/\/[^\s<>]+/gi);
  return matches || [];
}

function isLikelyDirectMediaUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    const ext = path.extname(u.pathname).toLowerCase();
    return [".mp4", ".webm", ".mov", ".m4v", ".gif", ".avi", ".mkv"].includes(ext);
  } catch {
    return false;
  }
}

async function headOrGet(url) {
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  return res;
}

async function downloadToTemp(url) {
  const res = await headOrGet(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const contentLength = Number(res.headers.get("content-length") || 0);

  const maxBytes = 25 * 1024 * 1024; // 25MB an toàn cho Discord cơ bản
  if (contentLength && contentLength > maxBytes) {
    throw new Error("FILE_TOO_LARGE");
  }

  const extFromType =
    contentType.includes("mp4") ? ".mp4" :
    contentType.includes("webm") ? ".webm" :
    contentType.includes("quicktime") ? ".mov" :
    contentType.includes("gif") ? ".gif" :
    ".bin";

  const filePath = path.join(os.tmpdir(), `meo_${Date.now()}${extFromType}`);
  const fileStream = fs.createWriteStream(filePath);

  if (!res.body) throw new Error("NO_BODY");

  await pipeline(Readable.fromWeb(res.body), fileStream);

  return { filePath, contentType, size: contentLength || fs.statSync(filePath).size };
}

client.once("ready", () => {
  loadData();
  console.log(`✅ ${BOT_NAME} online as ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.guild) return;

  const content = msg.content.trim();
  const isCommand = content.startsWith(PREFIX);

  const reply = (embed) => msg.reply({ embeds: [embed] }).catch(() => {});
  const errPerm = () => reply(em("❌ Thiếu quyền", "Bạn không có quyền dùng lệnh này.", C.RED));

  // Commands
  if (isCommand) {
    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const command = (args.shift() || "").toLowerCase();

    if (command === "mhelp") {
      const e = em("🐱 Meo Media Bot — Hướng dẫn", "", C.PINK);
      e.addFields(
        { name: `${PREFIX}mdsetup`, value: "Đặt kênh hiện tại thành kênh nhận link media.", inline: false },
        { name: `${PREFIX}mhelp`, value: "Xem hướng dẫn này.", inline: false },
        { name: "Cách dùng", value: "Sau khi setup, gửi link media trực tiếp trong kênh đó. Bot sẽ tải và đăng lại file nếu hợp lệ.", inline: false },
        { name: "Lưu ý", value: "Bot không hỗ trợ link từ các nền tảng bị chặn như YouTube/TikTok/BiliBili.", inline: false },
      );
      return reply(e);
    }

    if (command === "mdsetup") {
      if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return errPerm();
      setMediaChannel(msg.guild.id, msg.channel.id);
      return reply(
        em(
          "✅ Đã thiết lập kênh",
          `Kênh **#${msg.channel.name}** đã được đặt làm kênh nhận link media.\nChỉ kênh này mới được bot xử lý.`,
          C.GREEN
        )
      );
    }

    return;
  }

  // Only process messages in configured channel
  const mediaChannelId = getMediaChannel(msg.guild.id);
  if (!mediaChannelId || msg.channel.id !== mediaChannelId) return;

  const urls = extractUrls(msg.content);
  if (!urls.length) return;

  const url = urls[0];

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return reply(em("❌ Link không hợp lệ", "Hãy gửi một URL hợp lệ.", C.RED));
  }

  if (isBlockedHost(parsed.hostname)) {
    return reply(
      em(
        "⛔ Nguồn không được hỗ trợ",
        "Bot không hỗ trợ trích xuất/tải video từ các nền tảng như YouTube, TikTok, BiliBili.",
        C.RED
      )
    );
  }

  try {
    const direct = isLikelyDirectMediaUrl(url);
    if (!direct) {
      // Vẫn thử tải nếu server trả về video trực tiếp
      const res = await fetch(url, { method: "GET", redirect: "follow" });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (!ct.startsWith("video/") && !ct.includes("gif")) {
        return reply(
          em(
            "❌ Chưa hỗ trợ nguồn này",
            "Bot chỉ hỗ trợ link media trực tiếp hoặc URL trả về nội dung video trực tiếp.",
            C.RED
          )
        );
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const maxBytes = 25 * 1024 * 1024;
      const len = Number(res.headers.get("content-length") || 0);
      if (len && len > maxBytes) {
        return reply(em("❌ File quá lớn", "File vượt quá giới hạn 25MB.", C.RED));
      }

      const tempPath = path.join(os.tmpdir(), `meo_${Date.now()}.mp4`);
      await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tempPath));

      await msg.channel.send({
        content: `📥 ${msg.author}`,
        files: [{ attachment: tempPath, name: path.basename(tempPath) }],
      });

      fs.unlink(tempPath, () => {});
      return;
    }

    const { filePath } = await downloadToTemp(url);

    await msg.channel.send({
      content: `📥 ${msg.author}`,
      files: [{ attachment: filePath, name: path.basename(filePath) }],
    });

    fs.unlink(filePath, () => {});
  } catch (err) {
    const code = String(err?.message || err);

    if (code === "FILE_TOO_LARGE") {
      return reply(em("❌ File quá lớn", "File vượt quá giới hạn cho phép.", C.RED));
    }

    return reply(
      em(
        "❌ Không tải được",
        "Link này không thể xử lý, hoặc máy chủ nguồn chặn truy cập.",
        C.RED
      )
    );
  }
});

if (!TOKEN) {
  console.error("❌ Thiếu TOKEN trong biến môi trường.");
  process.exit(1);
}

client.login(TOKEN);
