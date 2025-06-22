const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`[INFO] Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`[INFO] Serving ${client.guilds.cache.size} guild(s) with ${client.users.cache.size} users`);
        
        // Set bot activity
        client.user.setActivity('Support Tickets', { type: ActivityType.Watching });
        
        // Log important information
        console.log(`[INFO] Bot ID: ${client.user.id}`);
        console.log(`[INFO] Invite URL: https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`);
    },
};
