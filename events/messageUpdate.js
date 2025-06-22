const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Ignore bot messages, DMs, and messages without content changes
        if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;

        try {
            const logChannel = newMessage.guild.channels.cache.get(config.channels.serverLogs);
            if (!logChannel) return;

            const editEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('✏️ Message Edited')
                .addFields(
                    { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
                    { name: 'Channel', value: `${newMessage.channel} (${newMessage.channel.name})`, inline: true },
                    { name: 'Message ID', value: newMessage.id, inline: true }
                )
                .setTimestamp();

            if (oldMessage.content && oldMessage.content.length > 0) {
                editEmbed.addFields({
                    name: 'Before',
                    value: oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content,
                    inline: false
                });
            }

            if (newMessage.content && newMessage.content.length > 0) {
                editEmbed.addFields({
                    name: 'After',
                    value: newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content,
                    inline: false
                });
            }

            editEmbed.addFields({
                name: 'Jump to Message',
                value: `[Click here](${newMessage.url})`,
                inline: true
            });

            await logChannel.send({ embeds: [editEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to log message edit:', error);
        }
    },
};
