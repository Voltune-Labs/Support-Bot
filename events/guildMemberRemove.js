const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            // Log member leave
            const leaveChannel = member.guild.channels.cache.get(config.channels.joinLeave);
            
            if (leaveChannel) {
                const leaveEmbed = new EmbedBuilder()
                    .setColor(config.colors.error)
                    .setTitle('Member Left')
                    .setDescription(`${member.user.tag} has left the server.`)
                    .addFields(
                        { name: 'User', value: `${member.user} (${member.user.id})`, inline: true },
                        { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                        { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await leaveChannel.send({ embeds: [leaveEmbed] });
            }

        } catch (error) {
            console.error('[ERROR] Error in guildMemberRemove event:', error);
        }
    },
};
