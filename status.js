const { SlashCommandBuilder, ActivityType, PermissionFlagsBits } = require('discord.js');

module.exports = {
    // Definicja komendy dla komendy.js
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Zmień status oraz opis aktywności bota')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Dostęp tylko dla administratorów
        .addStringOption(option =>
            option.setName('tryb')
                .setDescription('Wybierz widoczność bota')
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
                .setDescription('Napis wyświetlany w profilu bota (Custom Status)')
                .setRequired(false)
        ),

    // Logika obsługi zdarzenia w index.js
    async execute(interaction) {
        const status = interaction.options.getString('tryb');
        const opis = interaction.options.getString('opis') || '';

        try {
            await interaction.client.user.setPresence({
                status: status,
                activities: [{
                    type: ActivityType.Custom,
                    name: 'custom',
                    state: opis
                }]
            });

            await interaction.reply({
                content: ` Status bota został pomyślnie zmieniony na **${status}**${opis ? ` z opisem: *"${opis}"*` : ''}.`,
                ephemeral: true // Wiadomość widoczna tylko dla osoby wywołującej
            });
        } catch (error) {
            console.error('Błąd podczas zmiany statusu:', error);
            await interaction.reply({
                content: ' Wystąpił błąd podczas próby zmiany statusu bota.',
                ephemeral: true
            });
        }
    }
};
