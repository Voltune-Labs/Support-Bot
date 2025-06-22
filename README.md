# Discord Support Bot

A comprehensive Discord bot for support servers with tickets, suggestions, moderation, and logging systems.

## Features

### 🎫 Ticket System
- Create tickets with categories (General, Technical, Billing, Report)
- Interactive ticket panels with select menus
- Ticket claiming and management
- Automatic transcript generation
- Permission-based access control
- Ticket limits per user

### 💡 Suggestion System
- Create suggestions with voting system
- **Automatic discussion threads** for community feedback
- Anonymous suggestions support
- **Staff management controls in logs channel** (keeps main channel clean)
- Suggestion status tracking
- Comprehensive suggestion management

### 🔨 Moderation System
- Warn, mute, kick, and ban commands
- Temporary punishments with auto-removal
- Auto-moderation for spam, invites, caps, and bad words
- Moderation case tracking
- Warning system with auto-punishments

### 📊 Logging System
- Comprehensive logging for all bot activities
- Message edit/delete logging
- Join/leave logging
- Moderation action logging
- Auto-moderation logging
- Configurable log channels

## Setup Instructions

### 1. Prerequisites
- Node.js 16.9.0 or higher
- A Discord application and bot token
- A Discord server with appropriate permissions

### 2. Installation
```bash
# Clone or download the project
cd support-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configuration

#### Environment Variables
Edit the `.env` file with your bot's credentials:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_server_id_here
```

#### Bot Configuration
**🎉 Everything is now controlled by `config.js` - no more hardcoded values!**

Edit `config.js` to set up your server-specific settings:

1. **Channel IDs**: Replace all channel IDs with your actual channel IDs
2. **Role IDs**: Replace all role IDs with your actual role IDs
3. **Ticket Categories**: Customize ticket categories as needed
4. **Auto-Moderation**: Configure spam detection, caps limits, bad words, and thresholds
5. **Punishment Settings**: Set warning thresholds and mute durations
6. **Timing Settings**: Control delays, cooldowns, and auto-delete times
7. **Display Settings**: Customize colors, list limits, and embed lengths

📖 **See `CONFIG_GUIDE.md` for detailed configuration documentation**

### 4. Setting Up Channels and Roles

#### Required Channels
Create these channels in your Discord server and update their IDs in `config.js`:

- **Ticket Category**: Category for ticket channels
- **Ticket Logs**: Channel for ticket activity logs
- **Ticket Transcripts**: Channel for ticket transcripts
- **Suggestions**: Channel where suggestions are posted
- **Suggestion Logs**: Channel for suggestion management logs
- **Mod Logs**: Channel for moderation action logs
- **Auto-Mod Logs**: Channel for auto-moderation logs
- **Server Logs**: Channel for general server logs
- **Join/Leave**: Channel for member join/leave logs

#### Required Roles
Create these roles in your Discord server and update their IDs in `config.js`:

- **Staff**: Basic staff role
- **Moderator**: Moderation permissions
- **Admin**: Administrative permissions
- **Muted**: Role for muted users (remove send message permissions)

### 5. Bot Permissions
Your bot needs these permissions:
- Manage Channels
- Manage Roles
- Manage Messages
- Ban Members
- Kick Members
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands
- View Audit Log

### 6. Deployment

#### Deploy Commands
```bash
# Deploy slash commands to your server
node deploy-commands.js
```

#### Start the Bot
```bash
# Start the bot
npm start

# Or for development
npm run dev
```

## Commands

### Ticket Commands (`/ticket`)
- `/ticket create [category]` - Create a new ticket
- `/ticket panel` - Create a ticket panel (Staff only)
- `/ticket close` - Close the current ticket
- `/ticket add <user>` - Add user to ticket (Staff only)
- `/ticket remove <user>` - Remove user from ticket (Staff only)

### Suggestion Commands (`/suggest`)
- `/suggest create <title> <description> [anonymous]` - Create a suggestion
- `/suggest modal` - Create suggestion using modal form
- `/suggest list [status]` - List suggestions (Staff only)
- `/suggest info <id>` - Get suggestion information
- `/suggest thread <action> <id>` - Manage discussion threads (Staff only)

### Moderation Commands (`/mod`)
- `/mod warn <user> [reason]` - Warn a user
- `/mod mute <user> [duration] [reason]` - Mute a user
- `/mod unmute <user> [reason]` - Unmute a user
- `/mod kick <user> [reason]` - Kick a user
- `/mod ban <user> [duration] [reason]` - Ban a user
- `/mod unban <userid> [reason]` - Unban a user
- `/mod warnings <user>` - View user warnings
- `/mod case <id>` - View moderation case

### Logging Commands (`/logs`)
- `/logs status` - Check logging system status (Admin only)
- `/logs channels` - List configured log channels (Admin only)
- `/logs test` - Test all log channels (Admin only)

## File Structure

```
support-bot/
├── commands/           # Slash commands
│   ├── ticket.js      # Ticket system commands
│   ├── suggest.js     # Suggestion system commands
│   ├── moderation.js  # Moderation commands
│   └── logs.js        # Logging commands
├── events/            # Discord.js event handlers
│   ├── ready.js       # Bot ready event
│   ├── interactionCreate.js  # Interaction handling
│   ├── guildMemberAdd.js     # Member join logging
│   ├── guildMemberRemove.js  # Member leave logging
│   ├── messageCreate.js      # Auto-moderation
│   ├── messageDelete.js      # Message delete logging
│   ├── messageUpdate.js      # Message edit logging
│   ├── guildBanAdd.js        # Ban logging
│   └── guildBanRemove.js     # Unban logging
├── handlers/          # System handlers
│   ├── ticketHandler.js      # Ticket system logic
│   ├── suggestionHandler.js  # Suggestion system logic
│   ├── moderationHandler.js  # Moderation system logic
│   ├── buttonHandler.js      # Button interaction handling
│   ├── selectHandler.js      # Select menu handling
│   └── modalHandler.js       # Modal form handling
├── utils/             # Utility functions
│   ├── logger.js      # Logging utility
│   └── permissions.js # Permission checking
├── data/              # Data storage (JSON files)
│   ├── tickets.json   # Ticket data
│   ├── suggestions.json # Suggestion data
│   └── moderation.json # Moderation data
├── config.js          # Bot configuration
├── index.js           # Main bot file
├── deploy-commands.js # Command deployment script
├── package.json       # Dependencies
├── .env.example       # Environment template
└── README.md          # This file
```

## Customization

### All Customization is in config.js!

**Everything is now configurable in `config.js`:**

- **Bad Words**: Edit `moderation.autoMod.badWordsList` array
- **Auto-Moderation**: All thresholds and settings in `moderation.autoMod`
- **Embed Colors**: Update the `colors` section
- **Ticket Categories**: Add/modify in `tickets.ticketCategories`
- **Timing**: All delays and cooldowns configurable
- **Limits**: Message limits, list sizes, embed lengths
- **Punishment Thresholds**: Warning counts, mute durations

📖 **See `CONFIG_GUIDE.md` for complete configuration documentation**

## Troubleshooting

### Common Issues

1. **Commands not appearing**: Run `node deploy-commands.js` to deploy commands
2. **Permission errors**: Ensure the bot has all required permissions
3. **Channel not found errors**: Verify all channel IDs in `config.js` are correct
4. **Role not found errors**: Verify all role IDs in `config.js` are correct

### Support

If you encounter issues:
1. Check the console for error messages
2. Verify your configuration in `config.js`
3. Ensure all required channels and roles exist
4. Check bot permissions in your Discord server

## License

This project is licensed under the ISC License.
