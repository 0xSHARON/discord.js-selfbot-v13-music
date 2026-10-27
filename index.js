const { Client } = require("discord.js-selfbot-v13");
const client = new Client();
global.client = client;
const fs = require('fs');
const utils = require('./utils');
try {
  process.env.FFMPEG_PATH = require('ffmpeg-static');
} catch (e) {}
const keepAlive = require("./server")

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch (e) {
    // Ignore if .env doesn't exist
  }
}

process.on('unhandledRejection', (reason) => {
  const msg = reason && reason.message ? reason.message : reason;
  utils.log(`[Unhandled Rejection Handled]: ${msg}`);
});

process.on('uncaughtException', (err) => {
  utils.log(`[Uncaught Exception Handled]: ${err.message}`);
});

let cfgToken = process.env.TOKEN;
let cfgPrefix = process.env.PREFIX || "--";

if (!cfgToken) {
  try {
    const config = require("./config");
    cfgToken = config.token;
    cfgPrefix = config.prefix || cfgPrefix;
  } catch (e) {
    console.error("No config file found, create it or use environment variables.");
    process.exit(1);
  }
}

global.config = {
  token: cfgToken,
  prefix: cfgPrefix,
  allowed: [],
  stay247: false
};

if (process.env.ALLOWED) {
  global.config.allowed = process.env.ALLOWED.split(/[\s,]+/).filter(Boolean);
} else {
  try {
    global.config.allowed = require("./allowed.json").allowed || [];
  } catch (e) {
    global.config.allowed = [];
  }
}

keepAlive();
client.login(global.config.token);

utils.log("Logging in...");

/* ----------------------------------------------- */

global.queue = new Map();
client.commands = new Map();

/* ----------------------------------------------- */

var loaded = {events: [], commands: []};

var promise = new Promise((resolve) => {
  fs.readdir('./events/', (err, files) => {
    if (err) return console.error;
    files.forEach(file => {
      if (!file.endsWith('.js')) return;
      const evt = require(`./events/${file}`);
      let evtName = file.split('.')[0];
      if (evtName === 'messages' || evtName === 'message') evtName = 'messageCreate';
      loaded.events.push(evtName);
      client.on(evtName, evt.bind(null, client));
    });
    resolve();
  });
});


fs.readdir('./commands/', async (err, files) => {
  if (err) return console.error;
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    let props = require(`./commands/${file}`);
    props.names.list.forEach(name => {
      client.commands.set(name, props);
    })
    let cmdName = file.split('.')[0];
    loaded.commands.push(cmdName)
  });
  promise.then(() => {utils.log(`Table of commands and events :\n${utils.showTable(loaded)}`)});
});


/* --------------------------------------------------- */
