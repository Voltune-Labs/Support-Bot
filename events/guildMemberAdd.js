const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            console.log(`[INFO] Member joined: ${member.user.tag} (${member.user.id})`);

            // Log member join
            const joinChannel = member.guild.channels.cache.get(config.channels.joinLeave);

            if (!joinChannel) {
                console.error(`[ERROR] Join/Leave channel not found: ${config.channels.joinLeave}`);
                return;
            }

            // Calculate account age
            const accountAge = Date.now() - member.user.createdTimestamp;
            const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));
            const isNewAccount = accountAgeDays < 7;

            const joinEmbed = new EmbedBuilder()
                .setColor(isNewAccount ? config.colors.warning : config.colors.success)
                .setTitle('👋 Member Joined')
                .setDescription(`**${member.user.tag}** has joined the server!${isNewAccount ? ' ⚠️ **New Account**' : ''}`)
                .addFields(
                    { name: '👤 User', value: `${member.user} (${member.user.id})`, inline: true },
                    { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📊 Member Count', value: `${member.guild.memberCount}`, inline: true },
                    { name: '🎂 Account Age', value: `${accountAgeDays} days`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `User ID: ${member.user.id}` })
                .setTimestamp();

            await joinChannel.send({ embeds: [joinEmbed] });
            console.log(`[INFO] Member join logged for ${member.user.tag}`);

            // Auto-role assignment could be added here
            const autoRoleId = config.roles.autoRole;
            if (!autoRoleId) {
                return;
            }

            const autoRole = member.guild.roles.cache.get(autoRoleId);
            if (!autoRole) {
                console.error(`[ERROR] Auto-role not found: ${autoRoleId}`);
                return;
            }

            try {
                await member.roles.add(autoRole).catch(() => {});
            } catch (error) {
                console.error(`[ERROR] Failed to assign auto-role to ${member.user.tag}:`, error);
            }

        } catch (error) {
            console.error('[ERROR] Error in guildMemberAdd event:', error);
            console.error('Member object:', member);
            console.error('Config channels:', config.channels);
        }
    },
};
