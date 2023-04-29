require('dotenv').config();
const { Client, EmbedBuilder, Partials, Collection, Events, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const Crypto = require('crypto');
const cors = require('cors')
const fs = require('fs');
const path = require('path');
const io = require('@pm2/io')


const pr = require('./modules/pr.js');

var autoMessages = require('./messages.json');

const app = express();
app.use(express.json());
app.use(cors());

io.init({
  transactions: true, // will enable the transaction tracing
  http: true // will enable metrics about the http server (optional)
})

const metrics = {
  cmds: io.counter({name: 'Commands',}),
  slashcmds: io.counter({name: 'Slash Commands',}),
  prefixcmds: io.counter({name: 'Prefix Commands',}),
  automsgs: io.counter({name: 'Auto Messages',}),
  logsparsed: io.counter({name: 'Logs Parsed',}),
}

const client = new Client({ 
  intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMessageReactions'],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, ],
});

// const client = { // dummy client for testing
//   on: (event, callback) => {},
//   login: (token) => {}
// }



let logTokens = {};

logTokens['test'] = {
  channelid: '1095520136552792106',
  requester: '174200708818665472',
  requestee: '799319081723232267'
}

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


let cmdfiles = fs.readdirSync(path.join(__dirname,"commands"))

let commands = {}

async function reloadCommands() {
  client.commands = new Collection()
  commands = {}
  for (const file of cmdfiles ) {
    

    const command = require(`./commands/${file}`);

    let cmd = {}


    if ('data' in command) {
      client.commands.set(command.data.name, command);
      cmd.type = 'slash'
      cmd.name = command.data.name
      cmd.description = command.data.description
    } else {
      let _aliases = command.aliases;
      _aliases.push(command.name)
  
      cmd = {
        name: command.name,
        type: 'msg',
        description: command.description,
        aliases: _aliases,
        execute: command.execute
      };
    }
    
    commands[cmd.name] = cmd

  }

  return;
}

reloadCommands()

module.exports.pushLogToken = (uuid, data) => {
  logTokens[uuid] = data;
}
module.exports.getLogTokens = () => {
  return logTokens;
}
module.exports.deleteLogToken = (uuid) => {
  delete logTokens[uuid];
}


client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  let isContributor = message.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) )

  try {
    if (message.content.startsWith(process.env.PREFIX)) {
      // handle command

      let command = message.content.split(' ')[0].substring(process.env.PREFIX.length);
      let args = message.content.split(' ').slice(1);
      
      if (command === 'reload') {
        if (message.author.id !== '174200708818665472') return;
        metrics.prefixcmds.inc()
        metrics.commands.inc()
        await reloadCommands();
        message.channel.send('Reloaded commands!\n\n' + Object.keys(commands).join(', '));
        return;
      } else if (command === 'rooteval' || command === 'evalroot') {
        if (message.author.id !== '174200708818665472') return;
        metrics.prefixcmds.inc()
        metrics.commands.inc()
        try {
          _ =  eval(args.join(' '));
          message.channel.send(_.toString() || 'Empty response');
        } catch (e) {
          message.channel.send(e.message || 'Unexpected error with no message');
          return;
        }
      }
      Object.values(commands).forEach((cmd) => {
        if (cmd.type == 'msg' && cmd.aliases.includes(command)) {
          metrics.prefixcmds.inc()
          metrics.commands.inc()
          cmd.execute(message, args);
        }
      })
    }

    else if (/#(\d{1,4})/g.test(message.content)  &&  isContributor) pr.sendMessage(message);

    Object.keys(autoMessages).forEach((key) => {
      if (message.content.toLowerCase().includes(key.toLowerCase())) {
        if (key.includes('__') && !isContributor) return; // if the key has __ in it, it requires contributor role
        message.channel.send(autoMessages[key]);
        metrics.automsgs.inc()
      }
    })
  } catch(e) {
    message.channel.send(`**Error running command: **\n${e}\n*(Alerting <@174200708818665472>)*`)
    console.error(e)
  }
});



client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
    metrics.slashcmds.inc()
    metrics.commands.inc()
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

// client.on('messageReactionAdd', async (messageReaction, user) => {

//   let msg = !messageReaction.message.author ? await messageReaction.message.fetch() : messageReaction.message;
//   if(msg.author.id !== client.user.id) return;
//   let member = await msg.guild.members.fetch(user.id);
//   if (!member.roles.cache.some(r => r.name === 'Contributor (Code)')) return messageReaction.remove();
//   if (messageReaction.emoji.name === '❌') return msg.delete();
//   // else if (messageReaction.emoji.name === '❓' || messageReaction.emoji.name === '❔' || messageReaction.emoji.name === '⁉️') {
//   //   messageReaction.remove();
//   //   msg.channel.send(`<@${user.id}>, This is a PR message! Its triggered by saying the number of a pull request, ie: \`#123\`. You can react with ❌ to delete it or ❓ to get this message.`);
//   // }

  

// });


channeldict = {};

Object.keys(process.env).forEach((key) => {
  value = process.env[key];
  if (!key.startsWith('CHANNEL_')) return;
  key = key.replace('CHANNEL_', '');
  
  arr = key.split('_')

  upstream = arr[0] + '/' + arr[1];
  if (arr[3] !== undefined) {
    upstream += '_' + arr[2];
  }

  _upstream = upstream.toLowerCase();

  releasechannel = arr[arr.length - 1];

  if (channeldict[_upstream] === undefined) {
    channeldict[_upstream] = {};
  }

  channeldict[_upstream][releasechannel.toLowerCase()] = value;
});


app.post('/release', (req, res) => {

  //TODO: AUTHENTICATION
  return res.sendStatus(403)


  body = req.body;
  vernum = body.version;
  upstream = body.upstream;
  releaselink = body.artifacts;
  changelog = body.changelog;
  channel = body.channel;

  
  if (channeldict[upstream.toLowerCase()] === undefined) return console.log("Ignoring release for unknown upstream: ", upstream);
  if (channeldict[upstream.toLowerCase()][channel.toLowerCase()] === undefined) return console.log("Ignoring release for unknown channel: ", channel);

  let channelid = channeldict[upstream.toLowerCase()][channel.toLowerCase()];

  
  date = new Date().toJSON().slice(0,10).replace(/-/g,'/');
  
  let embed = new EmbedBuilder()
    .setTitle(`Update ${vernum} is now available!`)
    .setURL(releaselink)
    .setDescription(changelog)
    .setColor('#3381ff')
    .setFooter({ text: date });
  
  client.channels.fetch(channelid).then(channel => {
    channel.send({ embeds: [embed] });
    console.log("Sent release message to channel: ", channel.name, " for upstream: ", upstream)
  });


  res.sendStatus(200);
});

app.get('/logtoken/:token', (req, res) => {
  token = req.params.token;
  if (logTokens[token] === undefined) return res.sendStatus(404);
  return res.sendStatus(200);
});

app.post('/logs', async (req, res) => {
  body = req.body;
  if (logTokens[req.headers.token] === undefined) return res.sendStatus(401);
  
  if (body.length === 0) return res.sendStatus(400);

  logs = []

  for (const file of Object.keys(req.body)) {
    await fs.promises.writeFile(`./uploads/${file}`, req.body[file]);
    logs.push(`./uploads/${file}`);
  }


  tokenInfo = logTokens[req.headers.token];


  channel = await client.channels.fetch(tokenInfo.channelid)

  if (logs.length > 10) {
    await channel.send({ content: `<@${tokenInfo.requester}>, <@${tokenInfo.requestee}>'s logs are ready!`, files:logs.slice(0, 9)});
    await channel.send('Too many logs for one message, more are incoming...')
    await channel.send({ files:logs.slice(10, 19) });
    if (logs.length > 20) await channel.send({ files:logs.slice(20, 29) });
    if (logs.length > 30) await channel.send("There are over 30 logs")
  } else {
    await channel.send({ content: `<@${tokenInfo.requester}>, <@${tokenInfo.requestee}>'s logs are ready!`, files:logs});
  }


  // Cleanups
  logs.forEach(file => {
    fs.unlink(file, (err) => {
      if (err) throw err;
      console.log(`Removed ${file}`);
    })
  });

  metrics.logsparsed.inc(logsparsed.length)

  if (req.headers.token !== 'test') delete logTokens[req.headers.token];
  res.sendStatus(200);
})





app.post('/webhook/:id', async (req, res) => {

  //TODO: AUTHENTICATION
  return res.sendStatus(403)


  body = req.body;

  channel = await client.channels.fetch(req.params.id)
  try {
    if (req.query.wait) {
      await channel.send({ 
        content: body.content || '',
        embeds: body.embeds || [],
        tts: body.tts || false,
        embeds: body.embeds || [],
        allowedMentions: body.allowedMentions || {},
        files: body.files || [],
        payload_json: body.payload_json || {},
        attachments: body.attachments || [],
        flags: body.flags || 0,
      });
    } else {
      channel.send({ 
        content: body.content || '',
        embeds: body.embeds || [],
        tts: body.tts || false,
        embeds: body.embeds || [],
        allowedMentions: body.allowedMentions || {},
        files: body.files || [],
        payload_json: body.payload_json || {},
        attachments: body.attachments || [],
        flags: body.flags || 0,
      });
    }
  } catch (e) {
    console.log(e);
    res.sendStatus(400);
    return;
  }
  res.sendStatus(200);
});

app.listen(process.env.PORT.toString(), () => {
  console.log(`Listening on port ${process.env.PORT}`);
});

client.login(process.env.DISCORD_TOKEN);





`{
  "version": "v0.8",
  "upstream": "clangenrepo",
  "artifacts": [
    "http://1.com",
    "another artifact"
  ],
  "changelog": "biiig changelog",
  "channel": "release"
}`