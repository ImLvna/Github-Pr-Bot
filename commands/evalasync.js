// access functions from index.js
const root = require.main.exports;

module.exports = {
  name: 'asynceval',
  description: 'Runs code as the bot',
  usage: '<code>',
  aliases: ['async', 'evalasync'],
  async execute(message, args) {
    if (!message.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) )) return;
    message.channel.send('✅')
    try {
      _ = await eval(args.join(' '));
      message.channel.send(_ || 'undefined');
    } catch (e) {
      message.channel.send(e || 'Unexpected error with no message');
      return;
    }
  }
};