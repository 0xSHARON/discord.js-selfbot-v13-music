const AsciiTable = require("ascii-table/ascii-table");
const YouTube = require("youtube-sr").default;
const { Ytdl } = require("@distube/ytdl-core");
const ytdl = new Ytdl();

module.exports = {

    /**
     * @description Sends logs to console and adds the date/time
     * @param content The content to log
     */
    isFloat: function(n) {
        return ((typeof n === 'number') && (n % 1 !== 0));
    },
    log: function(content) {
        const date_ob = new Date();
      
        let date = date_ob.getDate().toString();
        let month = (date_ob.getMonth() + 1).toString();
        const year = date_ob.getFullYear().toString();
      
        if (date.length === 1) { date = "0" + date; }
        if (month.length === 1) { month = "0" + month; }
        
        const dmy = date + "/" + month + "/" + year;
        const hms = date_ob.toLocaleTimeString();
      
        console.log(`[ ${dmy} | ${hms} ] ${content}`);
    },
    /**
     * @description Silent output logger that avoids sending any message to Discord
     * @param {String} content
     */
    sendSafe: function(content) {
        if (!content) return;
        const clean = content.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').replace(/[>*`]/g, '').trim();
        if (clean) {
            module.exports.log(`[Silent Output]: ${clean}`);
        }
    },
    /**
     * @description Checks if the provided string is an url 
     * @param {String} url 
     */
    isURL: function (url) {
        if (!url) return false;
        var pattern = new RegExp('^(https?:\\/\\/)?'+
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+
            '((\\d{1,3}\\.){3}\\d{1,3}))|' +
            'localhost' +
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+
            '(\\?[;&a-z\\d%_.~+=-]*)?'+
            '(\\#[-a-z\\d_]*)?$', 'i');
        return pattern.test(url);
    },
    /**
     * @description Create an ascii-table shown in the console on startup with the loaded events & commands
     * @param {Object} loaded 
     */
    showTable: function(loaded){
        var table = new AsciiTable('Loading content...');
        table.setHeading("Commands", "Events");
        for (let i = 0; i <= Math.max(loaded.commands.length, loaded.events.length) - 1; i++){
            table.addRow(loaded.commands[i], loaded.events[i]);
        }
        return table.render();
    },
    getUrl: async function (words){
        const stringOfWords = words.join(" ");
        try {
            const results = await YouTube.search(stringOfWords, { limit: 1 });
            if (results && results.length > 0) {
                return "https://www.youtube.com/watch?v=" + results[0].id;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    },
    getVoiceAdapterCreator: function(channel) {
        const rawCreator = channel.guild ? channel.guild.voiceAdapterCreator : channel.voiceAdapterCreator;
        if (!rawCreator) return null;
        return methods => {
            const wrappedMethods = {
                ...methods,
                onVoiceServerUpdate: payload => {
                    if (payload && !payload.guild_id) {
                        payload.guild_id = payload.channel_id || channel.id;
                    }
                    return methods.onVoiceServerUpdate(payload);
                },
                onVoiceStateUpdate: payload => {
                    if (payload && !payload.guild_id) {
                        payload.guild_id = payload.channel_id || channel.id;
                    }
                    return methods.onVoiceStateUpdate(payload);
                }
            };
            return rawCreator(wrappedMethods);
        };
    },
    play: function(song) {
        const utils = require("./utils");
        const serverQueue = queue.get("queue");

        if (!song) {
            if (serverQueue) {
                if (serverQueue.player) serverQueue.player.stop();
                serverQueue.songs = [];
                serverQueue.playing = false;
            }
            utils.updatePresence(null);

            if (serverQueue && (serverQueue.stay247 || global.config.stay247)) {
                utils.log("[24/7 Mode]: Songs ended. Bot remains connected in voice channel / DM call.");
                return;
            }

            utils.log("No songs left in queue. Starting idle countdown (60s)...");
            utils.scheduleIdleDisconnect(serverQueue);
            return;
        }

        if (serverQueue && serverQueue.idleTimeout) {
            clearTimeout(serverQueue.idleTimeout);
            serverQueue.idleTimeout = null;
        }

        if (!serverQueue || !serverQueue.connection) {
            utils.log("Cannot play audio: no active voice connection.");
            return;
        }

        utils.log(`Started playing the music : ${song.title}`);

        try {
            const { createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require("@discordjs/voice");
            const stream = ytdl.download(song.url, {
                filter: { hasAudio: true, hasVideo: false },
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            });

            stream.on('error', err => {
                utils.log(`[Audio Stream Error]: ${err.message}`);
            });

            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true
            });

            if (resource.volume) {
                resource.volume.setVolumeLogarithmic(serverQueue.volume / 5);
            }

            serverQueue.resource = resource;

            if (!serverQueue.player) {
                const player = createAudioPlayer();
                serverQueue.player = player;

                player.on(AudioPlayerStatus.Idle, () => {
                    if (serverQueue.songs[0]) utils.log(`Finished playing the music : ${serverQueue.songs[0].title}`);
                    else utils.log(`Finished playing all musics, no more musics in the queue`);
                    if (serverQueue.loop === false || serverQueue.skipped === true) serverQueue.songs.shift();
                    if (serverQueue.skipped === true) serverQueue.skipped = false;
                    utils.play(serverQueue.songs[0]);
                });

                player.on('error', error => {
                    utils.log(`[Audio Player Error]: ${error.message}`);
                    if (serverQueue.songs[0]) serverQueue.songs.shift();
                    utils.play(serverQueue.songs[0]);
                });

                player.on('stateChange', (oldState, newState) => {
                    utils.log(`[Audio Player State]: ${oldState.status} -> ${newState.status}`);
                });

                if (serverQueue.connection) {
                    serverQueue.connection.subscribe(player);
                }
            } else if (serverQueue.connection) {
                serverQueue.connection.subscribe(serverQueue.player);
            }

            serverQueue.playing = true;
            serverQueue.player.play(resource);
            utils.updatePresence(song);
        } catch (err) {
            utils.log(`Error playing audio: ${err.message}`);
            serverQueue.songs.shift();
            utils.play(serverQueue.songs[0]);
        }
    },
    scheduleIdleDisconnect: function(serverQueue) {
        if (!serverQueue || serverQueue.stay247 || global.config.stay247) return;
        if (serverQueue.idleTimeout) {
            clearTimeout(serverQueue.idleTimeout);
        }
        serverQueue.idleTimeout = setTimeout(() => {
            const currentQueue = global.queue?.get("queue");
            if (!currentQueue || currentQueue !== serverQueue) return;
            if (currentQueue.stay247 || global.config.stay247) return;
            if (currentQueue.songs && currentQueue.songs.length > 0) return;

            module.exports.log("[Idle Disconnect]: Queue empty for 60 seconds. Disconnecting from voice/call.");
            if (currentQueue.player) {
                try { currentQueue.player.stop(); } catch (e) {}
            }
            if (currentQueue.connection) {
                try { currentQueue.connection.destroy(); } catch (e) {}
            }
            global.queue.delete("queue");
            module.exports.updatePresence(null);
        }, 60000);
    },
    getOtherUsersCount: function(voiceChannel, client) {
        if (!voiceChannel || !client || !client.user) return 0;
        // Guild voice channel
        if (voiceChannel.members && typeof voiceChannel.members.filter === "function") {
            return voiceChannel.members.filter(m => m.id !== client.user.id && !m.user?.bot).size;
        }
        // DM or Group DM
        if (voiceChannel.voiceUsers && typeof voiceChannel.voiceUsers.filter === "function") {
            return voiceChannel.voiceUsers.filter(u => u.id !== client.user.id).size;
        }
        // Fallback: check client.voiceStates cache
        if (client.voiceStates && client.voiceStates.cache) {
            return client.voiceStates.cache.filter(vs => vs.channelId === voiceChannel.id && vs.id !== client.user.id).size;
        }
        return 0;
    },
    checkAutoLeave: function(client) {
        const serverQueue = global.queue?.get("queue");
        if (!serverQueue || !serverQueue.connection || serverQueue.connection.state?.status === "destroyed") {
            return;
        }

        // If 24/7 mode is active, bypass auto-leave
        if (serverQueue.stay247 || global.config.stay247) {
            if (serverQueue.aloneTimeout) {
                clearTimeout(serverQueue.aloneTimeout);
                serverQueue.aloneTimeout = null;
            }
            return;
        }

        const voiceChannel = serverQueue.voiceChannel;
        if (!voiceChannel) return;

        const othersCount = module.exports.getOtherUsersCount(voiceChannel, client);

        if (othersCount === 0) {
            if (!serverQueue.aloneTimeout) {
                const channelName = voiceChannel.name || voiceChannel.recipient?.tag || voiceChannel.id;
                module.exports.log(`[Auto-Leave]: Alone in voice channel/call '${channelName}'. Starting 60s disconnect timer...`);
                serverQueue.aloneTimeout = setTimeout(() => {
                    const currentQueue = global.queue?.get("queue");
                    if (!currentQueue || currentQueue !== serverQueue) return;
                    if (currentQueue.stay247 || global.config.stay247) return;

                    const stillOthers = module.exports.getOtherUsersCount(currentQueue.voiceChannel, client);
                    if (stillOthers === 0) {
                        module.exports.log(`[Auto-Leave]: Alone for 60 seconds. Disconnecting from voice/call to save bandwidth.`);
                        if (currentQueue.idleTimeout) {
                            clearTimeout(currentQueue.idleTimeout);
                            currentQueue.idleTimeout = null;
                        }
                        if (currentQueue.player) {
                            try { currentQueue.player.stop(); } catch (e) {}
                        }
                        if (currentQueue.connection) {
                            try { currentQueue.connection.destroy(); } catch (e) {}
                        }
                        global.queue.delete("queue");
                        module.exports.updatePresence(null);
                    }
                }, 60000);
            }
        } else {
            if (serverQueue.aloneTimeout) {
                module.exports.log(`[Auto-Leave]: User detected in voice channel/call. Cancelled auto-leave timer.`);
                clearTimeout(serverQueue.aloneTimeout);
                serverQueue.aloneTimeout = null;
            }
        }
    },
    updatePresence: function(song) {
        const client = global.client;
        if (!client || !client.user) return;
        try {
            const { RichPresence } = require("discord.js-selfbot-v13");
            if (!song) {
                client.user.setPresence({ activities: [] });
                return;
            }

            const now = Date.now();
            const rp = new RichPresence(client)
                .setType("LISTENING")
                .setName("YouTube Music")
                .setDetails((song.title || "Music").slice(0, 128))
                .setState((song.author ? `by ${song.author}` : `Requested by ${song.requestedby}`).slice(0, 128))
                .setStartTimestamp(now);

            if (song.duration && song.duration > 0) {
                rp.setEndTimestamp(now + (song.duration * 1000));
            }

            const ytId = song.id || (song.url && song.url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1]);
            if (ytId) {
                rp.setAssetsLargeImage(`youtube:${ytId}`);
                rp.setAssetsLargeText((song.title || "Music").slice(0, 128));
            }

            if (song.url) {
                rp.addButton("Listen on YouTube", song.url);
            }

            client.user.setActivity(rp);
            module.exports.log(`[Rich Presence] Listening to: ${song.title}`);
        } catch (e) {
            module.exports.log(`[Rich Presence Error]: ${e.message}`);
        }
    }
};
