const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Zarządzaj połączeniem głosowym bota')
        .addSubcommand(sub =>
            sub.setName('join')
                .setDescription('Dołącz bota do kanału głosowego')
        )
        .addSubcommand(sub =>
            sub.setName('leave')
                .setDescription('Rozłącz bota z kanału głosowego')
        ),

    async execute(interaction) {
        // Twoja logika dla komendy /vc
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'join') {
            await interaction.reply({ content: 'Dołączono do kanału!', ephemeral: true });
        } else if (subcommand === 'leave') {
            await interaction.reply({ content: 'Rozłączono z kanału!', ephemeral: true });
        }
    }
};
