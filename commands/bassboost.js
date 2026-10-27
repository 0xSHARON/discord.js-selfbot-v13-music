const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    const serverQueue = queue.get("queue");
    if (!serverQueue) return sendSafe(strings.nothingPlayingVolume);

    if (args[0] !== "on" && args[0] !== "off") {
        return sendSafe("> `❌` **Usage: bassboost on / off**");
    }

    const floatVolume = args[0] === "on" ? 25 : 4;
    serverQueue.volume = floatVolume;
    if (serverQueue.resource && serverQueue.resource.volume) {
        serverQueue.resource.volume.setVolumeLogarithmic(floatVolume / 5);
    }

    return sendSafe(strings.deep);
};

module.exports.names = {
    list: ["bassboost", "bb"]
};
