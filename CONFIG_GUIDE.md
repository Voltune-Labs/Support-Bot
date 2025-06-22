# Configuration Guide

This guide explains all the configuration options available in `config.js`. The configuration file now controls **everything** in the bot - no more hardcoded values scattered throughout the code!

## 🔧 Bot Configuration

```javascript
// Bot Configuration
token: process.env.DISCORD_TOKEN,    // Bot token from .env
clientId: process.env.CLIENT_ID,     // Bot client ID from .env
guildId: process.env.GUILD_ID,       // Server ID from .env
```

## 📋 Channel Configuration

All channel IDs must be replaced with your actual Discord channel IDs:

```javascript
channels: {
    // Ticket System
    ticketCategory: '1234567890123456789',     // Category for ticket channels
    ticketLogs: '1234567890123456789',         // Channel for ticket logs
    ticketTranscripts: '1234567890123456789',  // Channel for ticket transcripts
    
    // Suggestion System
    suggestions: '1234567890123456789',        // Channel where suggestions are posted
    suggestionLogs: '1234567890123456789',     // Channel for suggestion logs
    
    // Moderation
    modLogs: '1234567890123456789',            // Channel for moderation logs
    autoModLogs: '1234567890123456789',        // Channel for auto-moderation logs
    
    // General Logs
    serverLogs: '1234567890123456789',         // Channel for general server logs
    joinLeave: '1234567890123456789',          // Channel for join/leave logs
}
```

## 👥 Role Configuration

All role IDs must be replaced with your actual Discord role IDs:

```javascript
roles: {
    staff: '1234567890123456789',       // Staff role
    moderator: '1234567890123456789',   // Moderator role
    admin: '1234567890123456789',       // Admin role
    muted: '1234567890123456789',       // Muted role
}
```

## 🎫 Ticket System Configuration

```javascript
tickets: {
    maxTicketsPerUser: 3,               // Max active tickets per user
    supportRoles: ['ID1', 'ID2'],       // Roles that can view/manage tickets
    closeDelay: 10000,                  // Delay before deleting closed ticket (ms)
    transcriptLimit: 100,               // Max messages in transcript
    ticketCategories: {
        general: {
            name: 'General Support',
            emoji: '🎫',
            description: 'General support and questions'
        },
        // Add more categories as needed
    }
}
```

### Ticket Categories
You can add, remove, or modify ticket categories. Each category needs:
- `name`: Display name
- `emoji`: Emoji for buttons/menus
- `description`: Brief description

## 💡 Suggestion System Configuration

```javascript
suggestions: {
    requireApproval: false,             // Whether suggestions need approval before posting
    allowAnonymous: true,               // Allow anonymous suggestions
    createThreads: true,                // Create discussion threads for each suggestion
    threadAutoArchive: 4320,            // Thread auto-archive duration in minutes (3 days)
    threadNameMaxLength: 80,            // Max length for thread names
    showUserThumbnail: true,            // Show user avatar as thumbnail (not for anonymous)
    showTimestamp: true,                // Show timestamp in footer
    showUserIdInFooter: true,           // Show user ID in footer
    managementInLogs: true,             // Show approve/deny buttons in logs channel instead of main channel
    votingEmojis: {
        upvote: '👍',                   // Upvote emoji
        downvote: '👎'                  // Downvote emoji
    }
}
```

### Discussion Threads
When `createThreads` is enabled:
- Each suggestion automatically gets a discussion thread
- Community members can discuss the suggestion in the thread
- The suggestion author is automatically added to the thread (unless anonymous)
- Threads auto-archive after the configured duration
- Thread names are truncated to the configured max length

### Display Customization
- `showUserThumbnail`: Show user avatar as thumbnail (disabled for anonymous suggestions)
- `showTimestamp`: Include timestamp in the embed
- `showUserIdInFooter`: Show user ID and tag in footer for moderation purposes
- `managementInLogs`: When `true`, approve/deny buttons appear in the logs channel instead of the main suggestion channel (keeps main channel clean)

## 🔨 Moderation Configuration

### Auto-Moderation Settings
```javascript
moderation: {
    autoMod: {
        enabled: true,                  // Enable/disable auto-moderation
        antiSpam: true,                 // Enable spam detection
        antiInvite: true,               // Enable invite link detection
        antiCaps: true,                 // Enable excessive caps detection
        badWords: true,                 // Enable bad word filtering
        
        // Spam Detection
        spamTimeWindow: 5000,           // Time window for spam detection (5 seconds)
        spamMessageLimit: 5,            // Max messages in time window
        spamMuteDuration: 300000,       // Auto-mute duration for spam (5 minutes)
        
        // Caps Detection
        capsPercentageThreshold: 0.7,   // Percentage of caps to trigger (70%)
        capsMinLength: 10,              // Minimum message length to check caps
        
        // General Settings
        warningMessageDeleteTime: 5000, // Delete warning messages after 5 seconds
        
        // Bad Words List
        badWordsList: [
            'badword1', 'badword2', 'spam'  // Add your bad words here
        ]
    },
    
    // Punishment Thresholds
    punishments: {
        warnThreshold: 3,               // Warnings before auto-mute
        muteThreshold: 5,               // Warnings before auto-ban
        muteDuration: 3600000,          // Default mute duration (1 hour)
    }
}
```

### Customizing Auto-Moderation

**Spam Detection:**
- `spamTimeWindow`: How long to track messages (milliseconds)
- `spamMessageLimit`: Max messages in the time window
- `spamMuteDuration`: How long to mute spammers

**Caps Detection:**
- `capsPercentageThreshold`: 0.7 = 70% caps triggers action
- `capsMinLength`: Only check messages longer than this

**Bad Words:**
- Add words to `badWordsList` array
- Words are checked case-insensitively
- Triggers automatic warning

## 🎨 Embed Colors

```javascript
colors: {
    primary: '#5865F2',     // Discord blue
    success: '#57F287',     // Green
    warning: '#FEE75C',     // Yellow
    error: '#ED4245',       // Red
    info: '#5865F2'         // Blue
}
```

## ⚙️ Bot Settings

```javascript
settings: {
    prefix: '!',                        // Command prefix (for future text commands)
    deleteCommandMessages: true,       // Delete command messages after execution
    logLevel: 'info',                   // Logging level
    defaultCooldown: 3,                 // Default command cooldown (seconds)
    maxListItems: 10,                   // Max items to show in lists
    maxEmbedFieldLength: 1024,          // Max length for embed fields
    tempMessageDeleteTime: 5000,        // Delete temporary messages after 5 seconds
}
```

## 🔍 Finding Discord IDs

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode ✅

2. Get Channel IDs:
   - Right-click any channel → Copy ID

3. Get Role IDs:
   - Right-click any role → Copy ID

4. Get Server ID:
   - Right-click your server name → Copy ID

## 📝 Configuration Checklist

- [ ] Replace all channel IDs with your actual channel IDs
- [ ] Replace all role IDs with your actual role IDs
- [ ] Configure ticket categories for your server
- [ ] Set appropriate auto-moderation thresholds
- [ ] Add your bad words to the bad words list
- [ ] Adjust punishment thresholds as needed
- [ ] Customize embed colors if desired
- [ ] Set appropriate cooldowns and limits

## 🚨 Important Notes

1. **All IDs must be strings** (wrapped in quotes)
2. **Channel IDs are 17-19 digits long**
3. **Role IDs are 17-19 digits long**
4. **Times are in milliseconds** (1000ms = 1 second)
5. **Percentages are decimals** (0.7 = 70%)

## 🔄 Applying Changes

After modifying `config.js`:
1. Save the file
2. Restart the bot (`npm start`)
3. Test with `/logs test` to verify channels work

## 🛠️ Advanced Customization

### Adding New Ticket Categories
```javascript
ticketCategories: {
    // Existing categories...
    custom: {
        name: 'Custom Support',
        emoji: '🔧',
        description: 'Custom category description'
    }
}
```

### Adjusting Auto-Mod Sensitivity
- **Less strict**: Increase thresholds (0.8 for caps, 7 for spam limit)
- **More strict**: Decrease thresholds (0.5 for caps, 3 for spam limit)

### Custom Punishment Progression
```javascript
punishments: {
    warnThreshold: 2,       // Mute after 2 warnings
    muteThreshold: 4,       // Ban after 4 warnings
    muteDuration: 1800000,  // 30-minute mutes
}
```

Your bot is now **100% configurable** through the `config.js` file! 🎉
