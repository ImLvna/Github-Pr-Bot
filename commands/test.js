// access functions from index.js
const root = require.main.exports;

module.exports = {
  name: 'test',
  description: 'Test wether bot is receiving messages',
  usage: ' ',
  aliases: [],
  execute(message, args) {

    message.channel.send('Message Received');
  }
};