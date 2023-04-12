require('dotenv').config();
const { Octokit } = require("@octokit/rest");
const { Client, EmbedBuilder, Partials } = require('discord.js');
const express = require('express');
const Crypto = require('crypto');
const multer = require("multer");
const cors = require('cors')
const fs = require('fs');
const path = require('path');



const upload = multer({ dest: "uploads/" });
const app = express();
app.use(express.json());
app.use(cors());

const client = new Client({ 
  intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMessageReactions'],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, ],
});

// const client = { // dummy client for testing
//   on: (event, callback) => {},
//   login: (token) => {}
// }

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

octokit.hook.error("request", async (error, options) => {
  if (error.status === 404) {
    return false;
  }

  throw error;
});

let logTokens = {};

logTokens['test'] = {
  channelid: '1095520136552792106',
  requester: '174200708818665472',
  requestee: '799319081723232267'
}

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


var commands = {}

let cmdfiles = fs.readdirSync(path.join(__dirname,"commands"))

for (const file of cmdfiles ) {
  commands = []
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (!command.name) return console.log(`Command ${file} is missing a name!`);
  if (!command.description) return console.log(`Command ${file} is missing a description!`);
  if (!command.usage) return console.log(`Command ${file} is missing a usage!`);
  if (!commands.aliases) return console.log(`Command ${file} is missing aliases!`)
  if (!command.execute) return console.log(`Command ${file} is missing an execute function!`);

  _aliases = command.aliases;
  _aliases.push(command.name)

  
  commands[command.name] = {
    name: command.name,
    description: command.description,
    usage: command.usage,
    aliases: _aliases,
    execute: command.execute
  };
}

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

  if (message.content.startsWith(process.env.PREFIX)) {
    // handle command

    let command = message.content.split(' ')[0].substring(process.env.PREFIX.length);
    let args = message.content.split(' ').slice(1);

    for (const cmd of commands) {
      if (cmd.aliases.includes(command)) {
        cmd.execute(message, args);
      }
    }
  }

  else if (/#(\d{1,4})/g.test(message.content)  &&  isContributor) { // if pr
    let numbers = message.content.match(/#(\d{1,4})/g).map(n => n.replace('#', ''));
    numbers.forEach(async num => {
      let pr = await octokit.rest.pulls.get({
        owner: 'Thlumyn',
        repo: 'clangen',
        pull_number: num,
      });
      if (pr) {
        let color = '#000000';
        let prtype = '?';
        if(pr.data.state === 'closed') {
          prtype = 'closed';
          color = '#ff6a69';
          if(pr.data.draft) {
            color = '#7a4b4b';
          } else {
            let merged = await octokit.rest.pulls.checkIfMerged({
              owner: 'Thlumyn',
              repo: 'clangen',
              pull_number: num,
            });
            if (merged) {
              prtype = 'merged';
              color = '#b87fff';
            }
          }
        } else if(pr.data.state === 'open') {
          if(pr.data.draft) {
            prtype = 'draft';
            color = '#4f785b';
          } else {
            prtype = 'open';
            color = '#09b43a';
          }
        }
        let emoji = '';
        switch(prtype) {
          case 'closed':
            emoji = '<:prclosed:1080253683662594118>';
            break;
          case 'merged':
            emoji = '<:prmerge:1080254096398884895>';
            break;
          case 'draft':
            emoji = '<:prdraft:1080253487247536178>';
            break;
          case 'open':
            emoji = '<:propen:1080253114151620658>';
            break;
        }
        let embed = new EmbedBuilder()
          .setAuthor({ name: pr.data.user.login, iconURL: pr.data.user.avatar_url, url: pr.data.user.html_url })
          .setTitle(`${emoji}  #${pr.data.number} - ${pr.data.title}`)
          .setDescription(pr.data.body)
          .setURL(pr.data.html_url)
          .setColor(color)
          .setFooter({ text: `#${pr.data.number} - ${prtype} - ${pr.data.user.login}` });

        message.channel.send({ embeds: [embed] });
      }
    });
  }
});

client.on('messageReactionAdd', async (messageReaction, user) => {

  let msg = !messageReaction.message.author ? await messageReaction.message.fetch() : messageReaction.message;
  if(msg.author.id !== client.user.id) return;
  let member = await msg.guild.members.fetch(user.id);
  if (!member.roles.cache.some(r => r.name === 'Contributor (Code)')) return messageReaction.remove();
  if (messageReaction.emoji.name === '❌') return msg.delete();
  else if (messageReaction.emoji.name === '❓' || messageReaction.emoji.name === '❔' || messageReaction.emoji.name === '⁉️') {
    messageReaction.remove();
    msg.channel.send(`<@${user.id}>, This is a PR message! Its triggered by saying the number of a pull request, ie: \`#123\`. You can react with ❌ to delete it or ❓ to get this message.`);
  }

  

});


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

console.log("Upstream/Channel => Discord Channel mapping: ", channeldict)


app.post('/release', (req, res) => {
  body = req.body;
  vernum = body.version;
  upstream = body.upstream;
  releaselinks = body.artifacts;
  changelog = body.changelog;
  channel = body.channel;

  
  if (channeldict[upstream.toLowerCase()] === undefined) return console.log("Ignoring release for unknown upstream: ", upstream);
  if (channeldict[upstream.toLowerCase()][channel.toLowerCase()] === undefined) return console.log("Ignoring release for unknown channel: ", channel);

  let channelid = channeldict[upstream.toLowerCase()][channel.toLowerCase()];

  
  date = new Date().toJSON().slice(0,10).replace(/-/g,'/');
  
  let embed = new EmbedBuilder()
    .setTitle(`Update ${vernum} is now available!`)
    .setURL(releaselinks[0])
    .setDescription(changelog)
    .setColor('#3381ff')
    .setFooter({ text: date });
  
  client.channels.fetch(channelid).then(channel => {
    channel.send({ embeds: [embed] });
    console.log("Sent release message to channel: ", channel.name, " for upstream: ", upstream)
  });


  res.sendStatus(200);
});


app.post('/logs', upload.array('logs') , async (req, res) => {
  body = req.body;
  if (logTokens[req.headers.token] === undefined) return res.sendStatus(401);

  if (req.files.length === 0) return res.sendStatus(400);

  tokenInfo = logTokens[req.headers.token];

  logs = []

  for (const file of req.files) {
    await fs.promises.copyFile(file.path, `./uploads/${file.originalname}`);
    logs.push(`./uploads/${file.originalname}`);
  }

  channel = await client.channels.fetch(tokenInfo.channelid)
  await channel.send({ content: `<@${tokenInfo.requester}>, <@${tokenInfo.requestee}>'s logs are ready!`, files:logs});

  // Cleanups
  req.files.forEach(file => {
    fs.unlink(file.path, (err) => {
      if (err) throw err;
      console.log(`Removed ${file.path}`);
    })
    fs.unlink(`./uploads/${file.originalname}`, (err) => {
      if (err) throw err;
      console.log(`Removed ./uploads/${file.originalname}`);
    })
  });

  delete logTokens[req.headers.token];
  res.sendStatus(200);
})

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