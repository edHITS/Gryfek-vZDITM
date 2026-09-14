const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fs = require("fs");
const path = require("path");

const WNIOSKI_DELETE_FILE = "/tmp/wnioski_delete.json";
const aktywneSesjeWnioskow = new Map();

function loadWnioskiDeletes() {
    if (!fs.existsSync(WNIOSKI_DELETE_FILE)) return [];
    try {
        const content = fs.readFileSync(WNIOSKI_DELETE_FILE, "utf8");
        return content ? JSON.parse(content) : [];
    } catch { return []; }
}

function saveWnioskiDeletes(data) {
    try {
        const dir = path.dirname(WNIOSKI_DELETE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(WNIOSKI_DELETE_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (err) { console.error("Błąd zapisu pliku autodelete:", err); }
}

function zarejestrujDoUsuniecia(msgId, channelId) {
    let data = loadWnioskiDeletes();
    const CZAS_10_DNI = 10 * 24 * 60 * 60 * 1000;
    const deleteAt = Date.now() + CZAS_10_DNI;
    data.push({ msgId, channelId, deleteAt });
    saveWnioskiDeletes(data);
}

const KOLORY = {
    ZIELONY: 0x268c3f,
    CZERWONY: 0xd94929,
    ZOLTY: 0xeab308
};

function kolorStatusu(status) {
    if (!status) return KOLORY.ZOLTY;
    const s = status.toLowerCase();
    if (s === "przyjęty" || s === "przyjety") return KOLORY.ZIELONY;
    if (s === "odrzucony") return KOLORY.CZERWONY;
    return KOLORY.ZOLTY;
}

// --- KROK 1: WPISANIE KOMENDY I DYNAMICZNE OTWARCIE MODALA ---
async function wyslijWniosek(interaction) {
    const user = interaction.options.getUser('osoba'); 
    const rodzaj = interaction.options.getString('rodzaj'); 
    const status = interaction.options.getString('status') || "Brak";
    const sesjaId = interaction.user.id;

    const wnioskodawcaMember = interaction.guild.members.cache.get(user.id);
    const nickWnioskodawcy = wnioskodawcaMember ? wnioskodawcaMember.displayName : user.username;

    aktywneSesjeWnioskow.set(sesjaId, { 
        user, 
        nickWnioskodawcy,
        rodzajTyp: rodzaj, 
        status 
    });

    const modal = new ModalBuilder()
        .setCustomId(`w5_modal_wniosek_${sesjaId}`)
        .setTitle(`Rozpatrzenie wniosku`);

    // DYNAMICZNE BUDOWANIE FORMULARZA W ZALEŻNOŚCI OD RODZAJU
    if (rodzaj === 'szw') {
        modal.setTitle('Wniosek: SZW');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_data_sluzby').setLabel('Data służby').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("np. DD.MM.RRRR")),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_dodatkowe').setLabel('Dodatkowe (Uwagi)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
    } 
    else if (rodzaj === 'zmiana_etatu') {
        modal.setTitle('Wniosek: Zmiana etatu');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_nowy_etat').setLabel('Nowy etat').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("np. Etat I, Etat II, Pół etatu")),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_dodatkowe').setLabel('Dodatkowe (Uwagi)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
    } 
    else if (rodzaj === 'urlop_zadanie') {
        modal.setTitle('Wniosek: Urlop na żądanie');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_dzien_wolny').setLabel('Dzień wolny (data)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("np. DD.MM.RRRR")),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_dodatkowe').setLabel('Dodatkowe (Uwagi)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
    }
    else if (rodzaj === 'urlop_wypocz') {
        modal.setTitle('Wniosek: Urlop wypoczynkowy');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_urlop_okres').setLabel('Urlop (od data do data)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("np. DD.MM - DD.MM.RRRR")),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_dodatkowe').setLabel('Dodatkowe (Uwagi)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
    }
    else if (rodzaj === 'stalka') {
        modal.setTitle('Wniosek: Stałka');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_staly_pojazd').setLabel('Stały pojazd').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("np. #123")),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_dodatkowe').setLabel('Dodatkowe (Uwagi)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
    }
    else if (rodzaj === 'zmiana_stalki') {
        modal.setTitle('Wniosek: Zmiana Stałki');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_nowy_pojazd').setLabel('Nowy pojazd').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder("np. #124")),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_dodatkowe').setLabel('Dodatkowe (Uwagi)').setStyle(TextInputStyle.Paragraph).setRequired(false))
        );
    }
    else if (rodzaj === 'zwolnienie') {
        modal.setTitle('Wniosek: Zwolnienie');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('w_dodatkowe').setLabel('Dodatkowe (Uwagi)').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder("Opcjonalny powód lub uwagi do zwolnienia"))
        );
    }

    return await interaction.showModal(modal);
}

// --- KROK 2: ODBIÓR FORMULARZA I GENEROWANIE RAPORTU/EMBEDU ---
async function obsluzKomponentyWniosku(interaction) {
    const sesjaId = interaction.user.id;
    const sesja = aktywneSesjeWnioskow.get(sesjaId);

    if (!sesja) {
        if (interaction.isModalSubmit()) {
            return interaction.reply({ content: "Twoja sesja wygasła. Wywołaj komendę ponownie.", flags: 64 });
        }
        return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('w5_modal_wniosek_')) {
        await interaction.deferReply();

        const nickRozpatrujacego = interaction.member.displayName;
        const polskaData = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
        
        // BEZPIECZNE POBIERANIE POLA DODATKOWE (nie crashuje jeśli pole istnieje/nie istnieje)
        let dodatkowe = "Brak";
        try {
            dodatkowe = interaction.fields.getTextInputValue('w_dodatkowe') || "Brak";
        } catch (e) {}

        let opisEmbed = `# Rozpatrzenie wniosku\n\n`;
        let logTekst = "";

        // Generowanie specyficznych pól per rodzaj wniosku
        if (sesja.rodzajTyp === 'szw') {
            const dataSluzby = interaction.fields.getTextInputValue('w_data_sluzby');
            opisEmbed += `**Rodzaj:** SZW\n`;
            opisEmbed += `**Kierowca:** ${sesja.nickWnioskodawcy}\n`;
            opisEmbed += `**Data służby:** ${dataSluzby}\n`;
            logTekst = `**Rodzaj:** SZW\n**Data służby:** ${dataSluzby}`;
        } 
        else if (sesja.rodzajTyp === 'zmiana_etatu') {
            const nowyEtat = interaction.fields.getTextInputValue('w_nowy_etat');
            opisEmbed += `**Rodzaj:** Zmiana etatu\n`;
            opisEmbed += `**Kierowca:** ${sesja.nickWnioskodawcy}\n`;
            opisEmbed += `**Nowy etat:** ${nowyEtat}\n`;
            logTekst = `**Rodzaj:** Zmiana etatu\n**Nowy etat:** ${nowyEtat}`;
        } 
        else if (sesja.rodzajTyp === 'urlop_zadanie') {
            const dzienWolny = interaction.fields.getTextInputValue('w_dzien_wolny');
            opisEmbed += `**Rodzaj:** Urlop na żądanie\n`;
            opisEmbed += `**Kierowca:** ${sesja.nickWnioskodawcy}\n`;
            opisEmbed += `**Dzień wolny (data):** ${dzienWolny}\n`;
            logTekst = `**Rodzaj:** Urlop na żądanie\n**Data:** ${dzienWolny}`;
        }
        else if (sesja.rodzajTyp === 'urlop_wypocz') {
            const urlopOkres = interaction.fields.getTextInputValue('w_urlop_okres');
            opisEmbed += `**Rodzaj:** Urlop wypoczynkowy\n`;
            opisEmbed += `**Kierowca:** ${sesja.nickWnioskodawcy}\n`;
            opisEmbed += `**Urlop (od data do data):** ${urlopOkres}\n`;
            logTekst = `**Rodzaj:** Urlop wypoczynkowy\n**Okres:** ${urlopOkres}`;
        }
        else if (sesja.rodzajTyp === 'stalka') {
            const stalyPojazd = interaction.fields.getTextInputValue('w_staly_pojazd');
            opisEmbed += `**Rodzaj:** Stałka\n`;
            opisEmbed += `**Kierowca:** ${sesja.nickWnioskodawcy}\n`;
            opisEmbed += `**Stały pojazd:** ${stalyPojazd}\n`;
            logTekst = `**Rodzaj:** Stałka\n**Pojazd:** ${stalyPojazd}`;
        }
        else if (sesja.rodzajTyp === 'zmiana_stalki') {
            const nowyPojazd = interaction.fields.getTextInputValue('w_nowy_pojazd');
            opisEmbed += `**Rodzaj:** Zmiana Stałki\n`;
            opisEmbed += `**Kierowca:** ${sesja.nickWnioskodawcy}\n`;
            opisEmbed += `**Nowy pojazd:** ${nowyPojazd}\n`;
            logTekst = `**Rodzaj:** Zmiana Stałki\n**Nowy pojazd:** ${nowyPojazd}`;
        }
        else if (sesja.rodzajTyp === 'zwolnienie') {
            opisEmbed += `**Rodzaj:** Zwolnienie\n`;
            opisEmbed += `**Kierowca:** ${sesja.nickWnioskodawcy}\n`;
            logTekst = `**Rodzaj:** Zwolnienie`;
        }

        // Wspólne pola dla każdego rodzaju wniosku
        opisEmbed += `**Status:** ${sesja.status}\n`;
        opisEmbed += `**Rozpatrujący:** ${nickRozpatrujacego}\n`;
        opisEmbed += `**Data rozpatrzenia:** ${polskaData}\n`;
        opisEmbed += `**Dodatkowe:** ${dodatkowe}\n\n`;
        opisEmbed += `*Wiadomość została wygenerowana automatycznie. Prosimy na nią nie odpowiadać*`;

        const embed = new EmbedBuilder()
            .setColor(kolorStatusu(sesja.status))
            .setDescription(opisEmbed)
            .setFooter({ text: "Jelonek MZK • © vMZK Jelenia Góra 2026 | 5.0.2" });

        // DM do pracownika
        await sesja.user.send({ embeds: [embed] }).catch(() => {});

        // Wiadomość na kanale publicznym
        const odpowiedz = await interaction.editReply({
            content: `# Wniosek wysłany do ${sesja.nickWnioskodawcy}\n\n${logTekst}\n**Status:** ${sesja.status}\n**Data rozpatrzenia:** ${polskaData}\n**Dodatkowe informacje:** ${dodatkowe}\n\n*Ta informacja zniknie automatycznie za 10 dni.*`,
        });

        try {
            zarejestrujDoUsuniecia(odpowiedz.id, interaction.channelId);
            console.log(`[WNIOSKI] Zapisano wiadomość ${odpowiedz.id} do skasowania za 10 dni.`);
        } catch (err) {
            console.error("Błąd zapisu autodelete wniosku:", err);
        }

        aktywneSesjeWnioskow.delete(sesjaId);
    }
}

function uruchomWnioskiAutodelete(client) {
    setInterval(async () => {
        let data = loadWnioskiDeletes();
        if (data.length === 0) return;

        const now = Date.now();
        const pozostale = [];

        for (const item of data) {
            if (now >= item.deleteAt) {
                try {
                    const channel = await client.channels.fetch(item.channelId);
                    if (channel) {
                        const msg = await channel.messages.fetch(item.msgId);
                        if (msg) {
                            await msg.delete();
                            console.log(`[WNIOSKI] Wiadomość ${item.msgId} została pomyślnie usunięta po 10 dniach.`);
                        }
                    }
                } catch (e) {
                    if (e.code !== 10008 && e.code !== 10003) {
                        console.error("[WNIOSKI AUTODELETE ERROR]:", e);
                    }
                }
            } else {
                pozostale.push(item);
            }
        }

        saveWnioskiDeletes(pozostale);
    }, 15 * 60 * 1000); 
}

module.exports = { wyslijWniosek, obsluzKomponentyWniosku, uruchomWnioskiAutodelete };