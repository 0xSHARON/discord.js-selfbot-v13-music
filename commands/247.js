const utils = require("../utils");

module.exports.run = async (client, message, args) => {
    const sendSafe = utils.sendSafe;
    const serverQueue = queue.get("queue");

    if (serverQueue) {
        serverQueue.stay247 = !serverQueue.stay247;
        global.config.stay247 = serverQueue.stay247;

        if (serverQueue.stay247) {
            if (serverQueue.idleTimeout) {
                clearTimeout(serverQueue.idleTimeout);
                serverQueue.idleTimeout = null;
            }
            if (serverQueue.aloneTimeout) {
                clearTimeout(serverQueue.aloneTimeout);
                serverQueue.aloneTimeout = null;
            }
            utils.log("[24/7 Mode]: Enabled. The bot will not leave the voice channel or DM call when songs end.");
            return sendSafe("> `✅` **24/7 Mode enabled** - Bot will remain in voice channel / DM call 24/7.");
        } else {
            utils.log("[24/7 Mode]: Disabled. The bot will automatically leave when idle or alone.");
            sendSafe("> `❌` **24/7 Mode disabled** - Bot will disconnect when idle or alone.");

            if (!serverQueue.playing || serverQueue.songs.length === 0) {
                utils.scheduleIdleDisconnect(serverQueue);
            }
            utils.checkAutoLeave(client);
            return;
        }
    } else {
        global.config.stay247 = !global.config.stay247;
        if (global.config.stay247) {
            utils.log("[24/7 Mode]: Enabled (Global).");
            return sendSafe("> `✅` **24/7 Mode enabled** (Global).");
        } else {
            utils.log("[24/7 Mode]: Disabled (Global).");
            return sendSafe("> `❌` **24/7 Mode disabled** (Global).");
        }
    }
};

module.exports.names = {
    list: ["247", "24/7", "stay", "stay247"]
};
