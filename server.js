const express = require('express');
const path = require('path');
const utils = require('./utils');
const { Ytdl } = require("@distube/ytdl-core");
const ytdl = new Ytdl();

const server = express();

server.use(express.json());
server.use(express.static(path.join(__dirname, 'public')));

// Status API
server.get('/api/status', (req, res) => {
    const client = global.client;
    const serverQueue = global.queue?.get("queue");

    const isOnline = !!(client && client.user);
    const user = isOnline ? {
        tag: client.user.tag,
        id: client.user.id,
        avatar: client.user.displayAvatarURL ? client.user.displayAvatarURL({ dynamic: true }) : null
    } : null;

    let voiceInfo = {
        connected: false,
        channelName: null,
        channelType: null,
        channelId: null
    };

    if (serverQueue && serverQueue.voiceChannel) {
        const vc = serverQueue.voiceChannel;
        const channelName = vc.name || vc.recipient?.tag || (vc.recipients ? `Group (${vc.recipients.size})` : vc.id);
        const channelType = vc.type || (vc.guild ? 'GUILD_VOICE' : 'DM');
        const isConnActive = serverQueue.connection && serverQueue.connection.state?.status !== 'destroyed';
        voiceInfo = {
            connected: isConnActive,
            channelName: channelName,
            channelType: channelType,
            channelId: vc.id
        };
    }

    let playbackInfo = {
        playing: false,
        paused: false,
        volume: serverQueue ? serverQueue.volume : 4,
        loop: serverQueue ? !!serverQueue.loop : false,
        stay247: serverQueue ? !!serverQueue.stay247 : !!(global.config && global.config.stay247),
        elapsedSeconds: 0,
        duration: 0,
        currentSong: null
    };

    if (serverQueue && serverQueue.songs && serverQueue.songs.length > 0) {
        const song = serverQueue.songs[0];
        let elapsed = 0;
        if (serverQueue.startedAt) {
            const pausedOffset = serverQueue.totalPausedMs || 0;
            const currentPause = serverQueue.pausedAt ? (Date.now() - serverQueue.pausedAt) : 0;
            elapsed = Math.max(0, Math.floor((Date.now() - serverQueue.startedAt - pausedOffset - currentPause) / 1000));
        }

        playbackInfo = {
            playing: !!serverQueue.playing,
            paused: !!serverQueue.pausedAt,
            volume: serverQueue.volume,
            loop: !!serverQueue.loop,
            stay247: !!serverQueue.stay247,
            elapsedSeconds: Math.min(elapsed, song.duration || elapsed),
            duration: song.duration || 0,
            currentSong: song
        };
    }

    const queueList = (serverQueue && serverQueue.songs) ? serverQueue.songs.slice(1) : [];

    res.json({
        online: isOnline,
        user: user,
        voice: voiceInfo,
        playback: playbackInfo,
        queue: queueList,
        logs: (utils.recentLogs || []).slice(-40)
    });
});

// Control actions API
server.post('/api/action', async (req, res) => {
    const { action } = req.body || {};
    const serverQueue = global.queue?.get("queue");

    if (!action) {
        return res.status(400).json({ success: false, message: "Action required" });
    }

    if (action === "toggle_247") {
        if (serverQueue) {
            serverQueue.stay247 = !serverQueue.stay247;
            global.config.stay247 = serverQueue.stay247;
            if (serverQueue.stay247) {
                if (serverQueue.idleTimeout) { clearTimeout(serverQueue.idleTimeout); serverQueue.idleTimeout = null; }
                if (serverQueue.aloneTimeout) { clearTimeout(serverQueue.aloneTimeout); serverQueue.aloneTimeout = null; }
            }
            utils.log(`[Dashboard] 24/7 Mode toggled: ${serverQueue.stay247 ? 'ENABLED' : 'DISABLED'}`);
            return res.json({ success: true, stay247: serverQueue.stay247 });
        } else {
            global.config.stay247 = !global.config.stay247;
            utils.log(`[Dashboard] Global 24/7 Mode toggled: ${global.config.stay247 ? 'ENABLED' : 'DISABLED'}`);
            return res.json({ success: true, stay247: global.config.stay247 });
        }
    }

    if (!serverQueue) {
        return res.status(400).json({ success: false, message: "No active music queue found." });
    }

    switch (action) {
        case "play_pause": {
            if (serverQueue.pausedAt) {
                if (serverQueue.player) serverQueue.player.unpause();
                serverQueue.playing = true;
                serverQueue.totalPausedMs = (serverQueue.totalPausedMs || 0) + (Date.now() - serverQueue.pausedAt);
                serverQueue.pausedAt = null;
                utils.log("[Dashboard] Playback resumed.");
                return res.json({ success: true, playing: true, paused: false });
            } else if (serverQueue.playing) {
                if (serverQueue.player) serverQueue.player.pause();
                serverQueue.playing = false;
                serverQueue.pausedAt = Date.now();
                utils.log("[Dashboard] Playback paused.");
                return res.json({ success: true, playing: false, paused: true });
            }
            return res.json({ success: true, playing: serverQueue.playing });
        }
        case "skip": {
            if (!serverQueue.songs[0]) {
                return res.status(400).json({ success: false, message: "No song playing to skip." });
            }
            utils.log(`[Dashboard] Skipped: ${serverQueue.songs[0].title}`);
            serverQueue.skipped = true;
            if (serverQueue.player) serverQueue.player.stop();
            return res.json({ success: true, message: "Skipped song." });
        }
        case "stop": {
            serverQueue.songs = [];
            if (serverQueue.idleTimeout) { clearTimeout(serverQueue.idleTimeout); serverQueue.idleTimeout = null; }
            if (serverQueue.aloneTimeout) { clearTimeout(serverQueue.aloneTimeout); serverQueue.aloneTimeout = null; }
            if (serverQueue.player) {
                try { serverQueue.player.stop(); } catch (e) {}
            }
            if (serverQueue.connection) {
                try { serverQueue.connection.destroy(); } catch (e) {}
            }
            global.queue.delete("queue");
            utils.updatePresence(null);
            utils.log("[Dashboard] Playback stopped & disconnected.");
            return res.json({ success: true, message: "Stopped playback." });
        }
        case "toggle_loop": {
            serverQueue.loop = !serverQueue.loop;
            utils.log(`[Dashboard] Loop mode toggled: ${serverQueue.loop ? 'ON' : 'OFF'}`);
            return res.json({ success: true, loop: serverQueue.loop });
        }
        default:
            return res.status(400).json({ success: false, message: "Unknown action" });
    }
});

// Set Volume API
server.post('/api/volume', (req, res) => {
    const serverQueue = global.queue?.get("queue");
    if (!serverQueue) {
        return res.status(400).json({ success: false, message: "No active queue to adjust volume." });
    }

    const val = parseInt(req.body.volume, 10);
    if (isNaN(val) || val < 1 || val > 10) {
        return res.status(400).json({ success: false, message: "Volume must be between 1 and 10." });
    }

    serverQueue.volume = val;
    if (serverQueue.resource && serverQueue.resource.volume) {
        serverQueue.resource.volume.setVolumeLogarithmic(val / 5);
    }
    utils.log(`[Dashboard] Volume set to: ${val}/10`);
    res.json({ success: true, volume: val });
});

// Remove from Queue API
server.post('/api/remove', (req, res) => {
    const serverQueue = global.queue?.get("queue");
    if (!serverQueue || !serverQueue.songs || serverQueue.songs.length <= 1) {
        return res.status(400).json({ success: false, message: "No queued songs to remove." });
    }

    const index = parseInt(req.body.index, 10);
    if (isNaN(index) || index < 0 || index >= serverQueue.songs.length - 1) {
        return res.status(400).json({ success: false, message: "Invalid song index." });
    }

    const removed = serverQueue.songs.splice(index + 1, 1);
    utils.log(`[Dashboard] Removed from queue: ${removed[0]?.title}`);
    res.json({ success: true, removed: removed[0] });
});

// Add Song via Search / URL API
server.post('/api/play', async (req, res) => {
    const query = req.body?.query?.trim();
    if (!query) {
        return res.status(400).json({ success: false, message: "Song title or URL is required." });
    }

    const serverQueue = global.queue?.get("queue");
    if (!serverQueue || !serverQueue.voiceChannel) {
        return res.status(400).json({
            success: false,
            message: "Bot is not in a voice channel or DM call yet! Use >join or >call in Discord first."
        });
    }

    try {
        let FUrl = query;
        if (!utils.isURL(query)) {
            FUrl = await utils.getUrl([query]);
        }
        if (!FUrl) {
            return res.status(404).json({ success: false, message: "No results found for that search query." });
        }

        const songInfo = await ytdl.getInfo(FUrl);
        const thumbnails = (songInfo.videoDetails && songInfo.videoDetails.thumbnails) || [];
        const thumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : null;
        const author = (songInfo.videoDetails && songInfo.videoDetails.author && songInfo.videoDetails.author.name) || "";

        const song = {
            id: songInfo.videoDetails.id,
            title: songInfo.videoDetails.title,
            author: author,
            duration: parseInt(songInfo.videoDetails.lengthSeconds, 10),
            url: FUrl,
            thumbnail: thumbnail,
            requestedby: "Web Dashboard"
        };

        if (serverQueue.idleTimeout) {
            clearTimeout(serverQueue.idleTimeout);
            serverQueue.idleTimeout = null;
        }

        serverQueue.songs.push(song);
        utils.log(`[Dashboard] Added track to queue: ${song.title}`);

        if (!serverQueue.playing || serverQueue.songs.length === 1) {
            serverQueue.playing = true;
            utils.play(serverQueue.songs[0]);
        }

        return res.json({ success: true, song: song, isPlayingNow: serverQueue.songs.length === 1 });
    } catch (err) {
        utils.log(`[Dashboard] Error adding track: ${err.message}`);
        return res.status(500).json({ success: false, message: `Could not load track: ${err.message}` });
    }
});

// Single Page Application Fallback
server.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function keepAlive() {
    const port = process.env.PORT || 3000;
    const listener = server.listen(port, () => {
        utils.log(`[Web Dashboard]: Running at http://localhost:${port}`);
    });

    listener.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            utils.log(`[Web Dashboard]: Port ${port} is occupied; trying port ${Number(port) + 1}...`);
            const fallbackPort = Number(port) + 1;
            server.listen(fallbackPort, () => {
                utils.log(`[Web Dashboard]: Running at http://localhost:${fallbackPort}`);
            });
        } else {
            utils.log(`[Web Dashboard Error]: ${err.message}`);
        }
    });
}

module.exports = keepAlive;
