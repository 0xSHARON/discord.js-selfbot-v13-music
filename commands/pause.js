const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    const serverQueue = queue.get("queue");
    if (!serverQueue || !serverQueue.songs[0]) {
        return sendSafe("> `❌` **Nothing is currently playing to pause.**");
    }

    if (serverQueue.player) {
        serverQueue.player.pause();
        serverQueue.playing = false;
        serverQueue.pausedAt = Date.now();
        utils.log("Paused the music playback");
        return sendSafe("> `⏸️` **Music playback has been paused.**");
    }
};

module.exports.names = {
    list: ["pause"]
};
