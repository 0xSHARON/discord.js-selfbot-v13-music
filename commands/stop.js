const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    const serverQueue = queue.get("queue");
    if (!serverQueue) {
        return sendSafe(strings.nothingPlaying);
    }

    serverQueue.songs = [];
    utils.log("Stopped playing music");

    if (serverQueue.idleTimeout) {
        clearTimeout(serverQueue.idleTimeout);
        serverQueue.idleTimeout = null;
    }
    if (serverQueue.aloneTimeout) {
        clearTimeout(serverQueue.aloneTimeout);
        serverQueue.aloneTimeout = null;
    }

    if (serverQueue.player) {
        try { serverQueue.player.stop(); } catch (e) {}
    }
    if (serverQueue.connection) {
        try {
            serverQueue.connection.destroy();
        } catch (e) {}
    }
    queue.delete("queue");
    utils.updatePresence(null);

    return sendSafe(strings.musicStopped);
};

module.exports.names = {
    list: ["stop", "st"]
};
