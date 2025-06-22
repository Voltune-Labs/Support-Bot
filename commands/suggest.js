const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const suggestionHandler = require('../handlers/suggestionHandler.js');
const PermissionManager = require('../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Suggestion system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new suggestion')
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('Title of your suggestion')
                        .setRequired(true)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Detailed description of your suggestion')
                        .setRequired(true)
                        .setMaxLength(1000)
                )
                .addBooleanOption(option =>
                    option
                        .setName('anonymous')
                        .setDescription('Submit suggestion anonymously')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('modal')
                .setDescription('Create a suggestion using a modal form')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List recent suggestions (Staff only)')
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('Filter by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Pending', value: 'pending' },
                            { name: 'Approved', value: 'approved' },
                            { name: 'Denied', value: 'denied' },
                            { name: 'Under Consideration', value: 'considering' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get information about a suggestion')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('Suggestion ID')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('thread')
                .setDescription('Manage suggestion discussion threads (Staff only)')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Archive Thread', value: 'archive' },
                            { name: 'Unarchive Thread', value: 'unarchive' },
                            { name: 'Lock Thread', value: 'lock' },
                            { name: 'Unlock Thread', value: 'unlock' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('Suggestion ID')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await this.handleCreate(interaction);
                break;
            case 'modal':
                await this.handleModal(interaction);
                break;
            case 'list':
                await this.handleList(interaction);
                break;
            case 'info':
                await this.handleInfo(interaction);
                break;
            case 'thread':
                await this.handleThread(interaction);
                break;
        }
    },

    async handleCreate(interaction) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const anonymous = interaction.options.getBoolean('anonymous') || false;

        await suggestionHandler.createSuggestion(interaction, title, description, anonymous);
    },

    async handleModal(interaction) {
        const modal = suggestionHandler.createSuggestionModal();
        await interaction.showModal(modal);
    },

    async handleList(interaction) {
        if (!PermissionManager.canManageSuggestions(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to list suggestions.',
                ephemeral: true
            });
        }

        try {
            const data = await suggestionHandler.getSuggestionData();
            const statusFilter = interaction.options.getString('status');
            
            let suggestions = Object.values(data.suggestions);
            
            if (statusFilter) {
                suggestions = suggestions.filter(s => s.status === statusFilter);
            }

            // Sort by creation date (newest first)
            suggestions.sort((a, b) => b.createdAt - a.createdAt);

            // Take only the configured max items
            const config = require('../config.js');
            suggestions = suggestions.slice(0, config.settings.maxListItems);

            if (suggestions.length === 0) {
                return interaction.reply({
                    content: '📝 No suggestions found.',
                    ephemeral: true
                });
            }

            const listEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📝 Recent Suggestions')
                .setDescription(statusFilter ? `Showing suggestions with status: **${statusFilter}**` : 'Showing recent suggestions')
                .setTimestamp();

            const suggestionList = suggestions.map(s => {
                const statusEmojis = {
                    'pending': '🟡',
                    'approved': '✅',
                    'denied': '❌',
                    'considering': '🤔'
                };
                
                return `${statusEmojis[s.status]} **#${s.id}** - ${s.title}\n` +
                       `👤 ${s.anonymous ? 'Anonymous' : `<@${s.userId}>`} | ` +
                       `📈 ${s.upvotes.length}👍 ${s.downvotes.length}👎`;
            }).join('\n\n');

            listEmbed.addFields({
                name: 'Suggestions',
                value: suggestionList.length > config.settings.maxEmbedFieldLength ?
                    suggestionList.substring(0, config.settings.maxEmbedFieldLength - 3) + '...' :
                    suggestionList,
                inline: false
            });

            await interaction.reply({ embeds: [listEmbed], ephemeral: true });

        } catch (error) {
            console.error('[ERROR] Failed to list suggestions:', error);
            await interaction.reply({
                content: '❌ Failed to list suggestions.',
                ephemeral: true
            });
        }
    },

    async handleInfo(interaction) {
        try {
            const suggestionId = interaction.options.getInteger('id');
            const data = await suggestionHandler.getSuggestionData();
            const suggestion = data.suggestions[suggestionId];

            if (!suggestion) {
                return interaction.reply({
                    content: '❌ Suggestion not found.',
                    ephemeral: true
                });
            }

            const statusEmojis = {
                'pending': '🟡',
                'approved': '✅',
                'denied': '❌',
                'considering': '🤔'
            };

            const infoEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`💡 Suggestion #${suggestion.id}`)
                .setDescription(suggestion.description)
                .addFields(
                    { name: '📝 Title', value: suggestion.title, inline: false },
                    { name: '👤 Suggested by', value: suggestion.anonymous ? 'Anonymous' : `<@${suggestion.userId}>`, inline: true },
                    { name: '📊 Status', value: `${statusEmojis[suggestion.status]} ${suggestion.status.charAt(0).toUpperCase() + suggestion.status.slice(1)}`, inline: true },
                    { name: '📈 Votes', value: `👍 ${suggestion.upvotes.length} | 👎 ${suggestion.downvotes.length}`, inline: true },
                    { name: '📅 Created', value: `<t:${Math.floor(suggestion.createdAt / 1000)}:R>`, inline: true }
                )
                .setTimestamp(new Date(suggestion.createdAt));

            if (suggestion.reviewedBy) {
                infoEmbed.addFields({
                    name: '👨‍💼 Reviewed by',
                    value: `<@${suggestion.reviewedBy}> <t:${Math.floor(suggestion.reviewedAt / 1000)}:R>`,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [infoEmbed], ephemeral: true });

        } catch (error) {
            console.error('[ERROR] Failed to get suggestion info:', error);
            await interaction.reply({
                content: '❌ Failed to get suggestion information.',
                ephemeral: true
            });
        }
    },

    async handleThread(interaction) {
        if (!PermissionManager.canManageSuggestions(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to manage suggestion threads.',
                ephemeral: true
            });
        }

        const action = interaction.options.getString('action');
        const suggestionId = interaction.options.getInteger('id');

        try {
            const data = await suggestionHandler.getSuggestionData();
            const suggestion = data.suggestions[suggestionId];

            if (!suggestion) {
                return interaction.reply({
                    content: '❌ Suggestion not found.',
                    ephemeral: true
                });
            }

            // Find the suggestion message
            const suggestionChannel = interaction.guild.channels.cache.get(require('../config.js').channels.suggestions);
            if (!suggestionChannel) {
                return interaction.reply({
                    content: '❌ Suggestion channel not found.',
                    ephemeral: true
                });
            }

            const suggestionMessage = await suggestionChannel.messages.fetch(suggestion.messageId);
            if (!suggestionMessage) {
                return interaction.reply({
                    content: '❌ Suggestion message not found.',
                    ephemeral: true
                });
            }

            // Find the thread
            const thread = suggestionMessage.thread;
            if (!thread) {
                return interaction.reply({
                    content: '❌ No discussion thread found for this suggestion.',
                    ephemeral: true
                });
            }

            // Perform the action
            let actionText = '';
            switch (action) {
                case 'archive':
                    await thread.setArchived(true);
                    actionText = 'archived';
                    break;
                case 'unarchive':
                    await thread.setArchived(false);
                    actionText = 'unarchived';
                    break;
                case 'lock':
                    await thread.setLocked(true);
                    actionText = 'locked';
                    break;
                case 'unlock':
                    await thread.setLocked(false);
                    actionText = 'unlocked';
                    break;
                default:
                    return interaction.reply({
                        content: '❌ Invalid action.',
                        ephemeral: true
                    });
            }

            await interaction.reply({
                content: `✅ Discussion thread for suggestion #${suggestionId} has been ${actionText}.`,
                ephemeral: true
            });

        } catch (error) {
            console.error('[ERROR] Failed to manage suggestion thread:', error);
            await interaction.reply({
                content: '❌ Failed to manage suggestion thread.',
                ephemeral: true
            });
        }
    }
};
