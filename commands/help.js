const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.js');
const PermissionManager = require('../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get help with bot commands')
        .addStringOption(option =>
            option
                .setName('category')
                .setDescription('Get help for a specific category')
                .setRequired(false)
                .addChoices(
                    { name: 'Tickets', value: 'tickets' },
                    { name: 'Suggestions', value: 'suggestions' },
                    { name: 'Moderation', value: 'moderation' },
                    { name: 'Logging', value: 'logging' }
                )
        ),

    async execute(interaction) {
        const category = interaction.options.getString('category');

        if (category) {
            await this.showCategoryHelp(interaction, category);
        } else {
            await this.showGeneralHelp(interaction);
        }
    },

    async showGeneralHelp(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🤖 Support Bot Help')
            .setDescription('Welcome to the Support Bot! Here are the available command categories:')
            .addFields(
                {
                    name: '🎫 Tickets',
                    value: 'Create and manage support tickets\nUse `/help category:tickets` for details',
                    inline: true
                },
                {
                    name: '💡 Suggestions',
                    value: 'Submit and manage suggestions\nUse `/help category:suggestions` for details',
                    inline: true
                },
                {
                    name: '🔨 Moderation',
                    value: 'Moderation commands (Staff only)\nUse `/help category:moderation` for details',
                    inline: true
                },
                {
                    name: '📊 Logging',
                    value: 'Logging system commands (Admin only)\nUse `/help category:logging` for details',
                    inline: true
                },
                {
                    name: '🆘 Need Help?',
                    value: 'Create a ticket using `/ticket create` or the ticket panel',
                    inline: false
                }
            )
            .setFooter({ text: 'Use /help category:<name> for detailed command information' })
            .setTimestamp();

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    },

    async showCategoryHelp(interaction, category) {
        let helpEmbed;

        switch (category) {
            case 'tickets':
                helpEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('🎫 Ticket System Help')
                    .setDescription('Commands for managing support tickets:')
                    .addFields(
                        {
                            name: '/ticket create [category]',
                            value: 'Create a new support ticket with optional category',
                            inline: false
                        },
                        {
                            name: '/ticket panel',
                            value: 'Create an interactive ticket panel (Staff only)',
                            inline: false
                        },
                        {
                            name: '/ticket close',
                            value: 'Close the current ticket',
                            inline: false
                        },
                        {
                            name: '/ticket add <user>',
                            value: 'Add a user to the current ticket (Staff only)',
                            inline: false
                        },
                        {
                            name: '/ticket remove <user>',
                            value: 'Remove a user from the current ticket (Staff only)',
                            inline: false
                        },
                        {
                            name: '📋 Categories',
                            value: Object.values(config.tickets.ticketCategories)
                                .map(cat => `${cat.emoji} **${cat.name}** - ${cat.description}`)
                                .join('\n'),
                            inline: false
                        }
                    );
                break;

            case 'suggestions':
                helpEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('💡 Suggestion System Help')
                    .setDescription('Commands for managing suggestions:')
                    .addFields(
                        {
                            name: '/suggest create <title> <description> [anonymous]',
                            value: 'Create a new suggestion',
                            inline: false
                        },
                        {
                            name: '/suggest modal',
                            value: 'Create a suggestion using an interactive form',
                            inline: false
                        },
                        {
                            name: '/suggest list [status]',
                            value: 'List recent suggestions with optional status filter (Staff only)',
                            inline: false
                        },
                        {
                            name: '/suggest info <id>',
                            value: 'Get detailed information about a specific suggestion',
                            inline: false
                        },
                        {
                            name: '/suggest thread <action> <id>',
                            value: 'Manage suggestion discussion threads (Staff only)',
                            inline: false
                        },
                        {
                            name: '💬 Discussion Threads',
                            value: 'Each suggestion automatically gets a discussion thread for community feedback',
                            inline: false
                        },
                        {
                            name: '📊 Voting',
                            value: 'Use the 👍 and 👎 reactions or buttons to vote on suggestions',
                            inline: false
                        }
                    );
                break;

            case 'moderation':
                if (!PermissionManager.canModerate(interaction.member)) {
                    return interaction.reply({
                        content: '❌ You do not have permission to view moderation commands.',
                        ephemeral: true
                    });
                }

                helpEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle('🔨 Moderation Help')
                    .setDescription('Commands for server moderation:')
                    .addFields(
                        {
                            name: '/mod warn <user> [reason]',
                            value: 'Issue a warning to a user',
                            inline: false
                        },
                        {
                            name: '/mod mute <user> [duration] [reason]',
                            value: 'Mute a user (duration: 1h, 30m, 1d, etc.)',
                            inline: false
                        },
                        {
                            name: '/mod unmute <user> [reason]',
                            value: 'Remove mute from a user',
                            inline: false
                        },
                        {
                            name: '/mod kick <user> [reason]',
                            value: 'Kick a user from the server',
                            inline: false
                        },
                        {
                            name: '/mod ban <user> [duration] [reason]',
                            value: 'Ban a user (duration: 1h, 30m, 1d, etc. or permanent)',
                            inline: false
                        },
                        {
                            name: '/mod unban <userid> [reason]',
                            value: 'Unban a user by their ID',
                            inline: false
                        },
                        {
                            name: '/mod warnings <user>',
                            value: 'View warning history for a user',
                            inline: false
                        },
                        {
                            name: '/mod case <id>',
                            value: 'View details of a specific moderation case',
                            inline: false
                        }
                    );
                break;

            case 'logging':
                if (!PermissionManager.isAdmin(interaction.member)) {
                    return interaction.reply({
                        content: '❌ You do not have permission to view logging commands.',
                        ephemeral: true
                    });
                }

                helpEmbed = new EmbedBuilder()
                    .setColor(config.colors.info)
                    .setTitle('📊 Logging System Help')
                    .setDescription('Commands for managing the logging system:')
                    .addFields(
                        {
                            name: '/logs status',
                            value: 'Check the current status of all logging systems',
                            inline: false
                        },
                        {
                            name: '/logs channels',
                            value: 'List all configured log channels and their status',
                            inline: false
                        },
                        {
                            name: '/logs test',
                            value: 'Send test messages to all log channels',
                            inline: false
                        },
                        {
                            name: '📋 Logged Events',
                            value: '• Ticket creation/closure\n• Suggestion submissions\n• Moderation actions\n• Message edits/deletions\n• Member joins/leaves\n• Auto-moderation actions',
                            inline: false
                        }
                    );
                break;

            default:
                return interaction.reply({
                    content: '❌ Unknown help category.',
                    ephemeral: true
                });
        }

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }
};
