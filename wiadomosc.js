const { MessageFlags } = require('discord.js');

async function wyslijWiadomosc(interaction) {
    const kanal = interaction.options.getChannel('kanal');
    const oznacz = interaction.options.getMentionable('oznacz');
    const replyId = interaction.options.getString('reply_id');

    if (!kanal.isTextBased()) {
        return interaction.reply({
            content: "Wskazany kanał musi być kanałem tekstowym!",
            flags: MessageFlags.Ephemeral
        });
    }

    // Wyświetlamy instrukcję widoczną tylko dla wykonującego komendę
    await interaction.reply({
        content: `**Tryb pisania wiadomości aktywny!**\nNapisz poniżej na czacie treść, którą chcesz wysłać na kanał ${kanal}.\n\n*Możesz używać Enterów, nagłówków (#) i pełnego formatowania. Masz na to 3 minuty (lub wpisz \`anuluj\`).*`,
        flags: MessageFlags.Ephemeral
    });

    // Nasłuchujemy tylko wiadomości od osoby, która wywołała komendę
    const filter = m => m.author.id === interaction.user.id;
    
    const collector = interaction.channel.createMessageCollector({ 
        filter, 
        time: 180000, // 3 minuty na wpisanie
        max: 1 
    });

    collector.on('collect', async (collectedMessage) => {
        const tresc = collectedMessage.content;

        // Jeśli użytkownik się rozmyślił
        if (tresc.toLowerCase() === 'anuluj') {
            await collectedMessage.delete().catch(() => {});
            return interaction.followUp({
                content: "Anulowano wysyłanie wiadomości.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Usuwamy roboczą wiadomość użytkownika z czatu
        await collectedMessage.delete().catch(() => {});

        let pelnaTresc = tresc;

        // Jeśli wybrano rolę/użytkownika do oznaczenia, doklejamy go na samej górze
        if (oznacz) {
            pelnaTresc = `<@&${oznacz.id}>\n${pelnaTresc}`;
        }

        const payload = {
            content: pelnaTresc,
            allowedMentions: { parse: ['users', 'roles', 'everyone'] }
        };

        try {
            if (replyId) {
                try {
                    const targetMessage = await kanal.messages.fetch(replyId);
                    await targetMessage.reply(payload);
                } catch (e) {
                    return interaction.followUp({
                        content: `Nie znaleziono wiadomości o ID \`${replyId}\` na kanale ${kanal}.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            } else {
                await kanal.send(payload);
            }

            await interaction.followUp({
                content: replyId 
                    ? `Odpowiedź wysłana na kanał ${kanal} (odpowiedź do wiadomości \`${replyId}\`).`
                    : `Wiadomość została pomyślnie wysłana na kanał ${kanal}.`,
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error("Błąd wysyłania przechwyconej wiadomości:", error);
            await interaction.followUp({
                content: "Wystąpił błąd podczas próby wysłania wiadomości na kanał docelowy.",
                flags: MessageFlags.Ephemeral
            });
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            interaction.followUp({
                content: "Czas na wpisanie wiadomości minął (3 minuty). Spróbuj ponownie.",
                flags: MessageFlags.Ephemeral
            });
        }
    });
}

module.exports = { wyslijWiadomosc };