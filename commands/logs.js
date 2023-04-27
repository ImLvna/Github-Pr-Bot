const { SlashCommandBuilder } = require("discord.js");
// access functions from index.js
const root = require.main.exports;

const Crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Get logs from a user')
    .addUserOption(option => option.setName('user').setDescription('User to get logs from').setRequired(true)),
  execute(interaction) {

    if (!interaction.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) ) ) {
        return interaction.reply({ content:'You do not have permission to use this command!', ephemeral: true});
    };

    uuid = Crypto.randomUUID();

    root.pushLogToken(uuid,
    {
      channelid: interaction.channelId,
      requester: interaction.user.id,
      requestee: interaction.options.getUser('user').id,
    })

    interaction.reply(`${interaction.options.getUser('user')}, <@${interaction.user.id}> wants to see your logs. If you want to allow this, please enter the following token into your game:`);
    interaction.reply(`\`${uuid}\``);
    interaction.reply(`This token will expire at <t:${Date.parse(new Date(Date.now() + 7200000)).toString() / 1000}:t>`);
    setTimeout(() => {
      if (root.getLogTokens()[uuid]) {
        root.deleteLogToken(uuid);
      }
    }, 7200000);
  }
};