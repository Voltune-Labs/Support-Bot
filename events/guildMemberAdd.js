const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // Log member join
            const joinChannel = member.guild.channels.cache.get(config.channels.joinLeave);
            
            if (joinChannel) {
                const joinEmbed = new EmbedBuilder()
                    .setColor(config.colors.success)
                    .setTitle('Member Joined')
                    .setDescription(`${member.user.tag} has joined the server!`)
                    .addFields(
                        { name: 'User', value: `${member.user} (${member.user.id})`, inline: true },
                        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();

                await joinChannel.send({ embeds: [joinEmbed] });
            }

            // Auto-role assignment could be added here
            // const autoRole = member.guild.roles.cache.get('ROLE_ID');
            // if (autoRole) {
            //     await member.roles.add(autoRole);
            // }

        } catch (error) {
            console.error('[ERROR] Error in guildMemberAdd event:', error);
        }
    },
};
