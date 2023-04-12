// access functions from index.js
const root = require('../index.js');

module.exports = {
  name: 'logs',
  description: 'Generate a token for log uploading',
  usage: '<user>',
  aliases: ['log', 'token'],
  execute(message, args) {
    if ( message.mentions.users.size === 0 ) return message.channel.send('You need to mention a user to get their logs!');
    uuid = Crypto.randomUUID();
    logTokens[uuid] = {
      channelid: message.channel.id,
      requester: message.author.id,
      requestee: message.mentions.users.first().id,
    };
    message.channel.send(`${message.mentions.users.first()}, <@${message.author.id}> wants to see your logs. If you want to allow this, please enter the following token into your game:`);
    message.channel.send(`\`${uuid}\``);
    message.channel.send(`This token will expire at <t:${Date.parse(new Date(Date.now() + 7200000)).toString() / 1000}:t>`);
    setTimeout(() => {
      if (logTokens[uuid]) {
        delete logTokens[uuid];
      }
    }, 7200000);
  }
};