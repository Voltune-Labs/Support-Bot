const { EmbedBuilder } = require('discord.js');
const config = require('../config.js');
const Logger = require('../utils/logger.js');
const PermissionManager = require('../utils/permissions.js');
const fs = require('fs-extra');
const path = require('path');

class ModerationHandler {
    constructor() {
        this.moderationPath = path.join(__dirname, '../data/moderation.json');
        this.ensureModerationData();
    }

    async ensureModerationData() {
        try {
            await fs.ensureFile(this.moderationPath);
            const data = await fs.readJson(this.moderationPath).catch(() => ({}));
            if (!data.warnings) {
                await fs.writeJson(this.moderationPath, { 
                    warnings: {}, 
                    mutes: {},
                    bans: {},
                    cases: {},
                    caseCounter: 0
                });
            }
        } catch (error) {
            console.error('[ERROR] Failed to ensure moderation data:', error);
        }
    }

    async getModerationData() {
        try {
            return await fs.readJson(this.moderationPath);
        } catch (error) {
            console.error('[ERROR] Failed to read moderation data:', error);
            return { warnings: {}, mutes: {}, bans: {}, cases: {}, caseCounter: 0 };
        }
    }

    async saveModerationData(data) {
        try {
            await fs.writeJson(this.moderationPath, data);
        } catch (error) {
            console.error('[ERROR] Failed to save moderation data:', error);
        }
    }

    async createCase(type, moderator, target, reason, duration = null) {
        const data = await this.getModerationData();
        const caseId = ++data.caseCounter;
        
        const moderationCase = {
            id: caseId,
            type: type,
            moderatorId: moderator.id,
            targetId: target.id,
            reason: reason || 'No reason provided',
            duration: duration,
            timestamp: Date.now(),
            active: true
        };

        data.cases[caseId] = moderationCase;
        await this.saveModerationData(data);
        
        return moderationCase;
    }

    async warnUser(interaction, target, reason) {
        try {
            if (!PermissionManager.canModerate(interaction.member)) {
                return interaction.reply({
                    content: '❌ You do not have permission to warn users.',
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ You cannot warn yourself.',
                    ephemeral: true
                });
            }

            // Fetch the guild member to check permissions properly
            let targetMember;
            try {
                targetMember = await interaction.guild.members.fetch(target.id);
            } catch (error) {
                return interaction.reply({
                    content: '❌ User not found in this server.',
                    ephemeral: true
                });
            }

            if (PermissionManager.isStaff(targetMember)) {
                return interaction.reply({
                    content: '❌ You cannot warn staff members.',
                    ephemeral: true
                });
            }

            const data = await this.getModerationData();
            const userId = target.id;

            if (!data.warnings[userId]) {
                data.warnings[userId] = [];
            }

            const warning = {
                id: Date.now(),
                moderatorId: interaction.user.id,
                reason: reason || 'No reason provided',
                timestamp: Date.now()
            };

            data.warnings[userId].push(warning);
            await this.saveModerationData(data);

            // Create moderation case
            const moderationCase = await this.createCase('warn', interaction.user, target, reason);

            // Create warning embed
            const warnEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('⚠️ User Warned')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Case ID', value: `#${moderationCase.id}`, inline: true },
                    { name: 'Reason', value: reason || 'No reason provided', inline: false },
                    { name: 'Total Warnings', value: `${data.warnings[userId].length}`, inline: true }
                )
                .setTimestamp();

            // Send DM to user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle(`⚠️ You have been warned in ${interaction.guild.name}`)
                    .addFields(
                        { name: 'Reason', value: reason || 'No reason provided', inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Case ID', value: `#${moderationCase.id}`, inline: true }
                    )
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('[INFO] Could not send DM to user');
            }

            // Log the warning
            await Logger.log(interaction.client, 'moderation', {
                action: 'Warn',
                moderator: interaction.user,
                target: target,
                reason: reason
            });

            // Check if auto-punishment should be applied
            await this.checkAutoPunishment(interaction, target, data.warnings[userId].length);

            return interaction.reply({ embeds: [warnEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to warn user:', error);
            return interaction.reply({
                content: '❌ Failed to warn user. Please try again later.',
                ephemeral: true
            });
        }
    }

    async muteUser(interaction, target, duration, reason) {
        try {
            if (!PermissionManager.canModerate(interaction.member)) {
                return interaction.reply({
                    content: '❌ You do not have permission to mute users.',
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ You cannot mute yourself.',
                    ephemeral: true
                });
            }

            // Fetch the guild member to check permissions properly
            let member;
            try {
                member = await interaction.guild.members.fetch(target.id);
            } catch (error) {
                return interaction.reply({
                    content: '❌ User not found in this server.',
                    ephemeral: true
                });
            }

            if (PermissionManager.isStaff(member)) {
                return interaction.reply({
                    content: '❌ You cannot mute staff members.',
                    ephemeral: true
                });
            }
            const muteRole = interaction.guild.roles.cache.get(config.roles.muted);

            if (!muteRole) {
                return interaction.reply({
                    content: '❌ Mute role not found. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Apply mute role
            await member.roles.add(muteRole);

            // Create moderation case
            const moderationCase = await this.createCase('mute', interaction.user, target, reason, duration);

            // Store mute data
            const data = await this.getModerationData();
            data.mutes[target.id] = {
                moderatorId: interaction.user.id,
                reason: reason || 'No reason provided',
                duration: duration,
                timestamp: Date.now(),
                caseId: moderationCase.id
            };
            await this.saveModerationData(data);

            // Create mute embed
            const muteEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('🔇 User Muted')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Case ID', value: `#${moderationCase.id}`, inline: true },
                    { name: 'Duration', value: duration ? this.formatDuration(duration) : 'Permanent', inline: true },
                    { name: 'Reason', value: reason || 'No reason provided', inline: false }
                )
                .setTimestamp();

            // Send DM to user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle(`🔇 You have been muted in ${interaction.guild.name}`)
                    .addFields(
                        { name: 'Duration', value: duration ? this.formatDuration(duration) : 'Permanent', inline: true },
                        { name: 'Reason', value: reason || 'No reason provided', inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Case ID', value: `#${moderationCase.id}`, inline: true }
                    )
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('[INFO] Could not send DM to user');
            }

            // Set unmute timer if duration is specified
            if (duration) {
                setTimeout(async () => {
                    try {
                        await this.unmuteUser(interaction.client, target.id, 'Automatic unmute');
                    } catch (error) {
                        console.error('[ERROR] Failed to auto-unmute user:', error);
                    }
                }, duration);
            }

            // Log the mute
            await Logger.log(interaction.client, 'moderation', {
                action: 'Mute',
                moderator: interaction.user,
                target: target,
                reason: reason,
                duration: duration ? this.formatDuration(duration) : 'Permanent'
            });

            return interaction.reply({ embeds: [muteEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to mute user:', error);
            return interaction.reply({
                content: '❌ Failed to mute user. Please try again later.',
                ephemeral: true
            });
        }
    }

    async unmuteUser(client, targetId, reason = 'Manual unmute') {
        try {
            const guild = client.guilds.cache.first(); // Assuming single guild bot
            const member = await guild.members.fetch(targetId);
            const muteRole = guild.roles.cache.get(config.roles.muted);

            if (muteRole && member.roles.cache.has(muteRole.id)) {
                await member.roles.remove(muteRole);

                const data = await this.getModerationData();
                if (data.mutes[targetId]) {
                    delete data.mutes[targetId];
                    await this.saveModerationData(data);
                }

                // Log the unmute
                await Logger.log(client, 'moderation', {
                    action: 'Unmute',
                    moderator: { tag: 'System', id: client.user.id },
                    target: { tag: member.user.tag, id: targetId },
                    reason: reason
                });
            }
        } catch (error) {
            console.error('[ERROR] Failed to unmute user:', error);
        }
    }

    async banUser(interaction, target, duration, reason) {
        try {
            if (!PermissionManager.canModerate(interaction.member)) {
                return interaction.reply({
                    content: '❌ You do not have permission to ban users.',
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ You cannot ban yourself.',
                    ephemeral: true
                });
            }

            // Fetch the guild member to check permissions properly
            let targetMember;
            try {
                targetMember = await interaction.guild.members.fetch(target.id);
            } catch (error) {
                return interaction.reply({
                    content: '❌ User not found in this server.',
                    ephemeral: true
                });
            }

            if (PermissionManager.isStaff(targetMember)) {
                return interaction.reply({
                    content: '❌ You cannot ban staff members.',
                    ephemeral: true
                });
            }

            // Create moderation case
            const moderationCase = await this.createCase('ban', interaction.user, target, reason, duration);

            // Send DM before banning
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle(`🔨 You have been banned from ${interaction.guild.name}`)
                    .addFields(
                        { name: 'Reason', value: reason || 'No reason provided', inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Case ID', value: `#${moderationCase.id}`, inline: true }
                    )
                    .setTimestamp();

                if (duration) {
                    dmEmbed.addFields({ name: 'Duration', value: this.formatDuration(duration), inline: true });
                }

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('[INFO] Could not send DM to user');
            }

            // Ban the user
            await interaction.guild.members.ban(target, {
                reason: `${reason || 'No reason provided'} | Moderator: ${interaction.user.tag} | Case: #${moderationCase.id}`,
                deleteMessageDays: 1
            });

            // Store ban data
            const data = await this.getModerationData();
            data.bans[target.id] = {
                moderatorId: interaction.user.id,
                reason: reason || 'No reason provided',
                duration: duration,
                timestamp: Date.now(),
                caseId: moderationCase.id
            };
            await this.saveModerationData(data);

            // Create ban embed
            const banEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🔨 User Banned')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Case ID', value: `#${moderationCase.id}`, inline: true },
                    { name: 'Duration', value: duration ? this.formatDuration(duration) : 'Permanent', inline: true },
                    { name: 'Reason', value: reason || 'No reason provided', inline: false }
                )
                .setTimestamp();

            // Set unban timer if duration is specified
            if (duration) {
                setTimeout(async () => {
                    try {
                        await this.unbanUser(interaction.client, target.id, 'Automatic unban');
                    } catch (error) {
                        console.error('[ERROR] Failed to auto-unban user:', error);
                    }
                }, duration);
            }

            // Log the ban
            await Logger.log(interaction.client, 'moderation', {
                action: 'Ban',
                moderator: interaction.user,
                target: target,
                reason: reason,
                duration: duration ? this.formatDuration(duration) : 'Permanent'
            });

            return interaction.reply({ embeds: [banEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to ban user:', error);
            return interaction.reply({
                content: '❌ Failed to ban user. Please try again later.',
                ephemeral: true
            });
        }
    }

    async kickUser(interaction, target, reason) {
        try {
            if (!PermissionManager.canModerate(interaction.member)) {
                return interaction.reply({
                    content: '❌ You do not have permission to kick users.',
                    ephemeral: true
                });
            }

            if (target.id === interaction.user.id) {
                return interaction.reply({
                    content: '❌ You cannot kick yourself.',
                    ephemeral: true
                });
            }

            // Fetch the guild member to check permissions properly
            let targetMember;
            try {
                targetMember = await interaction.guild.members.fetch(target.id);
            } catch (error) {
                return interaction.reply({
                    content: '❌ User not found in this server.',
                    ephemeral: true
                });
            }

            if (PermissionManager.isStaff(targetMember)) {
                return interaction.reply({
                    content: '❌ You cannot kick staff members.',
                    ephemeral: true
                });
            }

            // Create moderation case
            const moderationCase = await this.createCase('kick', interaction.user, target, reason);

            // Send DM before kicking
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(config.colors.warning)
                    .setTitle(`👢 You have been kicked from ${interaction.guild.name}`)
                    .addFields(
                        { name: 'Reason', value: reason || 'No reason provided', inline: false },
                        { name: 'Moderator', value: interaction.user.tag, inline: true },
                        { name: 'Case ID', value: `#${moderationCase.id}`, inline: true }
                    )
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log('[INFO] Could not send DM to user');
            }

            // Kick the user
            const member = await interaction.guild.members.fetch(target.id);
            await member.kick(`${reason || 'No reason provided'} | Moderator: ${interaction.user.tag} | Case: #${moderationCase.id}`);

            // Create kick embed
            const kickEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('👢 User Kicked')
                .addFields(
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Case ID', value: `#${moderationCase.id}`, inline: true },
                    { name: 'Reason', value: reason || 'No reason provided', inline: false }
                )
                .setTimestamp();

            // Log the kick
            await Logger.log(interaction.client, 'moderation', {
                action: 'Kick',
                moderator: interaction.user,
                target: target,
                reason: reason
            });

            return interaction.reply({ embeds: [kickEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to kick user:', error);
            return interaction.reply({
                content: '❌ Failed to kick user. Please try again later.',
                ephemeral: true
            });
        }
    }

    async unbanUser(client, targetId, reason = 'Manual unban') {
        try {
            const guild = client.guilds.cache.first();
            await guild.members.unban(targetId, reason);

            const data = await this.getModerationData();
            if (data.bans[targetId]) {
                delete data.bans[targetId];
                await this.saveModerationData(data);
            }

            // Log the unban
            await Logger.log(client, 'moderation', {
                action: 'Unban',
                moderator: { tag: 'System', id: client.user.id },
                target: { tag: 'Unknown User', id: targetId },
                reason: reason
            });
        } catch (error) {
            console.error('[ERROR] Failed to unban user:', error);
        }
    }

    async checkAutoPunishment(interaction, target, warningCount) {
        try {
            const config_mod = config.moderation.punishments;

            if (warningCount >= config_mod.muteThreshold) {
                // Auto-ban
                await this.banUser(interaction, target, null, `Automatic ban - ${warningCount} warnings`);
            } else if (warningCount >= config_mod.warnThreshold) {
                // Auto-mute
                await this.muteUser(interaction, target, config_mod.muteDuration, `Automatic mute - ${warningCount} warnings`);
            }
        } catch (error) {
            console.error('[ERROR] Failed to apply auto-punishment:', error);
        }
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day(s)`;
        if (hours > 0) return `${hours} hour(s)`;
        if (minutes > 0) return `${minutes} minute(s)`;
        return `${seconds} second(s)`;
    }

    parseDuration(durationString) {
        const regex = /(\d+)([smhd])/g;
        let totalMs = 0;
        let match;

        while ((match = regex.exec(durationString)) !== null) {
            const value = parseInt(match[1]);
            const unit = match[2];

            switch (unit) {
                case 's': totalMs += value * 1000; break;
                case 'm': totalMs += value * 60 * 1000; break;
                case 'h': totalMs += value * 60 * 60 * 1000; break;
                case 'd': totalMs += value * 24 * 60 * 60 * 1000; break;
            }
        }

        return totalMs;
    }
}

module.exports = new ModerationHandler();
