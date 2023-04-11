require('dotenv').config();
const { Octokit } = require("@octokit/rest");
const { Client, EmbedBuilder, Partials } = require('discord.js');
const express = require('express');
const Crypto = require('crypto');
const multer = require("multer");



const upload = multer({ dest: "uploads/" });
const app = express();
app.use(express.json());

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

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  // Only allow contribs and techhelp
  if (!message.member.roles.cache.some(r => (r.name === 'Contributor (Code)' || r.name === 'Tech Helper' ) ) ) return;

  if (message.content.startsWith(process.env.PREFIX)) {
    // handle command

    let command = message.content.split(' ')[0].substring(process.env.PREFIX.length);

    if (command === 'logs') {
      if ( message.mentions.users.size === 0 ) return message.channel.send('You need to mention a user to get their logs!');
      uuid = Crypto.randomUUID();
      uuid = "1"
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
      })
    }
  }

  else if (/#(\d{1,4})/g.test(message.content)) { // if pr
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


app.post('/logs', upload.array('logs', 2) , (req, res) => {
  body = req.body;
  if (logTokens[body.token] === undefined) return res.sendStatus(401);

  if (req.files.length === 0) return res.sendStatus(400);

  tokenInfo = logTokens[body.token];

  client.channels.fetch(tokenInfo.channel).then(channel => {
    channel.send({ content: `<@${tokenInfo.requester}>, @<${tokenInfo.requestee}'s logs are ready!`, files: req.files});
  })


  

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