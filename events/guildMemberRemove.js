const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            console.log(`[INFO] Member left: ${member.user.tag} (${member.user.id})`);

            // Log member leave
            const leaveChannel = member.guild.channels.cache.get(config.channels.joinLeave);

            if (!leaveChannel) {
                console.error(`[ERROR] Join/Leave channel not found: ${config.channels.joinLeave}`);
                return;
            }

            // Calculate how long they were in the server
            const timeInServer = member.joinedAt ? Date.now() - member.joinedTimestamp : null;
            const timeInServerText = timeInServer ?
                `${Math.floor(timeInServer / (1000 * 60 * 60 * 24))} days` :
                'Unknown';

            const leaveEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('👋 Member Left')
                .setDescription(`**${member.user.tag}** has left the server.`)
                .addFields(
                    { name: '👤 User', value: `${member.user} (${member.user.id})`, inline: true },
                    { name: '📅 Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                    { name: '⏱️ Time in Server', value: timeInServerText, inline: true },
                    { name: '📊 Member Count', value: `${member.guild.memberCount}`, inline: true },
                    { name: '🏷️ Roles', value: member.roles.cache.size > 1 ?
                        member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.name).join(', ') || 'None' :
                        'None', inline: false }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `User ID: ${member.user.id}` })
                .setTimestamp();

            await leaveChannel.send({ embeds: [leaveEmbed] });
            console.log(`[INFO] Member leave logged for ${member.user.tag}`);

        } catch (error) {
            console.error('[ERROR] Error in guildMemberRemove event:', error);
            console.error('Member object:', member);
            console.error('Config channels:', config.channels);
        }
    },
};
