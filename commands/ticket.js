const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const config = require('../config.js');
const ticketHandler = require('../handlers/ticketHandler.js');
const PermissionManager = require('../utils/permissions.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket system commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new support ticket')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Select a ticket category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'General Support', value: 'general' },
                            { name: 'Technical Support', value: 'technical' },
                            { name: 'Billing Support', value: 'billing' },
                            { name: 'Report User', value: 'report' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Create a ticket panel (Staff only)')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to send the panel to (defaults to current channel)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close the current ticket')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the ticket (Staff only)')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to add to the ticket')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the ticket (Staff only)')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to remove from the ticket')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await this.handleCreate(interaction);
                break;
            case 'panel':
                await this.handlePanel(interaction);
                break;
            case 'close':
                await this.handleClose(interaction);
                break;
            case 'add':
                await this.handleAdd(interaction);
                break;
            case 'remove':
                await this.handleRemove(interaction);
                break;
        }
    },

    async handleCreate(interaction) {
        const category = interaction.options.getString('category') || 'general';
        await ticketHandler.createTicket(interaction, category);
    },

    async handlePanel(interaction) {
        if (!PermissionManager.canManageTickets(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to create ticket panels.',
                ephemeral: true
            });
        }

        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        const panelEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎫 Support Tickets')
            .setDescription('Need help? Create a support ticket by selecting a category below.\n\nOur support team will assist you as soon as possible!')
            .addFields(
                { 
                    name: '📋 Available Categories', 
                    value: Object.values(config.tickets.ticketCategories)
                        .map(cat => `${cat.emoji} **${cat.name}** - ${cat.description}`)
                        .join('\n'),
                    inline: false 
                },
                {
                    name: '⏰ Response Time',
                    value: 'We typically respond within 1-24 hours',
                    inline: true
                },
                {
                    name: '📝 Guidelines',
                    value: 'Please be descriptive and patient',
                    inline: true
                }
            )
            .setFooter({ text: 'Select a category below to create a ticket' })
            .setTimestamp();

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_category_select')
                    .setPlaceholder('Select a ticket category...')
                    .addOptions(
                        Object.entries(config.tickets.ticketCategories).map(([key, category]) => ({
                            label: category.name,
                            description: category.description,
                            value: key,
                            emoji: category.emoji
                        }))
                    )
            );

        const quickButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_quick_create')
                    .setLabel('Quick Ticket')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡')
            );

        try {
            // Send panel to target channel
            await targetChannel.send({
                embeds: [panelEmbed],
                components: [selectMenu, quickButton]
            });

            // Confirm to the moderator
            const confirmMessage = targetChannel.id === interaction.channel.id
                ? '✅ Ticket panel has been created in this channel!'
                : `✅ Ticket panel has been sent to ${targetChannel}!`;

            await interaction.reply({
                content: confirmMessage,
                ephemeral: true
            });

        } catch (error) {
            console.error('[ERROR] Failed to send ticket panel:', error);
            await interaction.reply({
                content: '❌ Failed to send ticket panel. Make sure I have permission to send messages in that channel.',
                ephemeral: true
            });
        }
    },

    async handleClose(interaction) {
        const channelId = interaction.channel.id;
        await ticketHandler.closeTicket(interaction, channelId);
    },

    async handleAdd(interaction) {
        if (!PermissionManager.canManageTickets(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to add users to tickets.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');
        const channel = interaction.channel;

        try {
            await channel.permissionOverwrites.edit(user, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            const addEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✅ ${user} has been added to this ticket.`)
                .setTimestamp();

            await interaction.reply({ embeds: [addEmbed] });
        } catch (error) {
            console.error('[ERROR] Failed to add user to ticket:', error);
            await interaction.reply({
                content: '❌ Failed to add user to ticket.',
                ephemeral: true
            });
        }
    },

    async handleRemove(interaction) {
        if (!PermissionManager.canManageTickets(interaction.member)) {
            return interaction.reply({
                content: '❌ You do not have permission to remove users from tickets.',
                ephemeral: true
            });
        }

        const user = interaction.options.getUser('user');
        const channel = interaction.channel;

        try {
            await channel.permissionOverwrites.edit(user, {
                ViewChannel: false
            });

            const removeEmbed = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setDescription(`🚫 ${user} has been removed from this ticket.`)
                .setTimestamp();

            await interaction.reply({ embeds: [removeEmbed] });
        } catch (error) {
            console.error('[ERROR] Failed to remove user from ticket:', error);
            await interaction.reply({
                content: '❌ Failed to remove user from ticket.',
                ephemeral: true
            });
        }
    }
};
