module.exports = {
    // Bot Configuration
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,

    // Channel IDs
    channels: {
        // Ticket System
        ticketCategory: '1386436669850390808', // Category for ticket channels
        ticketLogs: '1386436841657471146',     // Channel for ticket logs
        ticketTranscripts: '1386436841657471146', // Channel for ticket transcripts

        // Suggestion System
        suggestions: '1386153679702200421',     // Channel where suggestions are posted
        suggestionLogs: '1386443994191626290',  // Channel for suggestion logs
        suggestionResults: '1386153981083914301', // Channel for approved/denied/considered suggestions

        // Moderation
        modLogs: '1386368174815051796',         // Channel for moderation logs
        autoModLogs: '1386368138568007751',     // Channel for auto-moderation logs

        // General Logs
        serverLogs: '1386367864772231348',      // Channel for general server logs
        joinLeave: '1386367781188014181',       // Channel for join/leave logs
    },

    // Role IDs
    roles: {
        staff: '1386148301992235028',           // Staff role
        moderator: '1386148300234821792',       // Moderator role
        admin: '1386148298431402044',           // Admin role
        muted: '1386438702795853824',           // Muted role
        autoRole: '1386148301073678489'         // Auto-assigned role
    },

    // Ticket System Configuration
    tickets: {
        maxTicketsPerUser: 3,
        supportRoles: ['1386148301992235028', '1386148300234821792', '1386148298431402044'], // Roles that can view tickets (staff, moderator, admin)
        closeDelay: 10000,                      // Delay before deleting closed ticket (10 seconds)
        transcriptLimit: 100,                   // Max messages to include in transcript
        ticketCategories: {
            general: {
                name: 'General Support',
                emoji: '🎫',
                description: 'General support and questions'
            },
            technical: {
                name: 'Technical Support',
                emoji: '🔧',
                description: 'Technical issues and bugs'
            },
            billing: {
                name: 'Billing Support',
                emoji: '💳',
                description: 'Billing and payment issues'
            },
            report: {
                name: 'Report User',
                emoji: '⚠️',
                description: 'Report a user or content'
            }
        }
    },

    // Suggestion System Configuration
    suggestions: {
        requireApproval: false,                 // Whether suggestions need approval before posting
        allowAnonymous: true,                   // Allow anonymous suggestions
        createThreads: true,                    // Create discussion threads for suggestions
        threadAutoArchive: 4320,                // Thread auto-archive duration in minutes (3 days)
        threadNameMaxLength: 80,                // Max length for thread names
        showUserThumbnail: true,                // Show user avatar as thumbnail (not for anonymous)
        showTimestamp: true,                    // Show timestamp in footer
        showUserIdInFooter: true,               // Show user ID in footer
        managementInLogs: true,                 // Show approve/deny buttons in logs channel instead of main channel
        votingEmojis: {
            upvote: '✅',
            downvote: '❌'
        }
    },

    // Moderation Configuration
    moderation: {
        autoMod: {
            enabled: true,
            antiSpam: true,
            antiInvite: true,
            antiCaps: true,
            badWords: true,
            // Spam detection settings
            spamTimeWindow: 5000,               // Time window for spam detection (5 seconds)
            spamMessageLimit: 5,                // Max messages in time window
            spamMuteDuration: 300000,           // Auto-mute duration for spam (5 minutes)
            // Caps detection settings
            capsPercentageThreshold: 0.7,      // Percentage of caps to trigger (70%)
            capsMinLength: 10,                  // Minimum message length to check caps
            // Warning message auto-delete time
            warningMessageDeleteTime: 5000,    // Delete warning messages after 5 seconds
            // Bad words list
            badWordsList: [
                'badword1', 'badword2', 'spam'  // Add your bad words here
            ]
        },
        punishments: {
            warnThreshold: 3,                   // Warnings before auto-mute
            muteThreshold: 5,                   // Warnings before auto-ban
            muteDuration: 3600000,              // Default mute duration (1 hour in ms)
        }
    },

    // Colors for embeds
    colors: {
        primary: '#5865F2',
        success: '#57F287',
        warning: '#FEE75C',
        error: '#ED4245',
        info: '#5865F2'
    },

    // Bot Settings
    settings: {
        prefix: '!',                            // Command prefix (for text commands if needed)
        deleteCommandMessages: true,           // Delete command messages after execution
        logLevel: 'info',                       // Logging level
        // Command cooldowns (in seconds)
        defaultCooldown: 3,                     // Default command cooldown
        // Pagination settings
        maxListItems: 10,                       // Max items to show in lists
        maxEmbedFieldLength: 1024,              // Max length for embed fields
        // Auto-delete settings
        tempMessageDeleteTime: 5000,            // Delete temporary messages after 5 seconds
    },
};
