const strings = require("../strings.json");
const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;

    const serverQueue = queue.get("queue");
    if (!serverQueue || serverQueue.songs.length === 0) {
        return sendSafe(strings.noSongsQueued);
    }

    let queuetxt = "";
    for (let i = 0; i < serverQueue.songs.length; i++) {
        let minutes = `${Math.floor(serverQueue.songs[i].duration / 60)}`;
        if (minutes.length === 1) minutes = "0" + minutes;
        let seconds = `${serverQueue.songs[i].duration % 60}`;
        if (seconds.length === 1) seconds = "0" + seconds;

        if (serverQueue.loop === true && i === 0) { 
            queuetxt += `\`\`\`xml\n${i+1}. (${minutes}:${seconds}) 🔄 ${serverQueue.songs[i].title} <requested by ${serverQueue.songs[i].requestedby}>\`\`\`\n`;
        } else {
            queuetxt += `\`\`\`xml\n${i+1}. (${minutes}:${seconds}) ${serverQueue.songs[i].title} <requested by ${serverQueue.songs[i].requestedby}>\`\`\`\n`;
        }
    }

    utils.log("Showed music queue");
    return sendSafe(strings.musicsQueued + "\n" + queuetxt);
};

module.exports.names = {
    list: ["queue", "q"]
};
