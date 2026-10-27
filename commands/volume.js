const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    const serverQueue = queue.get("queue");
    if (!serverQueue) return sendSafe(strings.nothingPlayingVolume);

    if (args.length > 1) return sendSafe(strings.toMuchArgsVolume);
    if (args.length === 0) return sendSafe(strings.noVolume);

    const floatVolume = parseFloat(args[0]);
    if (isNaN(floatVolume)) return sendSafe(strings.noNumber);
    if (floatVolume > 10) return sendSafe(strings.volumeToHigh);

    serverQueue.volume = floatVolume;
    if (serverQueue.resource && serverQueue.resource.volume) {
        serverQueue.resource.volume.setVolumeLogarithmic(floatVolume / 5);
    }

    utils.log(`Volume set to ${floatVolume}`);
    return sendSafe(strings.volumeChanged.replace("VOLUME", args[0]));
};

module.exports.names = {
    list: ["volume", "v"]
};
