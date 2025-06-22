const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const PermissionManager = require('../utils/permissions.js');
const config = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Logging system commands (Admin only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check logging system status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('channels')
                .setDescription('List all configured log channels')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Send a test message to all log channels')
        ),

    async execute(interaction) {
        if (!PermissionManager.isAdmin(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to use logging commands.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'status':
                await this.handleStatus(interaction);
                break;
            case 'channels':
                await this.handleChannels(interaction);
                break;
            case 'test':
                await this.handleTest(interaction);
                break;
        }
    },

    async handleStatus(interaction) {
        const statusEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📊 Logging System Status')
            .setDescription('Current status of the logging system')
            .addFields(
                { name: '🎫 Ticket Logging', value: '✅ Active', inline: true },
                { name: '💡 Suggestion Logging', value: '✅ Active', inline: true },
                { name: '🔨 Moderation Logging', value: '✅ Active', inline: true },
                { name: '🤖 Auto-Mod Logging', value: config.moderation.autoMod.enabled ? '✅ Active' : '❌ Disabled', inline: true },
                { name: '📝 Server Logging', value: '✅ Active', inline: true },
                { name: '👋 Join/Leave Logging', value: '✅ Active', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    },

    async handleChannels(interaction) {
        const guild = interaction.guild;
        const channels = config.channels;

        const channelList = Object.entries(channels).map(([key, channelId]) => {
            const channel = guild.channels.cache.get(channelId);
            const status = channel ? '✅' : '❌';
            const name = channel ? channel.name : 'Not Found';
            return `${status} **${key}**: ${name} (${channelId})`;
        }).join('\n');

        const channelsEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('📋 Configured Log Channels')
            .setDescription(channelList)
            .addFields({
                name: 'Legend',
                value: '✅ = Channel found and accessible\n❌ = Channel not found or inaccessible',
                inline: false
            })
            .setTimestamp();

        await interaction.reply({ embeds: [channelsEmbed], ephemeral: true });
    },

    async handleTest(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const channels = config.channels;
        const results = [];

        const testEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('🧪 Test Log Message')
            .setDescription('This is a test message from the logging system.')
            .addFields(
                { name: 'Triggered by', value: `${interaction.user.tag}`, inline: true },
                { name: 'Test Time', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        for (const [key, channelId] of Object.entries(channels)) {
            try {
                const channel = guild.channels.cache.get(channelId);
                if (channel) {
                    await channel.send({ embeds: [testEmbed] });
                    results.push(`✅ ${key}: Message sent successfully`);
                } else {
                    results.push(`❌ ${key}: Channel not found`);
                }
            } catch (error) {
                results.push(`❌ ${key}: Failed to send message - ${error.message}`);
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(config.colors.info)
            .setTitle('🧪 Test Results')
            .setDescription(results.join('\n'))
            .setTimestamp();

        await interaction.editReply({ embeds: [resultEmbed] });
    }
};
