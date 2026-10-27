const utils = require('../utils');

module.exports = client => {
    utils.log(`Logged in as ${client.user.tag} !`);
};
