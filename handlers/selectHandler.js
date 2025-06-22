const ticketHandler = require('./ticketHandler.js');
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config.js');

async function handleSelect(interaction) {
        const customId = interaction.customId;

        try {
            if (customId === 'ticket_category_select') {
                const category = interaction.values[0];
                const categoryInfo = config.tickets.ticketCategories[category];

                // Create confirmation modal
                const modal = new ModalBuilder()
                    .setCustomId(`ticket_confirm_${category}`)
                    .setTitle(`${categoryInfo.emoji} ${categoryInfo.name}`);

                const reasonInput = new TextInputBuilder()
                    .setCustomId('ticket_reason')
                    .setLabel('Please describe your issue')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder(`Describe your ${categoryInfo.name.toLowerCase()} request in detail...`)
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(1000);

                const priorityInput = new TextInputBuilder()
                    .setCustomId('ticket_priority')
                    .setLabel('Priority Level (Low/Medium/High)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Low')
                    .setRequired(false)
                    .setMaxLength(10);

                const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
                const secondActionRow = new ActionRowBuilder().addComponents(priorityInput);

                modal.addComponents(firstActionRow, secondActionRow);

                await interaction.showModal(modal);
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

module.exports = { handleSelect };
