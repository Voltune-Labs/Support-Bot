const { Events } = require('discord.js');
const config = require('../config.js');
const Logger = require('../utils/logger.js');
const PermissionManager = require('../utils/permissions.js');

// Auto-moderation filters - now controlled by config

const inviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/gi;
const spamTracker = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        // Ignore staff members
        if (PermissionManager.isStaff(message.member)) return;

        // Check if auto-moderation is enabled
        if (!config.moderation.autoMod.enabled) return;

        try {
            // Anti-spam check
            if (config.moderation.autoMod.antiSpam) {
                await checkSpam(message);
            }

            // Anti-invite check
            if (config.moderation.autoMod.antiInvite) {
                await checkInvites(message);
            }

            // Anti-caps check
            if (config.moderation.autoMod.antiCaps) {
                await checkCaps(message);
            }

            // Bad words check
            if (config.moderation.autoMod.badWords) {
                await checkBadWords(message);
            }

        } catch (error) {
            console.error('[ERROR] Auto-moderation error:', error);
        }
    },
};

async function checkSpam(message) {
    const userId = message.author.id;
    const now = Date.now();
    const timeWindow = config.moderation.autoMod.spamTimeWindow;
    const messageLimit = config.moderation.autoMod.spamMessageLimit;

    if (!spamTracker.has(userId)) {
        spamTracker.set(userId, []);
    }

    const userMessages = spamTracker.get(userId);
    
    // Remove old messages outside the time window
    const recentMessages = userMessages.filter(timestamp => now - timestamp < timeWindow);
    recentMessages.push(now);
    
    spamTracker.set(userId, recentMessages);

    if (recentMessages.length >= messageLimit) {
        // Delete the spam messages
        try {
            const channel = message.channel;
            const messages = await channel.messages.fetch({ limit: 10 });
            const userSpamMessages = messages.filter(msg => 
                msg.author.id === userId && 
                now - msg.createdTimestamp < timeWindow
            );

            await channel.bulkDelete(userSpamMessages);
        } catch (error) {
            console.error('[ERROR] Failed to delete spam messages:', error);
        }

        // Mute the user temporarily
        try {
            const muteRole = message.guild.roles.cache.get(config.roles.muted);
            if (muteRole) {
                await message.member.roles.add(muteRole);
                
                // Auto-unmute after configured duration
                setTimeout(async () => {
                    try {
                        await message.member.roles.remove(muteRole);
                    } catch (error) {
                        console.error('[ERROR] Failed to auto-unmute spammer:', error);
                    }
                }, config.moderation.autoMod.spamMuteDuration);
            }
        } catch (error) {
            console.error('[ERROR] Failed to mute spammer:', error);
        }

        // Log the action
        await Logger.log(message.client, 'automod', {
            action: 'Spam Detection',
            user: message.author,
            channel: message.channel,
            trigger: 'Rapid message sending'
        });

        // Clear the spam tracker for this user
        spamTracker.delete(userId);

        // Send warning message
        const warningMessage = await message.channel.send(
            `⚠️ ${message.author}, you have been temporarily muted for spamming.`
        );

        // Delete warning message after configured time
        setTimeout(() => {
            warningMessage.delete().catch(() => {});
        }, config.moderation.autoMod.warningMessageDeleteTime);
    }
}

async function checkInvites(message) {
    if (inviteRegex.test(message.content)) {
        try {
            await message.delete();
            
            // Log the action
            await Logger.log(message.client, 'automod', {
                action: 'Invite Link Deleted',
                user: message.author,
                channel: message.channel,
                trigger: 'Discord invite link'
            });

            // Send warning message
            const warningMessage = await message.channel.send(
                `⚠️ ${message.author}, Discord invite links are not allowed here.`
            );

            // Delete warning message after configured time
            setTimeout(() => {
                warningMessage.delete().catch(() => {});
            }, config.moderation.autoMod.warningMessageDeleteTime);

        } catch (error) {
            console.error('[ERROR] Failed to delete invite message:', error);
        }
    }
}

async function checkCaps(message) {
    const content = message.content;
    const capsPercentage = (content.match(/[A-Z]/g) || []).length / content.length;
    
    // Check against configured thresholds
    if (capsPercentage > config.moderation.autoMod.capsPercentageThreshold && content.length > config.moderation.autoMod.capsMinLength) {
        try {
            await message.delete();
            
            // Log the action
            await Logger.log(message.client, 'automod', {
                action: 'Excessive Caps Deleted',
                user: message.author,
                channel: message.channel,
                trigger: 'Excessive capital letters'
            });

            // Send warning message
            const warningMessage = await message.channel.send(
                `⚠️ ${message.author}, please don't use excessive capital letters.`
            );

            // Delete warning message after configured time
            setTimeout(() => {
                warningMessage.delete().catch(() => {});
            }, config.moderation.autoMod.warningMessageDeleteTime);

        } catch (error) {
            console.error('[ERROR] Failed to delete caps message:', error);
        }
    }
}

async function checkBadWords(message) {
    const content = message.content.toLowerCase();
    const badWords = config.moderation.autoMod.badWordsList;
    const foundBadWords = badWords.filter(word => content.includes(word.toLowerCase()));
    
    if (foundBadWords.length > 0) {
        try {
            await message.delete();
            
            // Log the action
            await Logger.log(message.client, 'automod', {
                action: 'Bad Word Deleted',
                user: message.author,
                channel: message.channel,
                trigger: `Inappropriate language: ${foundBadWords.join(', ')}`
            });

            // Send warning message
            const warningMessage = await message.channel.send(
                `⚠️ ${message.author}, please watch your language.`
            );

            // Delete warning message after configured time
            setTimeout(() => {
                warningMessage.delete().catch(() => {});
            }, config.moderation.autoMod.warningMessageDeleteTime);

            // Auto-warn the user
            const moderationHandler = require('../handlers/moderationHandler.js');
            const fakeInteraction = {
                user: message.client.user,
                guild: message.guild,
                member: message.guild.members.cache.get(message.client.user.id),
                reply: () => {} // Dummy reply function
            };
            
            await moderationHandler.warnUser(fakeInteraction, message.author, `Auto-warn: Inappropriate language (${foundBadWords.join(', ')})`);

        } catch (error) {
            console.error('[ERROR] Failed to handle bad word:', error);
        }
    }
}
