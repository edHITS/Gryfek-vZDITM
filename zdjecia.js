const fs = require("fs");
const path = require("path");

const allowedExtensions = ["png", "jpg", "jpeg", "gif", "webp"];

const ALLOWED_ROLES = [
    "1188159976523452527"
];

const ALLOWED_USERS = [
    "1188159976523452527"
];

const UPRAWNIENI_DO_ZATWIERDZANIA = [
    "1188159976523452527"
];

const CHANNELS = [
    "1546953799644618862", // zdjęcia IRL
    "1546767982104027196" // screeny
];

// 🔥 ID kanałów dla systemu automatycznej galerii
const SCREENY_KIEROWCY_CHANNEL_ID = "1546767982104027196"; // screeny kierowcy
const GALERIA_NAJLEPSZYCH_CHANNEL_ID = "1546815895316336692"; // czat-zditm

const AUTO_DELETE_FILE = "./json/auto_delete.json";
const IMAGE_REGEX = /https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;

function saveDelete(msgId, channelId, deleteAt) {
    let data = loadDeletes();
    data.push({ msgId, channelId, deleteAt });
    saveDeletes(data);
}

function loadDeletes() {
    if (!fs.existsSync(AUTO_DELETE_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(AUTO_DELETE_FILE, "utf8"));
    } catch {
        return [];
    }
}

function saveDeletes(data) {
    fs.writeFileSync(AUTO_DELETE_FILE, JSON.stringify(data, null, 2));
}

// =========================
// USTAWIENIA
// =========================
const MAX_WARNS = 3;
const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 min
const WARN_RESET_TIME = 10 * 60 * 1000;

const FILE_PATH = path.join(__dirname, "./json/kary.json");

// =========================
// ŁADOWANIE / ZAPIS
// =========================
function loadWarnings() {
    if (!fs.existsSync(FILE_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
    } catch {
        return {};
    }
}

function saveWarnings(data) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

let userWarnings = loadWarnings();

// =========================
// DOSTĘP
// =========================
function czyMaDostep(member) {
    if (!member) return false;

    const isAdmin =
        member.permissions.has("Administrator") ||
        member.permissions.has("ManageMessages");

    const hasRole = member.roles.cache.some(role =>
        ALLOWED_ROLES.includes(role.id)
    );

    const isAllowedUser = ALLOWED_USERS.includes(member.id);

    return isAdmin || hasRole || isAllowedUser;
}

// 
// CZYSZCZENIE
// 
function cleanExpiredWarnings() {
    const now = Date.now();
    for (const userId in userWarnings) {
        const data = userWarnings[userId];
        if (now - data.lastAttempt > WARN_RESET_TIME) {
            delete userWarnings[userId];
        }
    }
    saveWarnings(userWarnings);
}

// =========================
// WARN SYSTEM
// =========================
async function dodajWarn(message) {
    const userId = message.author.id;
    const now = Date.now();

    let data = userWarnings[userId];

    if (data && now - data.lastAttempt > WARN_RESET_TIME) {
        data = null;
    }

    if (!data) {
        data = {
            count: 0,
            lastAttempt: now,
            username: message.member?.displayName || message.author.username
        };
    }

    data.count += 1;
    data.lastAttempt = now;
    data.username = message.member?.displayName || message.author.username;

    userWarnings[userId] = data;
    saveWarnings(userWarnings);

    if (data.count >= MAX_WARNS) {
        try {
            await message.member.timeout(
                TIMEOUT_DURATION,
                "Spam tekstem w kanale zdjęć"
            );
        } catch (e) {
            console.log("❗ERROR:", e);
        }

        delete userWarnings[userId];
        saveWarnings(userWarnings);

        try {
            const msg = await message.channel.send({
                content: `❗ Użytkownik ${message.author} otrzymał przerwę na 15 minut za ignorowanie poleceń Zarządu MZK.`
            });

            setTimeout(() => {
                msg.delete().catch(() => {});
            }, 30000);
        } catch {}

        return;
    }

    try {
        const msg = await message.channel.send({
            content: `❗ ${message.author}, tu można wysyłać tylko zdjęcia!`
        });

        setTimeout(() => {
            msg.delete().catch(() => {});
        }, 30000);
    } catch {}
}

// =========================
// GŁÓWNA FUNKCJA
// =========================
async function obsluzZdjecia(message) {
    if (message.author.bot) return;
    if (!CHANNELS.includes(message.channel.id)) return;
    if (czyMaDostep(message.member)) return;

    const hasImageAttachment = message.attachments.some(att => {
        const name = att.name || "";
        const contentType = att.contentType || "";
        const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
        return (contentType.startsWith("image/") || allowedExtensions.includes(ext));
    });

    const hasImageLink = IMAGE_REGEX.test(message.content);

    const hasImageEmbed = message.embeds.some(embed =>
        embed.image?.url || embed.thumbnail?.url
    );

    const hasImage = hasImageAttachment || hasImageLink || hasImageEmbed;

    if (hasImage) return;

    if (message.content.trim().length > 0) {
        await message.delete().catch(() => {});
        await dodajWarn(message);
    }
}

// =========================================
// SYSTEM AUTOMATYCZNEJ GALERII (REAKCJE)
// =========================================
async function obsluzReakcjeGalerii(reaction, user) {
    if (user.bot || !reaction.message.guild) return;

    // 1. Warunek kanału (screeny-kierowcy)
    if (reaction.message.channelId !== SCREENY_KIEROWCY_CHANNEL_ID) return;

    // 2. Obsługa Partiali (bardzo ważne dla starych wiadomości)
    if (reaction.partial) {
        try { await reaction.fetch(); } catch (e) { return console.error("Błąd pobierania reakcji:", e); }
    }
    
    // Wymuszamy pobranie wiadomości z API, aby upewnić się, że mamy dostęp do załączników (attachments)
    try { 
        await reaction.message.fetch(); 
    } catch (e) { 
        return console.error("Błąd pobierania wiadomości z API:", e); 
    }

    // 3. Warunek emoji: sparkling_heart
    const emojiName = reaction.emoji.name;
    if (!emojiName || emojiName.toLowerCase() !== 'sparkling_heart') return;

    // 4. Sprawdzenie łącznej liczby reakcji (POPRAWIONE NA MINIMUM 7)
    if (reaction.count >= 7) {
        const attachments = reaction.message.attachments;
        const attachment = attachments.first();
        
        // Jeśli w wiadomości nie ma bezpośredniego pliku, przerywamy
        if (!attachment) return;

        // Zapobieganie wielokrotnemu przenoszeniu tego samego zdjęcia
        let currentDeletes = loadDeletes();
        const juzPrzeniesiono = currentDeletes.some(item => item.msgId === reaction.message.id && item.isGallery === true);
        if (juzPrzeniesiono) return;

        try {
            // Pobieramy aktualną listę użytkowników, którzy dali tę reakcję
            const reaktorzy = await reaction.users.fetch();
            
            // Sprawdzamy, czy chociaż jeden użytkownik z listy UPRAWNIENI_DO_ZATWIERDZANIA dał reakcję
            const czyZatwierdzone = reaktorzy.some(u => UPRAWNIENI_DO_ZATWIERDZANIA.includes(u.id));

            // Jeśli nikt z uprawnionych jeszcze nie kliknął – przerywamy funkcję i czekamy
            if (!czyZatwierdzone) return;

            const targetChannel = reaction.message.guild.channels.cache.get(GALERIA_NAJLEPSZYCH_CHANNEL_ID);
            if (!targetChannel) return console.error("Nie znaleziono kanału docelowego dla galerii.");

            const autorId = reaction.message.author.id;

            // Zapisujemy w bazie, że to zdjęcie zostało już obsłużone
            currentDeletes.push({ msgId: reaction.message.id, channelId: reaction.message.channelId, isGallery: true });
            saveDeletes(currentDeletes);

            // Wysyłanie wiadomości na kanał galerii
            await targetChannel.send({
                content: `**Autor zdjęcia:** <@${autorId}>`,
                files: [attachment.url]
            });

            console.log(`[GALERIA] Zdjęcie pomyślnie przeniesione! Spełniono warunek 7 reakcji oraz zatwierdzenia przez Zarząd.`);

        } catch (err) {
            console.error("Błąd podczas weryfikacji użytkowników lub przenoszenia zdjęcia:", err);
        }
    }
}

setInterval(() => {
    const now = Date.now();
    for (const userId in userWarnings) {
        const data = userWarnings[userId];
        if (now - data.lastAttempt > WARN_RESET_TIME) {
            delete userWarnings[userId];
        }
    }
    saveWarnings(userWarnings);
}, 5 * 60 * 1000);

async function autoDeleteWorker(client) {
    setInterval(async () => {
        let data = loadDeletes();
        const now = Date.now();
        const remaining = [];

        for (const item of data) {
            if (item.isGallery) {
                remaining.push(item);
                continue;
            }

            if (now >= item.deleteAt) {
                try {
                    const channel = await client.channels.fetch(item.channelId);
                    const msg = await channel.messages.fetch(item.msgId);
                    await msg.delete();
                } catch (e) {
                    console.log("AUTO DELETE ERROR:", e);
                }
            } else {
                remaining.push(item);
            }
        }

        saveDeletes(remaining);
    }, 5000);
}

module.exports = {
    obsluzZdjecia,
    cleanExpiredWarnings,
    autoDeleteWorker,
    obsluzReakcjeGalerii
};