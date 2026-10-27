const utils = require("../utils");

module.exports = async (client, call) => {
    try {
        const serverQueue = global.queue?.get("queue");
        if (!serverQueue) return;

        if (serverQueue.voiceChannel && call && serverQueue.voiceChannel.id === call.channelId) {
            if (serverQueue.stay247 || global.config.stay247) {
                utils.log(`[24/7 Mode]: DM call ended, but 24/7 mode is active.`);
                return;
            }

            utils.log(`[Auto-Leave]: DM call was ended by other user. Disconnecting...`);
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
                try { serverQueue.connection.destroy(); } catch (e) {}
            }
            global.queue.delete("queue");
            utils.updatePresence(null);
        }
    } catch (err) {
        utils.log(`[callDelete Error]: ${err.message}`);
    }
};
