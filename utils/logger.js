const { EmbedBuilder } = require('discord.js');
const config = require('../config.js');

class Logger {
    static async log(client, type, data) {
        try {
            let channel;
            let embed;

            switch (type) {
                case 'moderation':
                    channel = client.channels.cache.get(config.channels.modLogs);
                    embed = this.createModerationEmbed(data);
                    break;
                case 'automod':
                    channel = client.channels.cache.get(config.channels.autoModLogs);
                    embed = this.createAutoModEmbed(data);
                    break;
                case 'ticket':
                    channel = client.channels.cache.get(config.channels.ticketLogs);
                    embed = this.createTicketEmbed(data);
                    break;
                case 'suggestion':
                    channel = client.channels.cache.get(config.channels.suggestionLogs);
                    embed = this.createSuggestionEmbed(data);
                    break;
                case 'server':
                    channel = client.channels.cache.get(config.channels.serverLogs);
                    embed = this.createServerEmbed(data);
                    break;
                default:
                    console.error('[ERROR] Unknown log type:', type);
                    return;
            }

            if (channel && embed) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('[ERROR] Failed to send log:', error);
        }
    }

    static createModerationEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle(`Moderation Action: ${data.action}`)
            .setColor(this.getColorForAction(data.action))
            .setTimestamp();

        // Handle different types of moderation actions
        if (data.action.toLowerCase() === 'purge') {
            embed.addFields(
                { name: 'Moderator', value: `${data.moderator.tag} (${data.moderator.id})`, inline: true },
                { name: 'Channel', value: `<#${data.channel.id}>`, inline: true },
                { name: 'Messages Deleted', value: `${data.amount}`, inline: true }
            );

            if (data.targetUser) {
                embed.addFields(
                    { name: 'Target User', value: `${data.targetUser.tag} (${data.targetUser.id})`, inline: true }
                );
            }

            embed.addFields(
                { name: 'Reason', value: data.reason || 'No reason provided', inline: false }
            );
        } else {
            // Standard moderation action
            embed.addFields(
                { name: 'Target', value: `${data.target.tag} (${data.target.id})`, inline: true },
                { name: 'Moderator', value: `${data.moderator.tag} (${data.moderator.id})`, inline: true },
                { name: 'Action', value: data.action, inline: true }
            );

            if (data.reason) {
                embed.addFields({ name: 'Reason', value: data.reason, inline: false });
            }

            if (data.duration) {
                embed.addFields({ name: 'Duration', value: data.duration, inline: true });
            }
        }

        return embed;
    }

    static createAutoModEmbed(data) {
        return new EmbedBuilder()
            .setTitle('Auto-Moderation Action')
            .setColor(config.colors.warning)
            .addFields(
                { name: 'User', value: `${data.user.tag} (${data.user.id})`, inline: true },
                { name: 'Action', value: data.action, inline: true },
                { name: 'Trigger', value: data.trigger, inline: true },
                { name: 'Channel', value: `<#${data.channel.id}>`, inline: true }
            )
            .setTimestamp();
    }

    static createTicketEmbed(data) {
        const embed = new EmbedBuilder()
            .setTitle(`Ticket ${data.action}`)
            .setColor(this.getColorForAction(data.action))
            .addFields(
                { name: 'Ticket', value: `<#${data.channel.id}>`, inline: true },
                { name: 'User', value: `${data.user.tag} (${data.user.id})`, inline: true },
                { name: 'Category', value: data.category || 'General', inline: true }
            )
            .setTimestamp();

        // Add additional details if available
        if (data.priority) {
            embed.addFields({ name: 'Priority', value: data.priority, inline: true });
        }

        if (data.reason) {
            embed.addFields({ name: 'Reason', value: data.reason.length > 1024 ? data.reason.substring(0, 1021) + '...' : data.reason, inline: false });
        }

        return embed;
    }

    static createSuggestionEmbed(data) {
        return new EmbedBuilder()
            .setTitle(`Suggestion ${data.action}`)
            .setColor(this.getColorForAction(data.action))
            .addFields(
                { name: 'User', value: `${data.user.tag} (${data.user.id})`, inline: true },
                { name: 'Suggestion ID', value: `${data.suggestionId}`, inline: true }
            )
            .setTimestamp();
    }

    static createServerEmbed(data) {
        return new EmbedBuilder()
            .setTitle(data.title)
            .setDescription(data.description)
            .setColor(config.colors.info)
            .setTimestamp();
    }

    static getColorForAction(action) {
        const actionColors = {
            'ban': config.colors.error,
            'unban': config.colors.success,
            'kick': config.colors.warning,
            'mute': config.colors.warning,
            'unmute': config.colors.success,
            'warn': config.colors.warning,
            'created': config.colors.success,
            'closed': config.colors.error,
            'approved': config.colors.success,
            'denied': config.colors.error,
            'deleted': config.colors.error,
            'purge': config.colors.warning
        };

        return actionColors[action.toLowerCase()] || config.colors.info;
    }
}

module.exports = Logger;
