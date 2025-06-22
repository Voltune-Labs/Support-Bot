# Quick Setup Guide

## Step 1: Create Discord Application
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name your application (e.g., "Support Bot")
4. Go to the "Bot" section
5. Click "Add Bot"
6. Copy the bot token
7. Enable all "Privileged Gateway Intents"

## Step 2: Get IDs
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click your server → Copy ID (this is your GUILD_ID)
3. Right-click your bot application → Copy ID (this is your CLIENT_ID)

## Step 3: Create Channels
Create these channels in your Discord server:

### Categories
- `📋 Support Tickets` (for ticket channels)

### Text Channels
- `#suggestions` (where suggestions are posted)
- `#ticket-logs` (ticket activity logs)
- `#ticket-transcripts` (ticket transcripts)
- `#suggestion-logs` (suggestion management logs)
- `#mod-logs` (moderation action logs)
- `#automod-logs` (auto-moderation logs)
- `#server-logs` (general server logs)
- `#join-leave` (member join/leave logs)

## Step 4: Create Roles
Create these roles in your Discord server:

- `@Staff` (basic staff permissions)
- `@Moderator` (moderation permissions)
- `@Admin` (administrative permissions)
- `@Muted` (remove send message permissions in all channels)

## Step 5: Configure the Bot

1. Copy `.env.example` to `.env`
2. Fill in your bot token, client ID, and guild ID in `.env`
3. Edit `config.js` and replace all the placeholder IDs with your actual channel and role IDs

### Finding Channel/Role IDs
- Right-click any channel/role → Copy ID
- Update the corresponding ID in `config.js`

## Step 6: Install and Run

```bash
# Install dependencies
npm install

# Deploy commands
node deploy-commands.js

# Start the bot
npm start
```

## Step 7: Invite Bot to Server

Use this URL (replace CLIENT_ID with your bot's client ID):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

## Step 8: Test the Bot

1. Run `/ticket panel` to create a ticket panel
2. Run `/suggest create` to test suggestions
3. Run `/logs test` to test logging channels
4. Try creating a ticket and suggestion to verify everything works

## Quick Configuration Checklist

- [ ] Bot token added to `.env`
- [ ] Client ID added to `.env`
- [ ] Guild ID added to `.env`
- [ ] All channel IDs updated in `config.js`
- [ ] All role IDs updated in `config.js`
- [ ] Commands deployed with `node deploy-commands.js`
- [ ] Bot invited to server with proper permissions
- [ ] Muted role permissions configured (remove send messages)
- [ ] Bot tested with `/logs test` command

## Common Issues

**Commands not showing up?**
- Run `node deploy-commands.js`
- Wait a few minutes for Discord to update

**Permission errors?**
- Make sure bot has Administrator permission
- Check that muted role is configured properly

**Channel/Role not found errors?**
- Verify all IDs in `config.js` are correct
- Make sure you copied the IDs correctly (they should be long numbers)

Your bot should now be fully functional! 🎉
