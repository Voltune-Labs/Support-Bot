const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const moderationHandler = require('../handlers/moderationHandler.js');
const PermissionManager = require('../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod')
        .setDescription('Moderation commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Warn a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to warn')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the warning')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mute')
                .setDescription('Mute a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to mute')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration (e.g., 1h, 30m, 1d)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the mute')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unmute')
                .setDescription('Unmute a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to unmute')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the unmute')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to kick')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the kick')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to ban')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration (e.g., 1h, 30m, 1d) - leave empty for permanent')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the ban')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Unban a user')
                .addStringOption(option =>
                    option
                        .setName('userid')
                        .setDescription('User ID to unban')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the unban')
                        .setRequired(false)
                        .setMaxLength(500)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warnings')
                .setDescription('View warnings for a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to check warnings for')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('case')
                .setDescription('View a moderation case')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('Case ID')
                        .setRequired(true)
                        .setMinValue(1)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'warn':
                await this.handleWarn(interaction);
                break;
            case 'mute':
                await this.handleMute(interaction);
                break;
            case 'unmute':
                await this.handleUnmute(interaction);
                break;
            case 'kick':
                await this.handleKick(interaction);
                break;
            case 'ban':
                await this.handleBan(interaction);
                break;
            case 'unban':
                await this.handleUnban(interaction);
                break;
            case 'warnings':
                await this.handleWarnings(interaction);
                break;
            case 'case':
                await this.handleCase(interaction);
                break;
        }
    },

    async handleWarn(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        await moderationHandler.warnUser(interaction, target, reason);
    },

    async handleMute(interaction) {
        const target = interaction.options.getUser('user');
        const durationString = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason');

        let duration = null;
        if (durationString) {
            duration = moderationHandler.parseDuration(durationString);
            if (duration === 0) {
                return interaction.reply({
                    content: '❌ Invalid duration format. Use formats like: 1h, 30m, 1d',
                    ephemeral: true
                });
            }
        }

        await moderationHandler.muteUser(interaction, target, duration, reason);
    },

    async handleUnmute(interaction) {
        if (!PermissionManager.canModerate(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to unmute users.',
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'Manual unmute';

        try {
            await moderationHandler.unmuteUser(interaction.client, target.id, reason);
            
            const unmuteEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('🔊 User Unmuted')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [unmuteEmbed] });
        } catch (error) {
            console.error('[ERROR] Failed to unmute user:', error);
            await interaction.reply({
                content: '❌ Failed to unmute user.',
                ephemeral: true
            });
        }
    },

    async handleKick(interaction) {
        const target = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        await moderationHandler.kickUser(interaction, target, reason);
    },

    async handleBan(interaction) {
        const target = interaction.options.getUser('user');
        const durationString = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason');

        let duration = null;
        if (durationString) {
            duration = moderationHandler.parseDuration(durationString);
            if (duration === 0) {
                return interaction.reply({
                    content: '❌ Invalid duration format. Use formats like: 1h, 30m, 1d',
                    ephemeral: true
                });
            }
        }

        await moderationHandler.banUser(interaction, target, duration, reason);
    },

    async handleUnban(interaction) {
        if (!PermissionManager.canModerate(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to unban users.',
                ephemeral: true
            });
        }

        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'Manual unban';

        try {
            await moderationHandler.unbanUser(interaction.client, userId, reason);
            
            const unbanEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('🔓 User Unbanned')
                .addFields(
                    { name: 'User ID', value: userId, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [unbanEmbed] });
        } catch (error) {
            console.error('[ERROR] Failed to unban user:', error);
            await interaction.reply({
                content: '❌ Failed to unban user. Make sure the user ID is correct and the user is banned.',
                ephemeral: true
            });
        }
    },

    async handleWarnings(interaction) {
        if (!PermissionManager.canModerate(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to view warnings.',
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('user');

        try {
            const data = await moderationHandler.getModerationData();
            const warnings = data.warnings[target.id] || [];

            if (warnings.length === 0) {
                return interaction.reply({
                    content: `📝 ${target.tag} has no warnings.`,
                    ephemeral: true
                });
            }

            const warningsEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle(`⚠️ Warnings for ${target.tag}`)
                .setDescription(`Total warnings: **${warnings.length}**`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            const config = require('../config.js');
            const maxWarningsToShow = Math.min(5, config.settings.maxListItems);
            const warningList = warnings.slice(-maxWarningsToShow).map((warning, index) => {
                const moderator = interaction.guild.members.cache.get(warning.moderatorId);
                return `**${warnings.length - 4 + index}.** ${warning.reason}\n` +
                       `Moderator: ${moderator ? moderator.user.tag : 'Unknown'}\n` +
                       `Date: <t:${Math.floor(warning.timestamp / 1000)}:R>`;
            }).join('\n\n');

            warningsEmbed.addFields({
                name: `Recent Warnings (Last ${maxWarningsToShow})`,
                value: warningList.length > config.settings.maxEmbedFieldLength ?
                    warningList.substring(0, config.settings.maxEmbedFieldLength - 3) + '...' :
                    warningList,
                inline: false
            });

            await interaction.reply({ embeds: [warningsEmbed], ephemeral: true });

        } catch (error) {
            console.error('[ERROR] Failed to get warnings:', error);
            await interaction.reply({
                content: '❌ Failed to retrieve warnings.',
                ephemeral: true
            });
        }
    },

    async handleCase(interaction) {
        if (!PermissionManager.canModerate(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to view cases.',
                ephemeral: true
            });
        }

        const caseId = interaction.options.getInteger('id');

        try {
            const data = await moderationHandler.getModerationData();
            const moderationCase = data.cases[caseId];

            if (!moderationCase) {
                return interaction.reply({
                    content: '❌ Case not found.',
                    ephemeral: true
                });
            }

            const moderator = interaction.guild.members.cache.get(moderationCase.moderatorId);
            const target = await interaction.client.users.fetch(moderationCase.targetId).catch(() => null);

            const caseEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📋 Case #${moderationCase.id}`)
                .addFields(
                    { name: 'Type', value: moderationCase.type.charAt(0).toUpperCase() + moderationCase.type.slice(1), inline: true },
                    { name: 'Target', value: target ? `${target.tag} (${target.id})` : `Unknown User (${moderationCase.targetId})`, inline: true },
                    { name: 'Moderator', value: moderator ? `${moderator.user.tag}` : 'Unknown Moderator', inline: true },
                    { name: 'Reason', value: moderationCase.reason, inline: false },
                    { name: 'Date', value: `<t:${Math.floor(moderationCase.timestamp / 1000)}:F>`, inline: true },
                    { name: 'Status', value: moderationCase.active ? '🟢 Active' : '🔴 Inactive', inline: true }
                )
                .setTimestamp(new Date(moderationCase.timestamp));

            if (moderationCase.duration) {
                caseEmbed.addFields({
                    name: 'Duration',
                    value: moderationHandler.formatDuration(moderationCase.duration),
                    inline: true
                });
            }

            await interaction.reply({ embeds: [caseEmbed], ephemeral: true });

        } catch (error) {
            console.error('[ERROR] Failed to get case:', error);
            await interaction.reply({
                content: '❌ Failed to retrieve case information.',
                ephemeral: true
            });
        }
    }
};
