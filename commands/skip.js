const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    const serverQueue = queue.get("queue");
    if (!serverQueue || !serverQueue.songs || serverQueue.songs.length === 0) {
        return sendSafe(strings.nothingPlaying);
    }

    const currentTitle = serverQueue.songs[0] ? serverQueue.songs[0].title : "current song";
    utils.log(`Skipped music : ${currentTitle}`);

    serverQueue.skipped = true;
    if (serverQueue.player) {
        serverQueue.player.stop();
    }

    return sendSafe(strings.musicSkipped);
};

module.exports.names = {
    list: ["skip", "s"]
};
