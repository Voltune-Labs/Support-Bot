const ticketHandler = require('./ticketHandler.js');

async function handleSelect(interaction) {
        const customId = interaction.customId;

        try {
            if (customId === 'ticket_category_select') {
                const category = interaction.values[0];
                await ticketHandler.createTicket(interaction, category);
            }
            else {
                await interaction.reply({
                    content: '❌ Unknown select menu interaction.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('[ERROR] Select handler error:', error);
            
            const errorMessage = {
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
}

module.exports = { handleSelect };
