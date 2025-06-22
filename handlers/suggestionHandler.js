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
            const data = await fs.readJson(this.suggestionsPath);
            return data;
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
            const errorMessage = {
                content: '❌ You do not have permission to manage suggestions.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp(errorMessage);
            } else {
                return interaction.reply(errorMessage);
            }
        }

        try {
            const data = await this.getSuggestionData();
            const suggestion = data.suggestions[suggestionId];

            if (!suggestion) {
                const errorMessage = {
                    content: '❌ Suggestion not found.',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    return interaction.followUp(errorMessage);
                } else {
                    return interaction.reply(errorMessage);
                }
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

            const successMessage = `✅ Suggestion #${suggestionId} has been approved!`;

            if (interaction.replied) {
                return interaction.followUp({
                    content: successMessage,
                    ephemeral: true
                });
            } else if (interaction.deferred) {
                return interaction.editReply({
                    content: successMessage
                });
            } else {
                return interaction.reply({
                    content: successMessage,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('[ERROR] Failed to approve suggestion:', error);

            const errorMessage = {
                content: '❌ Failed to approve suggestion. Please try again later.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp(errorMessage);
            } else {
                return interaction.reply(errorMessage);
            }
        }
    }

    async denySuggestion(interaction, suggestionId) {
        if (!PermissionManager.canManageSuggestions(interaction.member)) {
            const errorMessage = {
                content: '❌ You do not have permission to manage suggestions.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp(errorMessage);
            } else {
                return interaction.reply(errorMessage);
            }
        }

        try {
            const data = await this.getSuggestionData();
            const suggestion = data.suggestions[suggestionId];

            if (!suggestion) {
                const errorMessage = {
                    content: '❌ Suggestion not found.',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    return interaction.followUp(errorMessage);
                } else {
                    return interaction.reply(errorMessage);
                }
            }

            // If suggestion is anonymous, offer option to reveal user
            if (suggestion.anonymous) {
                return await this.showAnonymousDenyOptions(interaction, suggestionId, suggestion);
            }

            // Process normal denial
            await this.processSuggestionDenial(interaction, suggestionId, suggestion, false);

        } catch (error) {
            console.error('[ERROR] Failed to deny suggestion:', error);

            const errorMessage = {
                content: '❌ Failed to deny suggestion. Please try again later.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp(errorMessage);
            } else {
                return interaction.reply(errorMessage);
            }
        }
    }

    async showAnonymousDenyOptions(interaction, suggestionId, suggestion) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

        const optionsEmbed = new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle('🔍 Anonymous Suggestion Denial')
            .setDescription(`You are about to deny an **anonymous** suggestion #${suggestionId}.\n\nWould you like to reveal the user's identity for moderation purposes?`)
            .addFields(
                { name: '📝 Suggestion', value: `**${suggestion.title}**\n${suggestion.description}`, inline: false },
                { name: '⚠️ Note', value: 'Revealing the user will show their identity in the logs for moderation actions.', inline: false }
            )
            .setTimestamp();

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`suggestion_deny_anonymous_${suggestionId}`)
                    .setLabel('Deny (Keep Anonymous)')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId(`suggestion_deny_reveal_${suggestionId}`)
                    .setLabel('Deny & Reveal User')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId(`suggestion_deny_cancel_${suggestionId}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('↩️')
            );

        if (interaction.replied) {
            return interaction.followUp({
                embeds: [optionsEmbed],
                components: [actionButtons],
                ephemeral: true
            });
        } else if (interaction.deferred) {
            return interaction.editReply({
                embeds: [optionsEmbed],
                components: [actionButtons]
            });
        } else {
            return interaction.reply({
                embeds: [optionsEmbed],
                components: [actionButtons],
                ephemeral: true
            });
        }
    }

    async processSuggestionDenial(interaction, suggestionId, suggestion, revealUser = false) {
        // Get fresh data to ensure we have the latest state
        const data = await this.getSuggestionData();
        const currentSuggestion = data.suggestions[suggestionId];

        currentSuggestion.status = 'denied';
        currentSuggestion.reviewedBy = interaction.user.id;
        currentSuggestion.reviewedAt = Date.now();
        currentSuggestion.updatedAt = Date.now();

        // If revealing user, temporarily make it non-anonymous for logging
        const wasAnonymous = currentSuggestion.anonymous;
        if (revealUser && wasAnonymous) {
            currentSuggestion.anonymous = false;
            currentSuggestion.revealedBy = interaction.user.id;
            currentSuggestion.revealedAt = Date.now();
        }

        await this.saveSuggestionData(data);
        await this.updateSuggestionMessage(interaction, currentSuggestion);
        await this.updateManagementMessage(interaction, suggestionId, currentSuggestion);
        await this.sendToResultsChannel(interaction, suggestionId, currentSuggestion);
        await this.disableSuggestionInteractions(interaction, suggestionId, currentSuggestion);

        // Send moderation log if user was revealed
        if (revealUser && wasAnonymous) {
            await this.logUserReveal(interaction, suggestionId, currentSuggestion);
        }

        // Restore anonymity for display purposes but keep the reveal log
        if (revealUser && wasAnonymous) {
            currentSuggestion.anonymous = true;
            await this.saveSuggestionData(data);
        }

        const responseMessage = revealUser ?
            `❌ Suggestion #${suggestionId} has been denied and the anonymous user has been revealed in the logs.` :
            `❌ Suggestion #${suggestionId} has been denied.`;

        // Check if this was called from the anonymous denial buttons
        if (interaction.replied) {
            return interaction.followUp({
                content: responseMessage,
                ephemeral: true
            });
        } else if (interaction.deferred) {
            return interaction.editReply({
                content: responseMessage,
                embeds: [],
                components: []
            });
        } else {
            return interaction.reply({
                content: responseMessage,
                ephemeral: true
            });
        }
    }

    async logUserReveal(interaction, suggestionId, suggestion) {
        try {
            const logsChannel = interaction.guild.channels.cache.get(config.channels.suggestionLogs);
            if (!logsChannel) return;

            const user = await interaction.client.users.fetch(suggestion.userId).catch(() => null);

            const revealEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🔍 Anonymous User Revealed')
                .setDescription(`**Moderator ${interaction.user.tag}** revealed the identity of an anonymous suggestion for moderation purposes.`)
                .addFields(
                    { name: '📝 Suggestion ID', value: `#${suggestionId}`, inline: true },
                    { name: '👤 Revealed User', value: user ? `${user.tag} (${user.id})` : `Unknown User (${suggestion.userId})`, inline: true },
                    { name: '🔨 Revealed By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                    { name: '📋 Suggestion Title', value: suggestion.title, inline: false },
                    { name: '⚠️ Reason', value: 'User identity revealed for potential moderation action', inline: false }
                )
                .setThumbnail(user ? user.displayAvatarURL({ dynamic: true }) : null)
                .setFooter({ text: 'This action is logged for transparency and accountability' })
                .setTimestamp();

            await logsChannel.send({ embeds: [revealEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to log user reveal:', error);
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
                        value: suggestion.anonymous ?
                            (suggestion.revealedBy ? `Anonymous (Revealed: ${user ? user.username : 'Unknown User'})` : 'Anonymous') :
                            (user ? user.username : 'Unknown User'),
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

            // Send final message in thread before locking
            const statusEmojis = {
                'approved': '✅',
                'denied': '❌',
                'considering': '🤔'
            };

            const finalMessage = `${statusEmojis[suggestion.status]} **This suggestion has been ${suggestion.status}.**\n\n` +
                `The discussion thread has been locked and archived. Thank you for your participation!`;

            // Send the final message first
            await thread.send(finalMessage);

            // Then lock and archive the thread
            await thread.setLocked(true);
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
