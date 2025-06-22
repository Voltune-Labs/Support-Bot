const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // Ignore bot messages and DMs
        if (!message.guild || message.author?.bot) return;

        try {
            const logChannel = message.guild.channels.cache.get(config.channels.serverLogs);
            if (!logChannel) return;

            const deleteEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('🗑️ Message Deleted')
                .addFields(
                    { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown User', inline: true },
                    { name: 'Channel', value: `${message.channel} (${message.channel.name})`, inline: true },
                    { name: 'Message ID', value: message.id, inline: true }
                )
                .setTimestamp();

            if (message.content && message.content.length > 0) {
                deleteEmbed.addFields({
                    name: 'Content',
                    value: message.content.length > 1024 ? message.content.substring(0, 1021) + '...' : message.content,
                    inline: false
                });
            }

            if (message.attachments.size > 0) {
                const attachments = message.attachments.map(att => att.name).join(', ');
                deleteEmbed.addFields({
                    name: 'Attachments',
                    value: attachments.length > 1024 ? attachments.substring(0, 1021) + '...' : attachments,
                    inline: false
                });
            }

            await logChannel.send({ embeds: [deleteEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to log message deletion:', error);
        }
    },
};
