const { Events, EmbedBuilder, AuditLogEvent } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: Events.GuildBanAdd,
    async execute(ban) {
        try {
            const logChannel = ban.guild.channels.cache.get(config.channels.modLogs);
            if (!logChannel) return;

            // Fetch audit log to get ban details
            let moderator = null;
            let reason = 'No reason provided';

            try {
                const auditLogs = await ban.guild.fetchAuditLogs({
                    type: AuditLogEvent.MemberBanAdd,
                    limit: 1
                });

                const banLog = auditLogs.entries.first();
                if (banLog && banLog.target.id === ban.user.id) {
                    moderator = banLog.executor;
                    reason = banLog.reason || 'No reason provided';
                }
            } catch (error) {
                console.error('[ERROR] Failed to fetch audit log for ban:', error);
            }

            const banEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🔨 Member Banned')
                .addFields(
                    { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: true },
                    { name: 'Moderator', value: moderator ? `${moderator.tag}` : 'Unknown', inline: true },
                    { name: 'Reason', value: reason, inline: false }
                )
                .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await logChannel.send({ embeds: [banEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to log ban:', error);
        }
    },
};
