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

        // Main panel embed with better organization
        const panelEmbed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('🎫 Support Center')
            .setDescription('**Welcome to our Support Center!**\n\nNeed assistance? Our support team is here to help you. Choose the appropriate category below to create a support ticket.\n\n*Please provide detailed information about your issue to help us assist you better.*')
            .addFields(
                {
                    name: '🏁 Quick Start',
                    value: '• **Quick Ticket**: For general questions and simple issues\n• **Category Selection**: Choose specific support type below\n• **Response Time**: Typically within 1-24 hours',
                    inline: false
                },
                {
                    name: '📋 Support Categories',
                    value: Object.values(config.tickets.ticketCategories)
                        .map(cat => `${cat.emoji} **${cat.name}**\n└ ${cat.description}`)
                        .join('\n\n'),
                    inline: false
                },
                {
                    name: '📝 Before Creating a Ticket',
                    value: '• Check if your question has been answered before\n• Be clear and descriptive about your issue\n• Include relevant screenshots or error messages\n• Be patient - our team will respond as soon as possible',
                    inline: false
                },
                {
                    name: '⚡ Quick Actions',
                    value: 'Use the **Quick Ticket** button for general support',
                    inline: true
                },
                {
                    name: '🎯 Specific Issues',
                    value: 'Use the dropdown menu for specialized support',
                    inline: true
                }
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({
                text: `${interaction.guild.name} Support System • Choose an option below`,
                iconURL: interaction.guild.iconURL()
            })
            .setTimestamp();

        // Enhanced select menu with better styling
        const categorySelectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_category_select')
                    .setPlaceholder('🎯 Choose your support category...')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addOptions(
                        Object.entries(config.tickets.ticketCategories).map(([key, category]) => ({
                            label: category.name,
                            description: `${category.description} - Specialized support`,
                            value: key,
                            emoji: category.emoji
                        }))
                    )
            );

        // Enhanced button row with multiple options
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_quick_create')
                    .setLabel('Quick Support')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('ticket_help_info')
                    .setLabel('Help & FAQ')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓'),
                new ButtonBuilder()
                    .setCustomId('ticket_status_check')
                    .setLabel('Check Status')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📊')
            );

        try {
            // Send enhanced panel to target channel
            await targetChannel.send({
                embeds: [panelEmbed],
                components: [categorySelectMenu, actionButtons]
            });

            // Send confirmation with additional info
            const confirmEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setTitle('✅ Ticket Panel Created')
                .setDescription(`The enhanced ticket panel has been successfully created in ${targetChannel}!`)
                .addFields(
                    { name: '📊 Features', value: '• Category selection dropdown\n• Quick support button\n• Help & FAQ button\n• Status check button', inline: true },
                    { name: '🎯 Components', value: '• Modern embed design\n• Enhanced user guidance\n• Better organization', inline: true }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [confirmEmbed],
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
