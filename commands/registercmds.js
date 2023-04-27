const { REST, Routes } = require('discord.js');

let rest = undefined;


// access functions from index.js
const root = require.main.exports;

module.exports = {
  name: 'register',
  description: 'Registers Slash Commands',
  aliases: ['reg', 'regcmds'],
  async execute(message, args) {
    if (!message.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) )) return;
    

    if (typeof rest === 'undefined') rest = new REST().setToken(process.env.DISCORD_TOKEN);

    let _cmds = message.client.commands.values()
    let cmds = []
    for (const cmd of _cmds) {
        cmds.push(cmd.data.toJSON())
    }
    await message.channel.send(`Registering ${cmds.length} slash commands`)
    
    try {
        const data = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: cmds }
        )

        await message.channel.send(`Successfully reloaded ${data.length} slash commands`)
    } catch(err) {
        console.error(err)
        message.channel.send(err)
    }
  }
};