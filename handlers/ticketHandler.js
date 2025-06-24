const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');
const config = require('../config.js');
const Logger = require('../utils/logger.js');
const PermissionManager = require('../utils/permissions.js');
const fs = require('fs-extra');
const path = require('path');

class TicketHandler {
    constructor() {
        this.ticketsPath = path.join(__dirname, '../data/tickets.json');
        this.ensureTicketData();
    }

    async ensureTicketData() {
        try {
            await fs.ensureFile(this.ticketsPath);
            const data = await fs.readJson(this.ticketsPath).catch(() => ({}));
            if (!data.tickets) {
                await fs.writeJson(this.ticketsPath, { tickets: {}, userTickets: {} });
            }
        } catch (error) {
            console.error('[ERROR] Failed to ensure ticket data:', error);
        }
    }

    async getTicketData() {
        try {
            return await fs.readJson(this.ticketsPath);
        } catch (error) {
            console.error('[ERROR] Failed to read ticket data:', error);
            return { tickets: {}, userTickets: {} };
        }
    }

    async saveTicketData(data) {
        try {
            await fs.writeJson(this.ticketsPath, data);
        } catch (error) {
            console.error('[ERROR] Failed to save ticket data:', error);
        }
    }

    async createTicket(interaction, category = 'general') {
        try {
            const data = await this.getTicketData();
            const userId = interaction.user.id;
            
            // Check if user has reached ticket limit
            const userTickets = data.userTickets[userId] || [];
            const activeTickets = userTickets.filter(ticketId => data.tickets[ticketId]?.active);
            
            if (activeTickets.length >= config.tickets.maxTicketsPerUser) {
                return interaction.reply({
                    content: `❌ You have reached the maximum number of active tickets (${config.tickets.maxTicketsPerUser}).`,
                    ephemeral: true
                });
            }

            const guild = interaction.guild;
            const ticketCategory = guild.channels.cache.get(config.channels.ticketCategory);
            
            if (!ticketCategory) {
                return interaction.reply({
                    content: '❌ Ticket category not found. Please contact an administrator.',
                    ephemeral: true
                });
            }

            // Create ticket channel
            const ticketNumber = Object.keys(data.tickets).length + 1;
            const channelName = `ticket-${ticketNumber}-${interaction.user.username}`;
            
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: ticketCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                        ],
                    },
                    ...config.tickets.supportRoles.map(roleId => ({
                        id: roleId,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageMessages,
                        ],
                    })),
                ],
            });

            // Create ticket embed and buttons
            const ticketEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`🎫 Ticket #${ticketNumber}`)
                .setDescription(`Hello ${interaction.user}, thank you for creating a ticket!\n\nPlease describe your issue and a staff member will assist you shortly.`)
                .addFields(
                    { name: 'Category', value: config.tickets.ticketCategories[category]?.name || 'General Support', inline: true },
                    { name: 'Created by', value: `${interaction.user}`, inline: true },
                    { name: 'Status', value: '🟢 Open', inline: true }
                )
                .setTimestamp();

            const ticketButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_close_${ticketChannel.id}`)
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒'),
                    new ButtonBuilder()
                        .setCustomId(`ticket_claim_${ticketChannel.id}`)
                        .setLabel('Claim Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✋'),
                    new ButtonBuilder()
                        .setCustomId(`ticket_transcript_${ticketChannel.id}`)
                        .setLabel('Generate Transcript')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📄')
                );

            await ticketChannel.send({
                content: `${interaction.user} | <@&${config.roles.staff}>`,
                embeds: [ticketEmbed],
                components: [ticketButtons]
            });

            // Save ticket data
            const ticketId = ticketChannel.id;
            data.tickets[ticketId] = {
                id: ticketId,
                number: ticketNumber,
                userId: userId,
                category: category,
                active: true,
                claimed: false,
                claimedBy: null,
                createdAt: Date.now(),
                messages: []
            };

            if (!data.userTickets[userId]) {
                data.userTickets[userId] = [];
            }
            data.userTickets[userId].push(ticketId);

            await this.saveTicketData(data);

            // Log ticket creation
            await Logger.log(interaction.client, 'ticket', {
                action: 'Created',
                user: interaction.user,
                channel: ticketChannel,
                category: category
            });

            return interaction.reply({
                content: `✅ Ticket created! Please check ${ticketChannel}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('[ERROR] Failed to create ticket:', error);
            return interaction.reply({
                content: '❌ Failed to create ticket. Please try again later.',
                ephemeral: true
            });
        }
    }

    async createTicketWithDetails(interaction, category, reason, priority) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const data = await this.getTicketData();
            const guild = interaction.guild;
            const user = interaction.user;
            const userId = user.id;
            const categoryInfo = config.tickets.ticketCategories[category];

            // Check if user has reached ticket limit using proper data structure
            const userTickets = data.userTickets[userId] || [];
            const activeTickets = userTickets.filter(ticketId => data.tickets[ticketId]?.active);

            if (activeTickets.length >= config.tickets.maxTicketsPerUser) {
                return interaction.editReply({
                    content: `❌ You have reached the maximum number of active tickets (${config.tickets.maxTicketsPerUser}). Please close an existing ticket before creating a new one.`
                });
            }

            // Create the ticket channel
            const ticketNumber = Object.keys(data.tickets).length + 1;
            const ticketChannel = await guild.channels.create({
                name: `ticket-${ticketNumber}-${user.username.toLowerCase()}`,
                type: 0, // Text channel
                parent: config.channels.ticketCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                    },
                    ...config.tickets.supportRoles.map(roleId => ({
                        id: roleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles', 'ManageMessages']
                    }))
                ]
            });

            // Create detailed ticket embed
            const ticketEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setTitle(`🎫 Ticket #${ticketNumber} - ${categoryInfo.name}`)
                .setDescription(`**Ticket created by:** ${user}\n**Priority:** ${priority}\n\n**Issue Description:**\n${reason}`)
                .addFields(
                    { name: '📋 Category', value: categoryInfo.description, inline: true },
                    { name: '⚡ Priority', value: priority, inline: true },
                    { name: '🕐 Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Ticket ID: ${ticketChannel.id}` })
                .setTimestamp();

            // Create action buttons
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_claim_${ticketChannel.id}`)
                        .setLabel('Claim Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🙋'),
                    new ButtonBuilder()
                        .setCustomId(`ticket_close_${ticketChannel.id}`)
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒'),
                    new ButtonBuilder()
                        .setCustomId(`ticket_transcript_${ticketChannel.id}`)
                        .setLabel('Transcript')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📄')
                );

            // Send welcome message
            await ticketChannel.send({
                content: `${user} Welcome to your support ticket!\n\n${config.tickets.supportRoles.map(roleId => `<@&${roleId}>`).join(' ')} A support team member will be with you shortly.`,
                embeds: [ticketEmbed],
                components: [actionRow]
            });

            // Save ticket data
            const ticketId = ticketChannel.id;
            data.tickets[ticketId] = {
                id: ticketId,
                number: ticketNumber,
                userId: userId,
                category: category,
                active: true,
                claimed: false,
                claimedBy: null,
                createdAt: Date.now(),
                messages: [],
                reason: reason,
                priority: priority
            };

            if (!data.userTickets[userId]) {
                data.userTickets[userId] = [];
            }
            data.userTickets[userId].push(ticketId);

            await this.saveTicketData(data);

            // Confirm ticket creation
            await interaction.editReply({
                content: `✅ Your ${categoryInfo.name.toLowerCase()} ticket has been created! Please check ${ticketChannel} for assistance.`
            });

            // Log ticket creation
            const Logger = require('../utils/logger.js');
            await Logger.log(interaction.client, 'ticket', {
                action: 'Created',
                user: user,
                channel: ticketChannel,
                category: categoryInfo.name,
                priority: priority,
                reason: reason
            });

        } catch (error) {
            console.error('[ERROR] Failed to create ticket with details:', error);

            const errorMessage = {
                content: '❌ Failed to create ticket. Please try again later or contact an administrator.'
            };

            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply({ ...errorMessage, ephemeral: true });
            }
        }
    }

    async closeTicket(interaction, channelId) {
        try {
            const data = await this.getTicketData();
            const ticket = data.tickets[channelId];

            if (!ticket || !ticket.active) {
                return interaction.reply({
                    content: '❌ This is not an active ticket.',
                    ephemeral: true
                });
            }

            // Check permissions
            if (ticket.userId !== interaction.user.id && !PermissionManager.canManageTickets(interaction.member)) {
                return interaction.reply({
                    content: '❌ You do not have permission to close this ticket.',
                    ephemeral: true
                });
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                return interaction.reply({
                    content: '❌ Ticket channel not found.',
                    ephemeral: true
                });
            }

            // Generate transcript before closing
            const transcript = await this.generateTranscript(channel);
            
            // Send transcript to logs channel
            const transcriptChannel = interaction.guild.channels.cache.get(config.channels.ticketTranscripts);
            if (transcriptChannel && transcript) {
                await transcriptChannel.send({
                    content: `📄 Transcript for Ticket #${ticket.number}`,
                    files: [transcript]
                });
            }

            // Update ticket data
            ticket.active = false;
            ticket.closedAt = Date.now();
            ticket.closedBy = interaction.user.id;
            await this.saveTicketData(data);

            // Log ticket closure
            await Logger.log(interaction.client, 'ticket', {
                action: 'Closed',
                user: interaction.user,
                channel: channel,
                category: ticket.category
            });

            // Close the channel after configured delay
            const delaySeconds = config.tickets.closeDelay / 1000;
            await interaction.reply(`🔒 This ticket will be deleted in ${delaySeconds} seconds...`);

            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (error) {
                    console.error('[ERROR] Failed to delete ticket channel:', error);
                }
            }, config.tickets.closeDelay);

        } catch (error) {
            console.error('[ERROR] Failed to close ticket:', error);
            return interaction.reply({
                content: '❌ Failed to close ticket. Please try again later.',
                ephemeral: true
            });
        }
    }

    async claimTicket(interaction, channelId) {
        try {
            const data = await this.getTicketData();
            const ticket = data.tickets[channelId];

            if (!ticket || !ticket.active) {
                return interaction.reply({
                    content: '❌ This is not an active ticket.',
                    ephemeral: true
                });
            }

            if (!PermissionManager.canManageTickets(interaction.member)) {
                return interaction.reply({
                    content: '❌ You do not have permission to claim tickets.',
                    ephemeral: true
                });
            }

            if (ticket.claimed) {
                return interaction.reply({
                    content: `❌ This ticket is already claimed by <@${ticket.claimedBy}>.`,
                    ephemeral: true
                });
            }

            // Claim the ticket
            ticket.claimed = true;
            ticket.claimedBy = interaction.user.id;
            ticket.claimedAt = Date.now();
            await this.saveTicketData(data);

            const claimEmbed = new EmbedBuilder()
                .setColor(config.colors.success)
                .setDescription(`✋ This ticket has been claimed by ${interaction.user}`)
                .setTimestamp();

            await interaction.reply({ embeds: [claimEmbed] });

        } catch (error) {
            console.error('[ERROR] Failed to claim ticket:', error);
            return interaction.reply({
                content: '❌ Failed to claim ticket. Please try again later.',
                ephemeral: true
            });
        }
    }

    async generateTranscript(channel) {
        try {
            const messages = await channel.messages.fetch({ limit: config.tickets.transcriptLimit });
            const transcript = messages.reverse().map(msg => {
                const timestamp = new Date(msg.createdTimestamp).toLocaleString();
                return `[${timestamp}] ${msg.author.tag}: ${msg.content}`;
            }).join('\n');

            const filename = `transcript-${channel.name}-${Date.now()}.txt`;
            const buffer = Buffer.from(transcript, 'utf-8');

            return {
                attachment: buffer,
                name: filename
            };
        } catch (error) {
            console.error('[ERROR] Failed to generate transcript:', error);
            return null;
        }
    }
}

module.exports = new TicketHandler();
