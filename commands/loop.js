const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    const serverQueue = queue.get("queue");
    if (!serverQueue || serverQueue.songs.length === 0) {
        return sendSafe(strings.cantLoop);
    }

    if (serverQueue.loop === false) {
        serverQueue.loop = true;
        utils.log(`Started looping : ${serverQueue.songs[0].title}`);
        sendSafe(strings.loopOn.replace("SONG_TITLE", serverQueue.songs[0].title));
    } else {
        serverQueue.loop = false;
        utils.log(`Stopped looping : ${serverQueue.songs[0].title}`);
        sendSafe(strings.loopOff.replace("SONG_TITLE", serverQueue.songs[0].title));
    }
};

module.exports.names = {
    list: ["loop", "l"]
};
