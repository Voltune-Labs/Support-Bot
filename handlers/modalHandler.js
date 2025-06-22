async function handleModal(interaction) {
        const customId = interaction.customId;

        try {
            if (customId.startsWith('suggestion_modal')) {
                const suggestionHandler = require('./suggestionHandler.js');
                await suggestionHandler.handleSuggestionModal(interaction);
            }
            else if (customId.startsWith('report_modal')) {
                // Handle report modals if needed
                await interaction.reply({
                    content: '✅ Report submitted successfully.',
                    ephemeral: true
                });
            }
            else if (customId.startsWith('ticket_confirm_')) {
                const category = customId.split('_')[2];
                const reason = interaction.fields.getTextInputValue('ticket_reason');
                const priority = interaction.fields.getTextInputValue('ticket_priority') || 'Low';

                const ticketHandler = require('./ticketHandler.js');
                await ticketHandler.createTicketWithDetails(interaction, category, reason, priority);
            }
            else {
                await interaction.reply({
                    content: '❌ Unknown modal interaction.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('[ERROR] Modal handler error:', error);
            
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

module.exports = { handleModal };
