const utils = require("../utils");

module.exports = async (client, oldState, newState) => {
    try {
        utils.checkAutoLeave(client);
    } catch (err) {
        utils.log(`[voiceStateUpdate Error]: ${err.message}`);
    }
};
