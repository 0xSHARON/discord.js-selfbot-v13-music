const { joinVoiceChannel } = require("@discordjs/voice");
const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    let voiceChannel = null;
    if (message.channel.type === "DM" || message.channel.type === "GROUP_DM") {
        voiceChannel = message.channel;
        if (typeof voiceChannel.ring === "function") {
            voiceChannel.ring().catch(() => {});
        }
    } else {
        voiceChannel = message.member ? message.member.voice.channel : null;
    }

    if (!voiceChannel) {
        return sendSafe(strings.notInVocal);
    }

    let serverQueue = queue.get("queue");

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

        const channelLabel = voiceChannel.recipient ? voiceChannel.recipient.tag : voiceChannel.name || voiceChannel.id;
        utils.log(`Joined voice/call: ${channelLabel}`);

        if (!serverQueue) {
            queue.set("queue", {
                textchannel: message.channel,
                voiceChannel: voiceChannel,
                connection: connection,
                player: null,
                resource: null,
                songs: [],
                volume: 4,
                playing: false,
                loop: false,
                skipped: false,
                stay247: !!(global.config && global.config.stay247),
                idleTimeout: null,
                aloneTimeout: null
            });
        } else {
            serverQueue.voiceChannel = voiceChannel;
            serverQueue.connection = connection;
            if (serverQueue.player) {
                connection.subscribe(serverQueue.player);
            }
        }

        utils.checkAutoLeave(client);
        return sendSafe(strings.joinMsg);
    } catch (err) {
        utils.log(`Error joining channel: ${err.message}`);
        return sendSafe(`Failed to join voice channel: ${err.message}`);
    }
};

module.exports.names = {
    list: ["join", "j", "inf"]
};
