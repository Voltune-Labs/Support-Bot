const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: Events.GuildBanRemove,
    async execute(ban) {
        try {
            const logChannel = ban.guild.channels.cache.get(config.channels.modLogs);
            if (!logChannel) return;

            // Fetch audit log to get unban details
            let moderator = null;
            let reason = 'No reason provided';

            try {
                const auditLogs = await ban.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberBanRemove,
                    limit: 1
                });

                const unbanLog = auditLogs.entries.first();
                if (unbanLog && unbanLog.target.id === ban.user.id) {
                    moderator = unbanLog.executor;
                    reason = unbanLog.reason || 'No reason provided';
                }
            } catch (error) {
                console.error('[ERROR] Failed to fetch audit log for unban:', error);
            }

            const unbanEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('🔓 Member Unbanned')
                .addFields(
                    { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                    { name: 'Moderator', value: moderator ? `${moderator.tag}` : 'Unknown', inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await logChannel.send({ embeds: [unbanEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to log unban:', error);
        }
    },
};
