const { SlashCommandBuilder } = require('discord.js');
const { 
    joinVoiceChannel, 
    getVoiceConnection, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus 
} = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Zarządzanie połączeniem głosowym bota')
        .addSubcommand(sub =>
            sub.setName('join')
               .setDescription('Dołącz bota do Twojego kanału głosowego')
        )
        .addSubcommand(sub =>
            sub.setName('leave')
               .setDescription('Rozłącz bota z kanału głosowego')
        )
        .addSubcommand(sub =>
            sub.setName('play')
               .setDescription('Odtwórz plik dźwiękowy na kanale')
               .addStringOption(opt => 
                   opt.setName('url')
                      .setDescription('Link do pliku audio (mp3/wav)')
                      .setRequired(true)
               )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const memberVoiceChannel = interaction.member.voice.channel;

        if (subcommand === 'join') {
            if (!memberVoiceChannel) {
                return interaction.reply({ 
                    content: ' Musisz znajdować się na kanale głosowym!', 
                    ephemeral: true 
                });
            }

            joinVoiceChannel({
                channelId: memberVoiceChannel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: false, // false = bot słyszy (nie jest przygłuszony)
                selfMute: false  // false = bot może mówić/odtwarzać dźwięk
            });

            return interaction.reply({ 
                content: ` Dołączono do kanału **${memberVoiceChannel.name}**!`, 
                ephemeral: true 
            });
        }

        if (subcommand === 'leave') {
            const connection = getVoiceConnection(interaction.guild.id);
            if (!connection) {
                return interaction.reply({ 
                    content: ' Bot nie znajduje się na żadnym kanale głosowym.', 
                    ephemeral: true 
                });
            }

            connection.destroy();
            return interaction.reply({ 
                content: ' Rozłączono z kanału głosowego.', 
                ephemeral: true 
            });
        }

        if (subcommand === 'play') {
            const connection = getVoiceConnection(interaction.guild.id);
            if (!connection) {
                return interaction.reply({ 
                    content: ' Bot musi najpierw dołączyć do kanału (`/vc join`).', 
                    ephemeral: true 
                });
            }

            const soundUrl = interaction.options.getString('url');
            const player = createAudioPlayer();
            const resource = createAudioResource(soundUrl);

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Playing, () => {
                interaction.reply({ content: ` Odtwarzanie dźwięku ze źródła...`, ephemeral: true });
            });

            player.on('error', error => {
                console.error('Błąd odtwarzacza:', error);
                interaction.reply({ content: ' Wystąpił błąd podczas odtwarzania pliku.', ephemeral: true });
            });
        }
    }
};
