// 🐱 Meo Media Bot V2 | Railway Cloud Optimized
const { Client, GatewayIntentBits, Partials, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const youtubeDl = require('yt-dlp-exec');

const PREFIX = "!";
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
    console.error("❌ Thiếu TOKEN trong biến môi trường!");
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Channel],
});

// Railway dùng file system tạm thời, nhưng vẫn có thể lưu JSON dung lượng nhỏ
const DATA_DIR = path.join(__dirname, "data");
const MEDIA_FILE = path.join(DATA_DIR, "mediaChannels.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let mediaChannels = {};
const loadData = () => { try { if (fs.existsSync(MEDIA_FILE)) mediaChannels = JSON.parse(fs.readFileSync(MEDIA_FILE, "utf8")); } catch { mediaChannels = {}; } };
const saveData = () => fs.writeFileSync(MEDIA_FILE, JSON.stringify(mediaChannels, null, 2));

const em = (title, desc = "", color = 0xff6fa0) => {
    return new EmbedBuilder().setTitle(title).setDescription(desc || null).setColor(color).setTimestamp().setFooter({ text: `Meo Media Bot 🐱 • ${PREFIX}mhelp` });
};

client.once("ready", () => {
    loadData();
    console.log(`✅ Bot online trên Railway: ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: `${PREFIX}mhelp | Tải Video`, type: 2 }], status: "online" });
});

client.on("messageCreate", async (msg) => {
    if (!msg.guild || msg.author.bot) return;
    const content = msg.content.trim();
    
    // Xử lý Lệnh
    if (content.startsWith(PREFIX)) {
        const args = content.slice(PREFIX.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();

        if (command === "mdsetup") {
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
            mediaChannels[msg.guild.id] = msg.channel.id;
            saveData();
            return msg.reply({ embeds: [em("✅ Thành công", `Đã đặt kênh <#${msg.channel.id}> làm kênh tải video duy nhất!`, 0x4dffa0)] });
        }

        if (command === "mdunset") {
            if (!msg.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
            delete mediaChannels[msg.guild.id];
            saveData();
            return msg.reply({ embeds: [em("✅ Hủy thành công", "Đã xóa kênh tải video mặc định.", 0x4dffa0)] });
        }

        if (command === "mhelp") {
            const e = em("🐱 Meo Media - Hướng dẫn", "Chỉ cần gửi link TikTok, YouTube, BiliBili... bot sẽ trả về video trực tiếp!");
            e.addFields(
                { name: `!mdsetup`, value: "Đặt kênh hiện hành thành kênh tải video.", inline: true },
                { name: `!mdunset`, value: "Hủy cài đặt kênh.", inline: true }
            );
            return msg.reply({ embeds: [e] });
        }
    }

    // Xử lý Link
    const setupChannelId = mediaChannels[msg.guild.id];
    if (!setupChannelId || msg.channel.id !== setupChannelId) return;

    const urlMatch = content.match(/https?:\/\/[^\s<>]+/gi);
    if (!urlMatch) return;

    const targetUrl = urlMatch[0];
    const loadingMsg = await msg.reply("🔄 Đang lấy video từ máy chủ, vui lòng đợi...").catch(() => null);

    try {
        const tempPath = path.join(os.tmpdir(), `meo_${Date.now()}.mp4`);
        
        await youtubeDl(targetUrl, {
            output: tempPath,
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            maxFilesize: '24M', // An toàn dưới mức 25M của Discord
            noPlaylist: true,
        });

        await msg.channel.send({
            content: `📥 Video tải lên bởi: ${msg.author}`,
            files: [{ attachment: tempPath, name: `MeoMedia_${Date.now()}.mp4` }]
        });

        if (loadingMsg) loadingMsg.delete().catch(() => {});
        fs.unlinkSync(tempPath); 

    } catch (error) {
        console.error("Lỗi tải video:", error.message);
        if (loadingMsg) {
            loadingMsg.edit({ content: null, embeds: [em("❌ Thất bại", "Không thể tải video. File có thể quá nặng (trên 25MB) hoặc link không hỗ trợ.", 0xff5555)] });
        }
    }
});

client.login(TOKEN);
