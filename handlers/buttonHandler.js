const ticketHandler = require('./ticketHandler.js');

async function handleButton(interaction) {
        const customId = interaction.customId;

        try {
            // Check if interaction is already responded to or deferred
            if (interaction.replied || interaction.deferred) {
                return;
            }

            // Handle disabled buttons (do nothing)
            if (customId.includes('_disabled')) {
                return await interaction.reply({
                    content: '❌ This suggestion has already been processed and interactions are disabled.',
                    ephemeral: true
                });
            }

            // Defer interaction for suggestion operations that might take time
            if (customId.startsWith('suggestion_')) {
                await interaction.deferReply({ ephemeral: true });
            }
            if (customId.startsWith('ticket_close_')) {
                const channelId = customId.split('_')[2];
                await ticketHandler.closeTicket(interaction, channelId);
            }
            else if (customId.startsWith('ticket_claim_')) {
                const channelId = customId.split('_')[2];
                await ticketHandler.claimTicket(interaction, channelId);
            }
            else if (customId.startsWith('ticket_transcript_')) {
                const channelId = customId.split('_')[2];
                await handleTranscript(interaction, channelId);
            }
            else if (customId === 'ticket_quick_create') {
                // Show modal for quick ticket creation
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                const config = require('../config.js');

                const modal = new ModalBuilder()
                    .setCustomId('ticket_confirm_general')
                    .setTitle('🎫 Quick Support Ticket');

                const reasonInput = new TextInputBuilder()
                    .setCustomId('ticket_reason')
                    .setLabel('Please describe your issue')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Describe your general support request in detail...')
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
            else if (customId.startsWith('suggestion_approve_')) {
                const suggestionHandler = require('./suggestionHandler.js');
                const suggestionId = parseInt(customId.split('_')[2]);
                await suggestionHandler.approveSuggestion(interaction, suggestionId);
            }
            // Handle specific deny buttons first (more specific patterns)
            else if (customId.startsWith('suggestion_deny_anonymous_')) {
                const suggestionHandler = require('./suggestionHandler.js');
                const suggestionId = parseInt(customId.split('_')[3]);

                const data = await suggestionHandler.getSuggestionData();
                const suggestion = data.suggestions[suggestionId];

                if (!suggestion) {
                    if (interaction.replied || interaction.deferred) {
                        return interaction.editReply({
                            content: `❌ Suggestion #${suggestionId} not found.`,
                            embeds: [],
                            components: []
                        });
                    } else {
                        return interaction.update({
                            content: `❌ Suggestion #${suggestionId} not found.`,
                            embeds: [],
                            components: []
                        });
                    }
                }

                // Update the interaction to remove the buttons first
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: '⏳ Processing denial...',
                        embeds: [],
                        components: []
                    });
                } else {
                    await interaction.update({
                        content: '⏳ Processing denial...',
                        embeds: [],
                        components: []
                    });
                }

                await suggestionHandler.processSuggestionDenial(interaction, suggestionId, suggestion, false);
            }
            else if (customId.startsWith('suggestion_deny_reveal_')) {
                const suggestionHandler = require('./suggestionHandler.js');
                const suggestionId = parseInt(customId.split('_')[3]);

                const data = await suggestionHandler.getSuggestionData();
                const suggestion = data.suggestions[suggestionId];

                if (!suggestion) {
                    if (interaction.replied || interaction.deferred) {
                        return interaction.editReply({
                            content: `❌ Suggestion #${suggestionId} not found.`,
                            embeds: [],
                            components: []
                        });
                    } else {
                        return interaction.update({
                            content: `❌ Suggestion #${suggestionId} not found.`,
                            embeds: [],
                            components: []
                        });
                    }
                }

                // Update the interaction to remove the buttons first
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: '⏳ Processing denial and revealing user...',
                        embeds: [],
                        components: []
                    });
                } else {
                    await interaction.update({
                        content: '⏳ Processing denial and revealing user...',
                        embeds: [],
                        components: []
                    });
                }

                await suggestionHandler.processSuggestionDenial(interaction, suggestionId, suggestion, true);
            }
            else if (customId.startsWith('suggestion_deny_cancel_')) {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: '↩️ Denial cancelled.',
                        embeds: [],
                        components: []
                    });
                } else {
                    await interaction.update({
                        content: '↩️ Denial cancelled.',
                        embeds: [],
                        components: []
                    });
                }
            }
            // Handle general deny button (must be after specific deny buttons)
            else if (customId.startsWith('suggestion_deny_')) {
                const suggestionHandler = require('./suggestionHandler.js');
                const suggestionId = parseInt(customId.split('_')[2]);
                await suggestionHandler.denySuggestion(interaction, suggestionId);
            }
            else if (customId.startsWith('suggestion_upvote_')) {
                const suggestionHandler = require('./suggestionHandler.js');
                const suggestionId = parseInt(customId.split('_')[2]);
                await suggestionHandler.voteSuggestion(interaction, suggestionId, 'upvote');
            }
            else if (customId.startsWith('suggestion_downvote_')) {
                const suggestionHandler = require('./suggestionHandler.js');
                const suggestionId = parseInt(customId.split('_')[2]);
                await suggestionHandler.voteSuggestion(interaction, suggestionId, 'downvote');
            }
            else if (customId.startsWith('suggestion_consider_')) {
                const suggestionHandler = require('./suggestionHandler.js');
                const suggestionId = parseInt(customId.split('_')[2]);
                await suggestionHandler.considerSuggestion(interaction, suggestionId);
            }
            else {
                await interaction.reply({
                    content: '❌ Unknown button interaction.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('[ERROR] Button handler error:', error);
            
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

async function handleTranscript(interaction, channelId) {
        try {
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                return interaction.reply({
                    content: '❌ Channel not found.',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const transcript = await ticketHandler.generateTranscript(channel);
            
            if (transcript) {
                await interaction.editReply({
                    content: '📄 Here is the ticket transcript:',
                    files: [transcript]
                });
            } else {
                await interaction.editReply({
                    content: '❌ Failed to generate transcript.'
                });
            }
        } catch (error) {
            console.error('[ERROR] Failed to generate transcript:', error);
            await interaction.editReply({
                content: '❌ Failed to generate transcript.'
            });
        }
    }

module.exports = { handleButton };
