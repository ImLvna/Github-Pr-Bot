const { SlashCommandBuilder } = require("discord.js");

// access functions from index.js
const root = require.main.exports;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Evaluate code')
    .addStringOption(option => option.setName('code').setDescription('Code to evaluate').setRequired(true)),
  execute(interaction) {
    if (!interaction.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) )) return;
    try {
      let message = interaction.message
      _ = eval(interaction.options.getString('code'));
      interaction.reply(_ || 'Empty response');
    } catch (e) {
      interaction.reply(e || 'Unexpected error with no message');
      return;
    }
  }
};