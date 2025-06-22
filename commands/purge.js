const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const PermissionManager = require('../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages at once')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for purging messages')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        // Check permissions
        if (!PermissionManager.canModerate(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to purge messages.',
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount');
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            await interaction.deferReply({ ephemeral: true });

            // Fetch messages
            const messages = await interaction.channel.messages.fetch({ 
                limit: targetUser ? 100 : amount 
            });

            let messagesToDelete = messages;

            // Filter by user if specified
            if (targetUser) {
                messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id);
                messagesToDelete = messagesToDelete.first(amount);
            }

            // Filter out messages older than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            messagesToDelete = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);

            if (messagesToDelete.size === 0) {
                return interaction.editReply({
                    content: '❌ No messages found to delete. Messages must be less than 14 days old.'
                });
            }

            // Delete messages
            const deletedMessages = await interaction.channel.bulkDelete(messagesToDelete, true);

            // Send confirmation
            const confirmationMessage = targetUser 
                ? `✅ Successfully deleted **${deletedMessages.size}** messages from ${targetUser.tag}.`
                : `✅ Successfully deleted **${deletedMessages.size}** messages.`;

            await interaction.editReply({
                content: confirmationMessage
            });

            // Log the purge action
            const Logger = require('../utils/logger.js');
            await Logger.log(interaction.client, 'moderation', {
                action: 'Purge',
                moderator: interaction.user,
                channel: interaction.channel,
                amount: deletedMessages.size,
                targetUser: targetUser,
                reason: reason
            });

        } catch (error) {
            console.error('[ERROR] Failed to purge messages:', error);
            
            const errorMessage = {
                content: '❌ Failed to purge messages. Make sure the messages are less than 14 days old and I have the necessary permissions.'
            };

            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply({ ...errorMessage, ephemeral: true });
            }
        }
    }
};
