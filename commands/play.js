const { joinVoiceChannel } = require("@discordjs/voice");
const { Ytdl } = require("@distube/ytdl-core");
const ytdl = new Ytdl();
const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    if (!args[0]) return sendSafe(strings.noArgsSongSearch);

    let voiceChannel = null;
    const serverQueue = queue.get("queue");

    if (message.channel.type === "DM" || message.channel.type === "GROUP_DM") {
        voiceChannel = message.channel;
        if (typeof voiceChannel.ring === "function") {
            voiceChannel.ring().catch(() => {});
        }
    } else if (message.member && message.member.voice && message.member.voice.channel) {
        voiceChannel = message.member.voice.channel;
    } else if (serverQueue && serverQueue.voiceChannel) {
        voiceChannel = serverQueue.voiceChannel;
    }

    if (!voiceChannel) return sendSafe(strings.notInVocal);

    utils.log("Looking for music details...");

    let FUrl;
    if (utils.isURL(args[0])) {
        FUrl = args[0];
    } else {
        FUrl = await utils.getUrl(args);
    }

    if (!FUrl) return sendSafe(strings.badUrl);

    let songInfo;
    try {
        songInfo = await ytdl.getInfo(FUrl);
    } catch (err) {
        utils.log(`Error fetching song info: ${err.message}`);
        return sendSafe(strings.badUrl);
    }

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
        requestedby: message.author.tag
    };

    utils.log(`Got music details for: ${song.title}`);

    if (!serverQueue) {
        try {
            const channelName = voiceChannel.name || voiceChannel.recipient?.tag || voiceChannel.id;
            utils.log(`Connecting to voice/call: ${channelName}...`);
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild ? voiceChannel.guild.id : voiceChannel.id,
                adapterCreator: utils.getVoiceAdapterCreator(voiceChannel),
                selfDeaf: false,
                selfMute: false
            });

            connection.on('stateChange', (oldState, newState) => {
                utils.log(`[Voice Connection State]: ${oldState.status} -> ${newState.status}`);
            });
            connection.on('error', err => {
                utils.log(`[Voice Connection Error]: ${err.message}`);
            });

            const queueConstruct = {
                textchannel: message.channel,
                voiceChannel: voiceChannel,
                connection: connection,
                player: null,
                resource: null,
                songs: [song],
                volume: 4,
                playing: true,
                loop: false,
                skipped: false,
                stay247: !!(global.config && global.config.stay247),
                idleTimeout: null,
                aloneTimeout: null
            };

            queue.set("queue", queueConstruct);
            utils.checkAutoLeave(client);
            sendSafe(strings.startedPlaying.replace("SONG_TITLE", song.title).replace("url", song.url));
            utils.play(queueConstruct.songs[0]);
        } catch (err) {
            queue.delete("queue");
            utils.log(`Error joining voice/call: ${err.message}`);
            return sendSafe(`> \`❌\` **Could not join voice/call:** ${err.message}`);
        }
    } else {
        if (!serverQueue.connection || serverQueue.connection.state?.status === "destroyed") {
            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: voiceChannel.guild ? voiceChannel.guild.id : voiceChannel.id,
                    adapterCreator: utils.getVoiceAdapterCreator(voiceChannel),
                    selfDeaf: false,
                    selfMute: false
                });
                connection.on('stateChange', (oldState, newState) => {
                    utils.log(`[Voice Connection State]: ${oldState.status} -> ${newState.status}`);
                });
                connection.on('error', err => {
                    utils.log(`[Voice Connection Error]: ${err.message}`);
                });
                serverQueue.connection = connection;
                serverQueue.voiceChannel = voiceChannel;
                if (serverQueue.player) {
                    connection.subscribe(serverQueue.player);
                }
            } catch (err) {
                utils.log(`Error reconnecting to voice/call: ${err.message}`);
            }
        }

        if (serverQueue.idleTimeout) {
            clearTimeout(serverQueue.idleTimeout);
            serverQueue.idleTimeout = null;
        }

        serverQueue.songs.push(song);
        utils.checkAutoLeave(client);

        if (!serverQueue.playing || serverQueue.songs.length === 1) {
            serverQueue.playing = true;
            sendSafe(strings.startedPlaying.replace("SONG_TITLE", song.title).replace("url", song.url));
            utils.play(serverQueue.songs[0]);
        } else {
            utils.log(`Added music to queue: ${song.title}`);
            return sendSafe(strings.songAddedToQueue.replace("SONG_TITLE", song.title).replace("url", song.url));
        }
    }
};

module.exports.names = {
    list: ["play", "p"]
};
