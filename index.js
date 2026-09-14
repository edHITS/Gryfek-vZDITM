require('dotenv').config();
const { Client, GatewayIntentBits, Partials, MessageFlags, ActivityType } = require('discord.js');
const fs = require('fs');
const express = require('express');

const BOT_STATUS = 'idle'; 
// 'online' -> Dostępny (Zielona)
// 'idle' -> Zaraz wracam (Żółta)
// 'dnd' -> Nie przeszkadzać / Zajęty (Czerwona)
// 'invisible' -> Niedostępny (Szara)

// POPRAWKA: Importujemy obsluzKomponentyWniosku z modułu wniosek
// const { wyslijWniosek, obsluzKomponentyWniosku, uruchomWnioskiAutodelete } = require('./wniosek');
// const { obsluzRaport, obsluzKomponentyPanelu, uruchomRaportyAutodelete } = require('./raport');
// const { przydzielSluzbe } = require('./grafik');
// const { wyslijKod_Pracownika } = require('./kod_pracownika');
// const { wyslijRozpatrzeniePracy } = require('./praca');
const { obsluzZdjecia, cleanExpiredWarnings, autoDeleteWorker, obsluzReakcjeGalerii } = require('./zdjecia');
// const { wyslijZwolnienieDyscyplinarne } = require('./dyscyplinarka');
const { wyslijWiadomosc } = require('./wiadomosc');
// const { getDateOptions } = require('./data_parser');

// NOWE: Import obsługi panelu administracyjnego Edhitsa
// const { obsluzPanelKomenda, obsluzKomponentyPaneluEdhitsa } = require('./panel');

// const pojazdy = require('./json/pojazdy.json');
// const bledyLista = require('./json/bledy.json');

const LOG_FILE = "./logs.txt";

setInterval(cleanExpiredWarnings, 5 * 60 * 1000);

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => { res.status(204).end(); });
app.listen(port, () => {});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [
        Partials.Channel, 
        Partials.Message, 
        Partials.Reaction
    ]
});

function logCommand(section, interaction) {
    const user = interaction.user;
    const time = new Date().toLocaleString("pl-PL");
    const options = interaction.options.data
        .map(opt => opt.user ? `${opt.name}: ${opt.user.username}` : `${opt.name}: ${opt.value}`)
        .join(" | ");

    const logEntry = `\n===================\n${section.toUpperCase()}\n===================\nCzas: ${time}\nUżytkownik: ${user.tag}\nKomenda: /${interaction.commandName}\nOpcje: ${options}\n-------------------\n`;
    fs.appendFileSync(LOG_FILE, logEntry, "utf8");
}

const ed_DISCORD_ID = "1188159976523452527"; 

const ALLOWED_CHANNEL_ID = "1548956326720311327";
const COMMAND_PERMISSIONS = {
    wiadomosc: { 
        roles: [], 
        users: ["1188159976523452527"]
    },
    panel: {
        roles: [],
        users: ["1188159976523452527"]
    }
};

function hasCommandAccess(interaction) {
    const member = interaction.member;
    const command = interaction.commandName;

    if (interaction.channelId !== ALLOWED_CHANNEL_ID) return false;

    if (BOT_STATUS === 'dnd' && member.id !== ed_DISCORD_ID) {
        return false;
    }

    const perm = COMMAND_PERMISSIONS[command];
    if (!perm) return false;

    if (perm.users?.includes(member.id)) return true;
    if (member.roles.cache.some(r => perm.roles?.includes(r.id))) return true;

    return false;
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu() || interaction.isButton() || interaction.isModalSubmit()) {
        const cId = interaction.customId;
        if (cId && cId.startsWith('ed_')) {
            try {
                await obsluzKomponentyPaneluEdhitsa(interaction, client);
            } catch (err) {
                console.error("Błąd w komponentach panelu Edhitsa:", err);
            }
            return;
        }

        if (cId && cId.startsWith('w5_')) {
            try {
                if (cId.startsWith('w5_modal_czesc1_') || cId.startsWith('w5_modal_czesc2_') || cId === 'w5_btn_otworz_czesc2') {
                    await obsluzKomponentyPanelu(interaction);
                    return;
                }

                if (cId.startsWith('w5_modal_wniosek_')) {
                    await obsluzKomponentyWniosku(interaction);
                    return;
                }
            } catch (err) {
                console.error("Błąd w komponentach panelu v6.0.1:", err);
            }
            return;
        }
    }
    
    if (!interaction.isChatInputCommand()) return;

    if (!hasCommandAccess(interaction)) {
        return interaction.reply({
            content: "Brak dostępu do tej komendy lub użyto jej na niewłaściwym kanale.",
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        
        if (interaction.commandName === 'wniosek') {
            logCommand("WNIOSKI", interaction);
            await wyslijWniosek(interaction);
            return;
        }

        if (interaction.commandName === 'wiadomosc') {
            logCommand("WIADOMOSC", interaction);
            await wyslijWiadomosc(interaction);
            return;
        }

        if (interaction.commandName === 'panel') {
            logCommand("PANEL EDHITSA", interaction);
            await obsluzPanelKomenda(interaction);
            return;
        }

    } catch (err) {
        console.error(err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Błąd systemu",
                flags: MessageFlags.Ephemeral
            });
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot || !reaction.message.guild) return;

    if (user.id === ed_DISCORD_ID) {
        if (reaction.partial) { try { await reaction.fetch(); } catch {} }
        if (reaction.message.partial) { try { await reaction.message.fetch(); } catch {} }

        const isX = reaction.emoji.name === '❌' || reaction.emoji.name === '\u274C';
        if (isX && reaction.message.author.id === client.user.id) {
            try {
                await reaction.message.delete();
                return;
            } catch (err) {
                console.error(err);
            }
        }
    }
    
    await obsluzReakcjeGalerii(reaction, user);
});

client.on('messageCreate', async (message) => {
    await obsluzZdjecia(message);
});

client.once('ready', async () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
    
    client.user.setPresence({
        status: BOT_STATUS,
        activities: [{
            type: ActivityType.Custom,
            name: '',
            state: ''
        }]
    });
    
    try {
        const kanalKomend = await client.channels.fetch(ALLOWED_CHANNEL_ID);
        if (kanalKomend && kanalKomend.isTextBased()) {
            const guild = kanalKomend.guild;

            if (BOT_STATUS === 'dnd') {
                await kanalKomend.permissionOverwrites.edit(guild.roles.everyone, {
                    SendMessages: false
                });

                try {
                    const bossUser = await guild.members.fetch(ed_DISCORD_ID);
                    if (bossUser) {
                        await kanalKomend.permissionOverwrites.edit(bossUser, {
                            SendMessages: true,
                            ViewChannel: true
                        });
                    }
                } catch (userErr) {
                    console.error(`[STATUS] Nie znaleziono użytkownika o ID ${ed_DISCORD_ID} na tym serwerze, pomijam nadpisanie.`);
                }

                console.log(`[STATUS] Kanał ${ALLOWED_CHANNEL_ID} został ZABLOKOWANY (Status: DND).`);
            } else {
                await kanalKomend.permissionOverwrites.edit(guild.roles.everyone, {
                    SendMessages: null 
                });
                
                try {
                    const bossUser = await guild.members.fetch(ed_DISCORD_ID);
                    if (bossUser) {
                        await kanalKomend.permissionOverwrites.edit(bossUser, {
                            SendMessages: null
                        });
                    }
                } catch (e) {}

                console.log(`[STATUS] Kanał ${ALLOWED_CHANNEL_ID} został ODBLOKOWANY.`);
            }
        }
    } catch (err) {
        console.error("Błąd podczas ustawiania uprawnień kanału przy starcie:", err);
    }

    autoDeleteWorker(client);
    uruchomWnioskiAutodelete(client);
    uruchomRaportyAutodelete(client);
});

client.login(process.env.TOKEN);