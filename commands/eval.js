// access functions from index.js
const root = require.main.exports;

module.exports = {
  name: 'eval',
  description: 'Runs code as the bot',
  aliases: [],
  execute(message, args) {
    if (message.author.id !== '174200708818665472') return;
    try {
      _ = eval(args.join(' '));
      message.channel.send(_ || 'Empty response');
    } catch (e) {
      message.channel.send(e || 'Unexpected error with no message');
      return;
    }
  }
};