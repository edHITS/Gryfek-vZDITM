const { MessageFlags } = require('discord.js');

async function wyslijWiadomosc(interaction) {
    const kanal = interaction.options.getChannel('kanal');
    const tresc = interaction.options.getString('tresc');
    const oznacz = interaction.options.getMentionable('oznacz') || null;
    const replyId = interaction.options.getString('reply_id') || null; 

    // Walidacja czy wskazany kanał jest tekstowy
    if (!kanal.isTextBased()) {
        return interaction.reply({
            content: "Wskazany kanał musi być kanałem tekstowym!",
            flags: MessageFlags.Ephemeral
        });
    }

    try {
        // Zamiana tekstowego \n na realne przejście do nowej linii
        let pelnaTresc = tresc.replace(/\\n/g, '\n');

        // Jeśli wybrano opcję oznaczenia, doklejamy wzmiankę na samej górze
        if (oznacz) {
            pelnaTresc = `${oznacz}\n${pelnaTresc}`;
        }

        const payload = {
            content: pelnaTresc,
            allowedMentions: { parse: ['users', 'roles', 'everyone'] }
        };

        if (replyId) {
            try {
                const targetMessage = await kanal.messages.fetch(replyId);
                await targetMessage.reply(payload);
            } catch (e) {
                return interaction.reply({
                    content: `❌ Nie znaleziono wiadomości o ID \`${replyId}\` na kanale ${kanal}. Upewnij się, że ID jest poprawne.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        } else {
            // Standardowe wysyłanie jako nowa wiadomość
            await kanal.send(payload);
        }

        return interaction.reply({
            content: replyId 
                ? `Pomyślnie wysłano odpowiedź na wiadomość (\`${replyId}\`) na kanale ${kanal}.`
                : `Pomyślnie wysłano wiadomość na kanał ${kanal}.`,
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        console.error("Błąd podczas wysyłania wiadomości tekstowej (wiadomosc.js):", error);
        return interaction.reply({
            content: "Wystąpił błąd podczas próby wysłania wiadomości.",
            flags: MessageFlags.Ephemeral
        });
    }
}

module.exports = { wyslijWiadomosc };