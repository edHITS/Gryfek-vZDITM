require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const commands = [   
    new SlashCommandBuilder()
        .setName('wniosek')
        .setDescription('Wyślij rozpatrzenie wniosku')
        .addUserOption(option =>
            option.setName('osoba')
                .setDescription('Wyślij do')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('rodzaj')
                .setDescription('Rodzaj wniosku')
                .setRequired(true)
                .addChoices(
                    { name: 'SZW', value: 'szw' },
                    { name: 'Zmiana etatu', value: 'zmiana_etatu' },
                    { name: 'Urlop na żądanie', value: 'urlop_zadanie' },
                    { name: 'Urlop wypoczynkowy', value: 'urlop_wypocz' },
                    { name: 'Stałka', value: 'stalka' },
                    { name: 'Zmiana Stałki', value: 'zmiana_stalki' },
                    { name: 'Zwolnienie', value: 'zwolnienie' }
                )
        )
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Status')
                .setRequired(true)
                .addChoices(
                    { name: 'Przyjęty', value: 'Przyjęty' },
                    { name: 'Odrzucony', value: 'Odrzucony' }
                )
        ),

    new SlashCommandBuilder()
        .setName('wiadomosc')
        .setDescription('Wyślij wiadomość tekstową na wybrany kanał.')
        .addChannelOption(option => 
            option.setName('kanal')
                .setDescription('Kanał, na który ma zostać wysłana wiadomość')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption(option => 
            option.setName('tresc')
                .setDescription('Treść wiadomości (użyj \\n aby zrobić nową linię)')
                .setRequired(true)
        )
        .addMentionableOption(option => 
            option.setName('oznacz')
                .setDescription('Opcjonalna rola lub użytkownik, którego bot ma oznaczyć na początku wiadomości')
                .setRequired(false)
        )
        .addStringOption(option => 
            option.setName('reply_id')
                .setDescription('Opcjonalne ID wiadomości z wybranego kanału, na którą bot ma odpowiedzieć')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Otwórz tajny panel zarządzania'),

    // --- NOWA KOMENDA STATUS ---
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Zmień status oraz opis aktywności bota')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('tryb')
                .setDescription('Wybierz tryb bota')
                .setRequired(true)
                .addChoices(
                    { name: 'Dostępny (Zielony)', value: 'online' },
                    { name: 'Zaraz wracam (Żółty)', value: 'idle' },
                    { name: 'Nie przeszkadzać (Czerwony)', value: 'dnd' },
                    { name: 'Niedostępny (Szary)', value: 'invisible' }
                )
        )
        .addStringOption(option =>
            option.setName('opis')
                .setDescription('Opis pod nazwą bota (Custom Status)')
                .setRequired(false)
        )
];

module.exports = { commands };

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("Rejestruję zaktualizowane komendy...");
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log("OK - komendy dodane pomyślnie!");
    } catch (err) {
        console.error(err);
    }
})();
