const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const config = require('../config.js');
const PermissionManager = require('../utils/permissions.js');
const fs = require('fs-extra');
const path = require('path');

class SuggestionHandler {
    constructor() {
        this.suggestionsPath = path.join(__dirname, '../data/suggestions.json');
        this.ensureSuggestionData();
    }

    async ensureSuggestionData() {
        try {
            await fs.ensureFile(this.suggestionsPath);
            const data = await fs.readJson(this.suggestionsPath).catch(() => ({}));
            if (!data.suggestions) {
                await fs.writeJson(this.suggestionsPath, { suggestions: {}, counter: 0 });
            }
        } catch (error) {
            console.error('[ERROR] Failed to ensure suggestion data:', error);
        }
    }

    async getSuggestionData() {
        try {
            return await fs.readJson(this.suggestionsPath);
        } catch (error) {
            console.error('[ERROR] Failed to read suggestion data:', error);
            return { suggestions: {}, counter: 0 };
        }
    }

    async saveSuggestionData(data) {
        try {
            await fs.writeJson(this.suggestionsPath, data);
        } catch (error) {
            console.error('[ERROR] Failed to save suggestion data:', error);
        }
    }

    async createSuggestion(interaction, title, description, anonymous = false) {
        try {
            const data = await this.getSuggestionData();
            const suggestionId = ++data.counter;
            
            const guild = interaction.guild;
            const suggestionChannel = guild.channels.cache.get(config.channels.suggestions);
            
            if (!suggestionChannel) {
                return interaction.reply({
                    content: '❌ Suggestion channel not found. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Create suggestion embed with forum-style layout
            const suggestionEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setAuthor({
                    name: `Suggestion #${suggestionId}`,
                    iconURL: interaction.guild.iconURL() || undefined
                })
                .addFields(
                    {
                        name: '**Submitter**',
                        value: anonymous ? 'Anonymous' : interaction.user.username,
                        inline: true
                    },
                    {
                        name: '**Status**',
                        value: '🟡 Pending',
                        inline: true
                    },
                    {
                        name: '\u200b',
                        value: '\u200b',
                        inline: true
                    },
                    {
                        name: '**Suggestion**',
                        value: `**${title}**\n\n${description}`,
                        inline: false
                    },
                    {
                        name: '**Results so far**',
                        value: `${config.suggestions.votingEmojis.upvote} **0**\n${config.suggestions.votingEmojis.downvote} **0**`,
                        inline: true
                    }
                )
                .setThumbnail(
                    (config.suggestions.showUserThumbnail && !anonymous) ?
                    interaction.user.displayAvatarURL({ dynamic: true }) : null
                );

            // Add footer if configured
            if (config.suggestions.showUserIdInFooter || config.suggestions.showTimestamp) {
                let footerText = '';
                if (config.suggestions.showUserIdInFooter) {
                    footerText += `User ID: ${interaction.user.id} | ${anonymous ? 'Anonymous' : interaction.user.tag}`;
                }
                if (config.suggestions.showTimestamp) {
                    if (footerText) footerText += ' • ';
                    footerText += new Date().toLocaleString();
                }

                suggestionEmbed.setFooter({
                    text: footerText,
                    iconURL: (anonymous || !config.suggestions.showUserThumbnail) ? undefined : interaction.user.displayAvatarURL({ dynamic: true })
                });
            }

            if (config.suggestions.showTimestamp) {
                suggestionEmbed.setTimestamp();
            }

            // Create voting buttons (only for main channel)
            const voteButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suggestion_upvote_${suggestionId}`)
                        .setLabel('Support')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(config.suggestions.votingEmojis.upvote),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_downvote_${suggestionId}`)
                        .setLabel('Oppose')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(config.suggestions.votingEmojis.downvote)
                );

            const message = await suggestionChannel.send({
                embeds: [suggestionEmbed],
                components: [voteButtons]
            });

            // Create discussion thread if enabled
            if (config.suggestions.createThreads) {
                try {
                    const maxLength = config.suggestions.threadNameMaxLength;
                    const threadName = title.length > maxLength ?
                        `Thread for suggestion ${suggestionId}` :
                        `Thread for suggestion ${suggestionId}`;

                    const thread = await message.startThread({
                        name: threadName,
                        autoArchiveDuration: config.suggestions.threadAutoArchive,
                        reason: `Discussion thread for suggestion #${suggestionId}`
                    });

                    // Send initial message in thread with the format from the image
                    const threadWelcome = `${anonymous ? 'Anonymous user' : interaction.user.toString()}, I have created this thread for you to discuss your suggestion!\n\n` +
                        `Feel free to share additional details, answer questions, or engage with community feedback. ` +
                        `Keep the discussion constructive and respectful! 💭`;

                    await thread.send(threadWelcome);

                    // Add the suggestion author to the thread (unless anonymous)
                    if (!anonymous) {
                        try {
                            await thread.members.add(interaction.user.id);
                        } catch (error) {
                            console.error('[ERROR] Failed to add suggestion author to thread:', error);
                        }
                    }

                    console.log(`[INFO] Created discussion thread for suggestion #${suggestionId}`);
                } catch (error) {
                    console.error('[ERROR] Failed to create suggestion thread:', error);
                    // Don't fail the entire suggestion creation if thread creation fails
                }
            }

            // Save suggestion data
            data.suggestions[suggestionId] = {
                id: suggestionId,
                title: title,
                description: description,
                userId: interaction.user.id,
                anonymous: anonymous,
                messageId: message.id,
                status: 'pending',
                upvotes: [],
                downvotes: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await this.saveSuggestionData(data);

            // Send management controls to logs channel if configured
            if (config.suggestions.managementInLogs) {
                await this.sendManagementControls(interaction, suggestionId, data.suggestions[suggestionId]);
            }

            return interaction.reply({
                content: `✅ Suggestion #${suggestionId} has been submitted successfully!`,
                ephemeral: true
            });

        } catch (error) {
            console.error('[ERROR] Failed to create suggestion:', error);
            return interaction.reply({
                content: '❌ Failed to create suggestion. Please try again later.',
                ephemeral: true
            });
        }
    }

    async sendManagementControls(interaction, suggestionId, suggestion) {
        try {
            const logsChannel = interaction.guild.channels.cache.get(config.channels.suggestionLogs);
            if (!logsChannel) {
                console.error('[ERROR] Suggestion logs channel not found');
                return;
            }

            // Create management embed for logs channel
            const managementEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`🔧 Suggestion #${suggestionId} - Management`)
                .setDescription(`**Title:** ${suggestion.title}\n**Description:** ${suggestion.description}`)
                .addFields(
                    { name: '👤 Submitted by', value: suggestion.anonymous ? 'Anonymous' : `<@${suggestion.userId}>`, inline: true },
                    { name: '📅 Created', value: `<t:${Math.floor(suggestion.createdAt / 1000)}:R>`, inline: true },
                    { name: '📊 Status', value: '🟡 Pending Review', inline: true }
                )
                .setTimestamp();

            // Create management buttons
            const managementButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suggestion_approve_${suggestionId}`)
                        .setLabel('Approve')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_deny_${suggestionId}`)
                        .setLabel('Deny')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌'),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_consider_${suggestionId}`)
                        .setLabel('Under Consideration')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🤔')
                );

            await logsChannel.send({
                embeds: [managementEmbed],
                components: [managementButtons]
            });

        } catch (error) {
            console.error('[ERROR] Failed to send management controls:', error);
        }
    }

    async voteSuggestion(interaction, suggestionId, voteType) {
        try {
            const data = await this.getSuggestionData();
            const suggestion = data.suggestions[suggestionId];

            if (!suggestion) {
                return interaction.reply({
                    content: '❌ Suggestion not found.',
                    ephemeral: true
                });
            }

            const userId = interaction.user.id;
            
            // Remove previous votes
            suggestion.upvotes = suggestion.upvotes.filter(id => id !== userId);
            suggestion.downvotes = suggestion.downvotes.filter(id => id !== userId);

            // Add new vote
            if (voteType === 'upvote') {
                suggestion.upvotes.push(userId);
            } else if (voteType === 'downvote') {
                suggestion.downvotes.push(userId);
            }

            suggestion.updatedAt = Date.now();
            await this.saveSuggestionData(data);

            // Update the message
            await this.updateSuggestionMessage(interaction, suggestion);

            if (interaction.deferred) {
                return interaction.editReply({
                    content: `✅ Your ${voteType === 'upvote' ? 'support' : 'opposition'} has been recorded!`
                });
            } else {
                return interaction.reply({
                    content: `✅ Your ${voteType === 'upvote' ? 'support' : 'opposition'} has been recorded!`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('[ERROR] Failed to vote on suggestion:', error);
            return interaction.reply({
                content: '❌ Failed to vote on suggestion. Please try again later.',
                ephemeral: true
            });
        }
    }

    async approveSuggestion(interaction, suggestionId) {
        if (!PermissionManager.canManageSuggestions(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to manage suggestions.',
                ephemeral: true
            });
        }

        try {
            const data = await this.getSuggestionData();
            const suggestion = data.suggestions[suggestionId];

            if (!suggestion) {
                return interaction.reply({
                    content: '❌ Suggestion not found.',
                    ephemeral: true
                });
            }

            suggestion.status = 'approved';
            suggestion.reviewedBy = interaction.user.id;
            suggestion.reviewedAt = Date.now();
            suggestion.updatedAt = Date.now();

            await this.saveSuggestionData(data);
            await this.updateSuggestionMessage(interaction, suggestion);
            await this.updateManagementMessage(interaction, suggestionId, suggestion);
            await this.sendToResultsChannel(interaction, suggestionId, suggestion);
            await this.disableSuggestionInteractions(interaction, suggestionId, suggestion);

            if (interaction.deferred) {
                return interaction.editReply({
                    content: `✅ Suggestion #${suggestionId} has been approved!`
                });
            } else {
                return interaction.reply({
                    content: `✅ Suggestion #${suggestionId} has been approved!`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('[ERROR] Failed to approve suggestion:', error);
            return interaction.reply({
                content: '❌ Failed to approve suggestion. Please try again later.',
                ephemeral: true
            });
        }
    }

    async denySuggestion(interaction, suggestionId) {
        if (!PermissionManager.canManageSuggestions(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to manage suggestions.',
                ephemeral: true
            });
        }

        try {
            const data = await this.getSuggestionData();
            const suggestion = data.suggestions[suggestionId];

            if (!suggestion) {
                return interaction.reply({
                    content: '❌ Suggestion not found.',
                    ephemeral: true
                });
            }

            suggestion.status = 'denied';
            suggestion.reviewedBy = interaction.user.id;
            suggestion.reviewedAt = Date.now();
            suggestion.updatedAt = Date.now();

            await this.saveSuggestionData(data);
            await this.updateSuggestionMessage(interaction, suggestion);
            await this.updateManagementMessage(interaction, suggestionId, suggestion);
            await this.sendToResultsChannel(interaction, suggestionId, suggestion);
            await this.disableSuggestionInteractions(interaction, suggestionId, suggestion);

            if (interaction.deferred) {
                return interaction.editReply({
                    content: `❌ Suggestion #${suggestionId} has been denied.`
                });
            } else {
                return interaction.reply({
                    content: `❌ Suggestion #${suggestionId} has been denied.`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('[ERROR] Failed to deny suggestion:', error);
            return interaction.reply({
                content: '❌ Failed to deny suggestion. Please try again later.',
                ephemeral: true
            });
        }
    }

    async updateSuggestionMessage(interaction, suggestion) {
        try {
            const channel = interaction.guild.channels.cache.get(config.channels.suggestions);
            const message = await channel.messages.fetch(suggestion.messageId);

            const statusEmojis = {
                'pending': '🟡',
                'approved': '✅',
                'denied': '❌',
                'considering': '🤔'
            };

            const statusColors = {
                'pending': config.colors.warning,
                'approved': config.colors.success,
                'denied': config.colors.error,
                'considering': config.colors.primary
            };

            // Get user info for the updated embed
            const user = await interaction.client.users.fetch(suggestion.userId).catch(() => null);

            const updatedEmbed = new EmbedBuilder()
                .setColor(statusColors[suggestion.status] || config.colors.primary)
                .setAuthor({
                    name: `Suggestion #${suggestion.id}`,
                    iconURL: interaction.guild.iconURL() || undefined
                })
                .addFields(
                    {
                        name: '**Submitter**',
                        value: suggestion.anonymous ? 'Anonymous' : (user ? user.username : 'Unknown User'),
                        inline: true
                    },
                    {
                        name: '**Status**',
                        value: `${statusEmojis[suggestion.status]} ${suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}`,
                        inline: true
                    },
                    {
                        name: '\u200b',
                        value: '\u200b',
                        inline: true
                    },
                    {
                        name: '**Suggestion**',
                        value: `**${suggestion.title}**\n\n${suggestion.description}`,
                        inline: false
                    },
                    {
                        name: '**Results so far**',
                        value: `${config.suggestions.votingEmojis.upvote} **${suggestion.upvotes.length}** | ${config.suggestions.votingEmojis.downvote} **${suggestion.downvotes.length}**`,
                        inline: true
                    }
                )
                .setThumbnail(
                    (config.suggestions.showUserThumbnail && !suggestion.anonymous && user) ?
                    user.displayAvatarURL({ dynamic: true }) : null
                );

            // Add footer if configured
            if (config.suggestions.showUserIdInFooter || config.suggestions.showTimestamp) {
                let footerText = '';
                if (config.suggestions.showUserIdInFooter) {
                    footerText += `User ID: ${suggestion.userId} | ${suggestion.anonymous ? 'Anonymous' : (user ? user.tag : 'Unknown')}`;
                }
                if (config.suggestions.showTimestamp) {
                    if (footerText) footerText += ' • ';
                    footerText += new Date(suggestion.createdAt).toLocaleString();
                }

                updatedEmbed.setFooter({
                    text: footerText,
                    iconURL: (suggestion.anonymous || !config.suggestions.showUserThumbnail || !user) ? undefined : user.displayAvatarURL({ dynamic: true })
                });
            }

            if (config.suggestions.showTimestamp) {
                updatedEmbed.setTimestamp(new Date(suggestion.createdAt));
            }

            if (suggestion.reviewedBy) {
                updatedEmbed.addFields({
                    name: '👨‍💼 Reviewed by',
                    value: `<@${suggestion.reviewedBy}>`,
                    inline: true
                });
            }

            await message.edit({ embeds: [updatedEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to update suggestion message:', error);
        }
    }

    async considerSuggestion(interaction, suggestionId) {
        if (!PermissionManager.canManageSuggestions(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to manage suggestions.',
                ephemeral: true
            });
        }

        try {
            const data = await this.getSuggestionData();
            const suggestion = data.suggestions[suggestionId];

            if (!suggestion) {
                return interaction.reply({
                    content: '❌ Suggestion not found.',
                    ephemeral: true
                });
            }

            suggestion.status = 'considering';
            suggestion.reviewedBy = interaction.user.id;
            suggestion.reviewedAt = Date.now();
            suggestion.updatedAt = Date.now();

            await this.saveSuggestionData(data);
            await this.updateSuggestionMessage(interaction, suggestion);
            await this.updateManagementMessage(interaction, suggestionId, suggestion);
            await this.sendToResultsChannel(interaction, suggestionId, suggestion);
            await this.disableSuggestionInteractions(interaction, suggestionId, suggestion);

            if (interaction.deferred) {
                return interaction.editReply({
                    content: `🤔 Suggestion #${suggestionId} is now under consideration.`
                });
            } else {
                return interaction.reply({
                    content: `🤔 Suggestion #${suggestionId} is now under consideration.`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('[ERROR] Failed to consider suggestion:', error);
            return interaction.reply({
                content: '❌ Failed to update suggestion. Please try again later.',
                ephemeral: true
            });
        }
    }

    async sendToResultsChannel(interaction, suggestionId, suggestion) {
        try {
            const resultsChannel = interaction.guild.channels.cache.get(config.channels.suggestionResults);
            if (!resultsChannel) {
                console.error('[ERROR] Suggestion results channel not found');
                return;
            }

            const statusEmojis = {
                'pending': '🟡',
                'approved': '✅',
                'denied': '❌',
                'considering': '🤔'
            };

            const statusColors = {
                'pending': config.colors.warning,
                'approved': config.colors.success,
                'denied': config.colors.error,
                'considering': config.colors.primary
            };

            // Get user info
            const user = await interaction.client.users.fetch(suggestion.userId).catch(() => null);

            // Create results embed
            const resultsEmbed = new EmbedBuilder()
                .setColor(statusColors[suggestion.status] || config.colors.primary)
                .setAuthor({
                    name: `Suggestion #${suggestionId} - ${suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}`,
                    iconURL: interaction.guild.iconURL() || undefined
                })
                .addFields(
                    {
                        name: '**Submitter**',
                        value: suggestion.anonymous ? 'Anonymous' : (user ? user.username : 'Unknown User'),
                        inline: true
                    },
                    {
                        name: '**Status**',
                        value: `${statusEmojis[suggestion.status]} ${suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}`,
                        inline: true
                    },
                    {
                        name: '**Reviewed by**',
                        value: `<@${suggestion.reviewedBy}>`,
                        inline: true
                    },
                    {
                        name: '**Suggestion**',
                        value: `**${suggestion.title}**\n\n${suggestion.description}`,
                        inline: false
                    },
                    {
                        name: '**Final Results**',
                        value: `${config.suggestions.votingEmojis.upvote} **${suggestion.upvotes.length}** | ${config.suggestions.votingEmojis.downvote} **${suggestion.downvotes.length}**`,
                        inline: true
                    }
                )
                .setTimestamp(new Date(suggestion.reviewedAt || suggestion.updatedAt));

            // Add footer if configured
            if (config.suggestions.showUserIdInFooter) {
                resultsEmbed.setFooter({
                    text: `User ID: ${suggestion.userId} | ${suggestion.anonymous ? 'Anonymous' : (user ? user.tag : 'Unknown')} • Reviewed ${new Date(suggestion.reviewedAt || suggestion.updatedAt).toLocaleString()}`,
                    iconURL: (suggestion.anonymous || !config.suggestions.showUserThumbnail || !user) ? undefined : user.displayAvatarURL({ dynamic: true })
                });
            }

            // Add thumbnail if configured
            if (config.suggestions.showUserThumbnail && !suggestion.anonymous && user) {
                resultsEmbed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
            }

            await resultsChannel.send({ embeds: [resultsEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to send to results channel:', error);
        }
    }

    async disableSuggestionInteractions(interaction, suggestionId, suggestion) {
        try {
            // Disable voting buttons on main suggestion
            await this.disableVotingButtons(interaction, suggestionId, suggestion);

            // Disable management buttons in logs channel
            await this.disableManagementButtons(interaction, suggestionId, suggestion);

            // Lock and archive the discussion thread
            await this.lockSuggestionThread(interaction, suggestionId, suggestion);

        } catch (error) {
            console.error('[ERROR] Failed to disable suggestion interactions:', error);
        }
    }

    async disableVotingButtons(interaction, suggestionId, suggestion) {
        try {
            const suggestionChannel = interaction.guild.channels.cache.get(config.channels.suggestions);
            if (!suggestionChannel) return;

            const suggestionMessage = await suggestionChannel.messages.fetch(suggestion.messageId);
            if (!suggestionMessage) return;

            // Create disabled voting buttons
            const disabledVoteButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suggestion_upvote_${suggestionId}_disabled`)
                        .setLabel('Support')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji(config.suggestions.votingEmojis.upvote)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_downvote_${suggestionId}_disabled`)
                        .setLabel('Oppose')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(config.suggestions.votingEmojis.downvote)
                        .setDisabled(true)
                );

            await suggestionMessage.edit({
                embeds: suggestionMessage.embeds,
                components: [disabledVoteButtons]
            });

        } catch (error) {
            console.error('[ERROR] Failed to disable voting buttons:', error);
        }
    }

    async disableManagementButtons(interaction, suggestionId, suggestion) {
        try {
            const logsChannel = interaction.guild.channels.cache.get(config.channels.suggestionLogs);
            if (!logsChannel) return;

            // Find the management message
            const messages = await logsChannel.messages.fetch({ limit: 50 });
            const managementMessage = messages.find(msg =>
                msg.embeds.length > 0 &&
                msg.embeds[0].title &&
                msg.embeds[0].title.includes(`Suggestion #${suggestionId}`)
            );

            if (!managementMessage) return;

            // Create disabled management buttons
            const disabledManagementButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suggestion_approve_${suggestionId}_disabled`)
                        .setLabel('Approve')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_deny_${suggestionId}_disabled`)
                        .setLabel('Deny')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_consider_${suggestionId}_disabled`)
                        .setLabel('Under Consideration')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🤔')
                        .setDisabled(true)
                );

            await managementMessage.edit({
                embeds: managementMessage.embeds,
                components: [disabledManagementButtons]
            });

        } catch (error) {
            console.error('[ERROR] Failed to disable management buttons:', error);
        }
    }

    async lockSuggestionThread(interaction, suggestionId, suggestion) {
        try {
            const suggestionChannel = interaction.guild.channels.cache.get(config.channels.suggestions);
            if (!suggestionChannel) return;

            const suggestionMessage = await suggestionChannel.messages.fetch(suggestion.messageId);
            if (!suggestionMessage || !suggestionMessage.thread) return;

            const thread = suggestionMessage.thread;

            // Lock the thread
            await thread.setLocked(true);

            // Archive the thread
            await thread.setArchived(true);

            // Send final message in thread before locking
            const statusEmojis = {
                'approved': '✅',
                'denied': '❌',
                'considering': '🤔'
            };

            const finalMessage = `${statusEmojis[suggestion.status]} **This suggestion has been ${suggestion.status}.**\n\n` +
                `The discussion thread has been locked and archived. Thank you for your participation!`;

            // We need to unarchive temporarily to send the message, then re-archive
            await thread.setArchived(false);
            await thread.send(finalMessage);
            await thread.setArchived(true);

        } catch (error) {
            console.error('[ERROR] Failed to lock suggestion thread:', error);
        }
    }

    async updateManagementMessage(interaction, suggestionId, suggestion) {
        try {
            const logsChannel = interaction.guild.channels.cache.get(config.channels.suggestionLogs);
            if (!logsChannel) return;

            // Find the management message (this is a simplified approach)
            // In a production bot, you'd want to store the management message ID
            const messages = await logsChannel.messages.fetch({ limit: 50 });
            const managementMessage = messages.find(msg =>
                msg.embeds.length > 0 &&
                msg.embeds[0].title &&
                msg.embeds[0].title.includes(`Suggestion #${suggestionId}`)
            );

            if (!managementMessage) return;

            const statusEmojis = {
                'pending': '🟡',
                'approved': '✅',
                'denied': '❌',
                'considering': '🤔'
            };

            const statusColors = {
                'pending': config.colors.warning,
                'approved': config.colors.success,
                'denied': config.colors.error,
                'considering': config.colors.primary
            };

            // Get user info
            const user = await interaction.client.users.fetch(suggestion.userId).catch(() => null);

            const updatedEmbed = new EmbedBuilder()
                .setColor(statusColors[suggestion.status] || config.colors.primary)
                .setTitle(`🔧 Suggestion #${suggestionId} - Management`)
                .setDescription(`**Title:** ${suggestion.title}\n**Description:** ${suggestion.description}`)
                .addFields(
                    { name: '👤 Submitted by', value: suggestion.anonymous ? 'Anonymous' : `<@${suggestion.userId}>`, inline: true },
                    { name: '📅 Created', value: `<t:${Math.floor(suggestion.createdAt / 1000)}:R>`, inline: true },
                    { name: '📊 Status', value: `${statusEmojis[suggestion.status]} ${suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}`, inline: true }
                )
                .setTimestamp();

            if (suggestion.reviewedBy) {
                updatedEmbed.addFields({
                    name: '👨‍💼 Reviewed by',
                    value: `<@${suggestion.reviewedBy}> <t:${Math.floor(suggestion.reviewedAt / 1000)}:R>`,
                    inline: false
                });
            }

            await managementMessage.edit({ embeds: [updatedEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to update management message:', error);
        }
    }

    createSuggestionModal() {
        const modal = new ModalBuilder()
            .setCustomId('suggestion_modal')
            .setTitle('Submit a Suggestion');

        const titleInput = new TextInputBuilder()
            .setCustomId('suggestion_title')
            .setLabel('Suggestion Title')
            .setStyle(TextInputStyle.Short)
            .setMinLength(5)
            .setMaxLength(100)
            .setPlaceholder('Enter a brief title for your suggestion...')
            .setRequired(true);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('suggestion_description')
            .setLabel('Suggestion Description')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(10)
            .setMaxLength(1000)
            .setPlaceholder('Provide a detailed description of your suggestion...')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
        const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);

        modal.addComponents(firstActionRow, secondActionRow);
        return modal;
    }

    async handleSuggestionModal(interaction) {
        const title = interaction.fields.getTextInputValue('suggestion_title');
        const description = interaction.fields.getTextInputValue('suggestion_description');
        
        await this.createSuggestion(interaction, title, description, false);
    }
}

module.exports = new SuggestionHandler();
