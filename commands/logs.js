// access functions from index.js
const root = require.main.exports;

module.exports = {
  name: 'logs',
  description: 'Generate a token for log uploading',
  usage: '<user>',
  aliases: ['log', 'token'],
  execute(message, args) {

    if (!message.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) ) ) {
        return message.channel.send('You do not have permission to use this command!');
    };

    if ( message.mentions.users.size === 0 ) return message.channel.send('You need to mention a user to get their logs!');
    uuid = Crypto.randomUUID();

    root.pushLogToken(uuid,
    {
      channelid: message.channel.id,
      requester: message.author.id,
      requestee: message.mentions.users.first().id,
    })

    message.channel.send(`${message.mentions.users.first()}, <@${message.author.id}> wants to see your logs. If you want to allow this, please enter the following token into your game:`);
    message.channel.send(`\`${uuid}\``);
    message.channel.send(`This token will expire at <t:${Date.parse(new Date(Date.now() + 7200000)).toString() / 1000}:t>`);
    setTimeout(() => {
      if (root.getLogTokens()[uuid]) {
        root.deleteLogToken(uuid);
      }
    }, 7200000);
  }
};