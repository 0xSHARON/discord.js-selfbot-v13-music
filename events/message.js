const strings = require('../strings.json');
const utils = require('../utils');

module.exports = async (client, message) => {
    const prefix = (global.config && global.config.prefix) || "!";
    if (!message.content || !message.content.startsWith(prefix)) return;
    if (message.author.bot) return;

    const isSelf = client.user && message.author.id === client.user.id;
    const allowedList = (global.config && global.config.allowed) || [];
    const isAllowed = isSelf || (allowedList.length > 0 && allowedList.includes(message.author.id)) || (allowedList.length === 0);

    if (!isAllowed) {
        utils.log(`${message.author.tag} tried to run '${message.content}' but permission was denied`);
        return;
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    const cmd = client.commands.get(command);
    if (!cmd) return;

    utils.log(`Executing command '${command}' by ${message.author.tag}`);
    try {
        await cmd.run(client, message, args);
    } catch (e) {
        utils.log(`Error executing command '${command}': ${e.message}`);
    }
};
