// 🐱 Meo Media Bot V2 | Hỗ trợ TikTok, YouTube, BiliBili...
// Cài đặt: npm install discord.js yt-dlp-exec

const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, EmbedBuilder, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const youtubeDl = require('yt-dlp-exec');

const PREFIX = "!";
const TOKEN = process.env.TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
});

const DATA_DIR = path.join(__dirname, "data");
const MEDIA_FILE = path.join(DATA_DIR, "mediaChannels.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let mediaChannels = {};
const loadData = () => { try { if (fs.existsSync(MEDIA_FILE)) mediaChannels = JSON.parse(fs.readFileSync(MEDIA_FILE, "utf8")); } catch { mediaChannels = {}; } };
const saveData = () => fs.writeFileSync(MEDIA_FILE, JSON.stringify(mediaChannels, null, 2));

const em = (title, desc = "", color = 0xff6fa0) => {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc || null)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Meo Media Bot 🐱 • ${PREFIX}mhelp` });
};

client.once("ready", () => {
    loadData();
    console.log(`✅ Đã sẵn sàng! Đăng nhập: ${client.user.tag}`);
});

client.on("messageCreate", async (msg) => {
    if (!msg.guild || msg.author.bot) return;

    const content = msg.content.trim();
    
    // 1. Xử lý Lệnh Cài đặt
    if (content.startsWith(PREFIX)) {
        const args = content.slice(PREFIX.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        if (command === "mdsetup") {
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
            mediaChannels[msg.guild.id] = msg.channel.id;
            saveData();
            return msg.reply({ embeds: [em("✅ Thành công", `Đã đặt kênh <#${msg.channel.id}> làm kênh tải video duy nhất!`, 0x4dffa0)] });
        }

        if (command === "mhelp") {
            const e = em("🐱 Meo Media - Hướng dẫn", "Bot tự động tải video từ link bạn gửi!");
            e.addFields(
                { name: `!mdsetup`, value: "Đặt kênh hiện tại làm kênh tải video.", inline: true },
                { name: `!mdunset`, value: "Hủy cài đặt kênh.", inline: true },
                { name: "Hỗ trợ", value: "TikTok, YouTube, BiliBili, Facebook, Twitter (X)..." }
            );
            return msg.reply({ embeds: [e] });
        }
    }

    // 2. Xử lý Link Video (Chỉ trong kênh đã setup)
    const setupChannelId = mediaChannels[msg.guild.id];
    if (!setupChannelId || msg.channel.id !== setupChannelId) return;

    const urlMatch = content.match(/https?:\/\/[^\s<>]+/gi);
    if (!urlMatch) return;

    const targetUrl = urlMatch[0];
    const loadingMsg = await msg.reply("🔄 Đang xử lý video, vui lòng chờ...").catch(() => null);

    try {
        const tempPath = path.join(os.tmpdir(), `meo_${Date.now()}.mp4`);
        
        // Sử dụng yt-dlp để tải video (Tự động bóc tách link TikTok, Youtube...)
        await youtubeDl(targetUrl, {
            output: tempPath,
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            maxFilesize: '25M', // Giới hạn file để tránh lỗi Discord
            noPlaylist: true,
        });

        // Gửi file lên Discord
        await msg.channel.send({
            content: `✅ **Video của bạn đã sẵn sàng!** (Nguồn: ${targetUrl})`,
            files: [{ attachment: tempPath, name: `MeoMedia_${Date.now()}.mp4` }]
        });

        if (loadingMsg) loadingMsg.delete().catch(() => {});
        fs.unlinkSync(tempPath); // Xóa file tạm sau khi gửi

    } catch (error) {
        console.error(error);
        if (loadingMsg) {
            loadingMsg.edit({ 
                content: null, 
                embeds: [em("❌ Lỗi tải video", "Không tìm thấy video hoặc file quá nặng (>25MB). Bot không hỗ trợ các kênh chưa setup.", 0xff5555)] 
            });
        }
    }
});

client.login(TOKEN);
