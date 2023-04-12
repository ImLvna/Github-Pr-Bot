// access functions from index.js
const root = require.main.exports;

module.exports = {
  name: 'eval',
  description: 'Runs code as the bot',
  usage: '<code>',
  aliases: ['async'],
  async execute(message, args) {
    if (!message.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) )) return;
    message.channel.send("✅")
    _ = await eval(args.join(' '))
    message.channel.send(_);
  }
};