const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChatInputCommandInteraction} = require("discord.js");
// access functions from index.js
const root = require.main.exports;

const Crypto = require('crypto');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Get logs from a user')
    .addUserOption(option => option.setName('user').setDescription('User to get logs from').setRequired(true)),
  
  /** @param {ChatInputCommandInteraction} interaction*/
  async execute(interaction) {

    if (!interaction.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) ) ) {
        return interaction.reply({ content:'You do not have permission to use this command!', ephemeral: true});
    };

    uuid = Crypto.createHash('sha1')
    uuid.update(Crypto.randomUUID())
    uuid = uuid.digest('hex').substr(0,7)

    root.pushLogToken(uuid,
    {
      channelid: interaction.channelId,
      requester: interaction.user.id,
      requestee: interaction.options.getUser('user').id,
    })

    let btn = new ButtonBuilder()
			.setCustomId('showbtn-'+uuid)
			.setLabel('Show Token')
			.setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
      .addComponents(btn)

    let time = `<t:${Date.parse(new Date(Date.now() + 7200000)).toString() / 1000}:t>`

    const res = await interaction.reply({ 
      content: `${interaction.options.getUser('user')}, <@${interaction.user.id}> wants to see your logs. If you want to allow this, please press the button below. The token will expire at ${time}`,
      components: [row],
    });
    
    setTimeout(() => {
      if (root.getLogTokens()[uuid]) {
        root.deleteLogToken(uuid);
      }
    }, 7200000);

    try {
      let userresponse = await res.awaitMessageComponent({ filter: (i => i.user.id === interaction.options.getUser('user').id), time: 7200000 });
      userresponse.reply({
        content: `Your token is as follows:\n\`${uuid}\`\nDo not share this token with anyone.`,
        ephemeral: true
      })

      btn.setDisabled(true);

      let newrow = new ActionRowBuilder()
        .addComponents(btn)

      await res.edit({ 
        content: `Token claimed! The token will expire at ${time}`,
        components: [newrow],
      })

    } catch(e) {
      await res.edit({ content: 'Confirmation not received within 2 hours, please request another token.', components: [] })
    }
  }
};