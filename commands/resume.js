const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    const serverQueue = queue.get("queue");
    if (!serverQueue || !serverQueue.songs[0]) {
        return sendSafe("> `❌` **No active song to resume.**");
    }

    if (serverQueue.player) {
        serverQueue.player.unpause();
        serverQueue.playing = true;
        if (serverQueue.pausedAt) {
            serverQueue.totalPausedMs = (serverQueue.totalPausedMs || 0) + (Date.now() - serverQueue.pausedAt);
            serverQueue.pausedAt = null;
        }
        utils.log("Resumed the music playback");
        return sendSafe("> `▶️` **Music playback resumed.**");
    }
};

module.exports.names = {
    list: ["resume", "unpause"]
};
