const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { MessageFlags } = require('discord.js');

module.exports = {
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const member = interaction.member;

        if (subcommand === 'join') {
            // Sprawdzamy, czy użytkownik jest na kanale głosowym
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: 'Musisz znajdować się na kanale głosowym, aby mnie tam przywołać!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: false
                });

                return interaction.reply({
                    content: `Dołączono do kanału głosowego: **${voiceChannel.name}**!`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (err) {
                console.error("Błąd podczas dołączania do VC:", err);
                return interaction.reply({
                    content: 'Wystąpił błąd podczas próby dołączenia do kanału głosowego.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        if (subcommand === 'leave') {
            const connection = getVoiceConnection(interaction.guild.id);

            if (!connection) {
                return interaction.reply({
                    content: 'Nie znajduję się obecnie na żadnym kanale głosowym na tym serwerze.',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                connection.destroy();
                return interaction.reply({
                    content: 'Pomyślnie rozłączono z kanału głosowego.',
                    flags: MessageFlags.Ephemeral
                });
            } catch (err) {
                console.error("Błąd podczas rozłączania z VC:", err);
                return interaction.reply({
                    content: 'Wystąpił błąd podczas próby opuszczenia kanału głosowego.',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
};const { SlashCommandBuilder } = require('discord.js');

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
