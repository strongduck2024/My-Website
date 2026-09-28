const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend assets from the public folder
app.use(express.static('public'));

// Initialize Discord Bot with Direct Message privileges
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.DirectMessages, 
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel] // Required to capture incoming DMs
});

io.on('connection', (socket) => {
    console.log('Website interface connected via WebSockets.');

    // Listen for messages you type on your web dashboard
    socket.on('send_website_message', async (data) => {
        const { targetUserId, messageText } = data;
        
        try {
            // Fetch the user on Discord and dispatch the DM
            const user = await client.users.fetch(targetUserId);
            await user.send(messageText);
            console.log(`Successfully sent Discord DM to ${targetUserId}`);
        } catch (error) {
            console.error('Failed to dispatch Discord DM:', error);
            socket.emit('error_status', 'Failed to send message. User might have DMs locked.');
        }
    });
});

// Listen for incoming DMs from human Discord users
client.on('messageCreate', async (message) => {
    // Drop messages if they are from a bot or from a public guild channel
    if (message.author.bot || message.guild !== null) return;

    console.log(`Forwarding live DM from ${message.author.username}`);

    // Stream the message live to the browser interface
    io.emit('incoming_discord_dm', {
        username: message.author.username,
        userId: message.author.id,
        text: message.content
    });
});

// Use Render's automated environmental port mapping
const PORT = process.env.PORT || 3000;

// Pulls token securely from Render Environment Variables
client.login(process.env.DISCORD_TOKEN);

server.listen(PORT, () => console.log(`Live proxy server tracking on port ${PORT}`));
