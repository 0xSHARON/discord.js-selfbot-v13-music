const { joinVoiceChannel } = require("@discordjs/voice");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    let targetChannel = null;

    if (args[0]) {
        const userId = args[0].replace(/[<@!>]/g, "");
        try {
            const user = await client.users.fetch(userId);
            if (!user) {
                return sendSafe("User not found for DM call.");
            }
            targetChannel = await user.createDM();
        } catch (e) {
            return sendSafe(`Could not open DM with user: ${e.message}`);
        }
    } else if (message.channel.type === "DM" || message.channel.type === "GROUP_DM") {
        targetChannel = message.channel;
    } else {
        return sendSafe("Usage: >call in a DM, or >call @user / >call <id> in a server.");
    }

    let serverQueue = queue.get("queue");

    try {
        if (typeof targetChannel.ring === "function") {
            await targetChannel.ring().catch(() => {});
        }

        const connection = joinVoiceChannel({
            channelId: targetChannel.id,
            guildId: targetChannel.guild ? targetChannel.guild.id : targetChannel.id,
            adapterCreator: utils.getVoiceAdapterCreator(targetChannel),
            selfDeaf: false,
            selfMute: false
        });

        connection.on('stateChange', (oldState, newState) => {
            utils.log(`[Voice Connection State]: ${oldState.status} -> ${newState.status}`);
        });
        connection.on('error', err => {
            utils.log(`[Voice Connection Error]: ${err.message}`);
        });

        const targetName = targetChannel.recipient ? targetChannel.recipient.tag : targetChannel.name || targetChannel.id;
        utils.log(`Joined and ringing DM call with: ${targetName}`);

        if (!serverQueue) {
            queue.set("queue", {
                textchannel: targetChannel,
                voiceChannel: targetChannel,
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
            serverQueue.voiceChannel = targetChannel;
            serverQueue.connection = connection;
            if (serverQueue.player) {
                connection.subscribe(serverQueue.player);
            }
        }

        utils.checkAutoLeave(client);
        sendSafe(`Successfully connected to DM call with ${targetName}`);
    } catch (err) {
        utils.log(`Error joining DM call: ${err.message}`);
        sendSafe(`Failed to join DM call: ${err.message}`);
    }
};

module.exports.names = {
    list: ["call", "dmcall", "ring"]
};
