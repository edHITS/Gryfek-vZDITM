require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');

const commands = [   
    // 1. Komenda /wniosek
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

    // 2. Komenda /wiadomosc
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

    // 3. Komenda /panel
    new SlashCommandBuilder()
        .setName('panel')
        .setDescription('Otwórz tajny panel zarządzania'),

    // 4. Komenda /status
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Zmień status bota')
        .addStringOption(option =>
            option.setName('tryb')
                .setDescription('Wybierz status bota')
                .setRequired(true)
                .addChoices(
                    { name: 'Dostępny (Online)', value: 'online' },
                    { name: 'Zaraz wracam (Idle)', value: 'idle' },
                    { name: 'Nie przeszkadzać (DND)', value: 'dnd' },
                    { name: 'Niedostępny (Invisible)', value: 'invisible' }
                )
        ),

    // 5. Komenda /vc (wpisana bezpośrednio)
    new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Zarządzaj połączeniem bota na kanale głosowym')
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Dołącz bota do Twojego kanału głosowego')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Rozłącz bota z kanału głosowego')
        )
].map(command => command.toJSON());

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
        console.error("Błąd rejestracji komend:", err);
    }
})();
