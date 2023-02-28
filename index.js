require('dotenv').config();
const { Octokit } = require("@octokit/rest");
const { Client, EmbedBuilder, Partials } = require('discord.js');
const client = new Client({ 
  intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMessageReactions'],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, ],
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

octokit.hook.error("request", async (error, options) => {
  if (error.status === 404) {
    return false;
  }

  throw error;
});


client.on('ready', async () => {
  console.log(`Logged ina as ${client.user.tag}!`);
});
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.member.roles.cache.some(r => r.name === 'Contributor (Code)')) return;
  if (/#(\d{1,4})/g.test(message.content)) {
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
          .setFooter({ text: `#${pr.data.number} - ${prtype} - ${pr.data.user.login}` })

        message.channel.send({ embeds: [embed] });
      }
    });
  }
});

client.on('messageReactionAdd', async (messageReaction, user) => {

  let msg = !messageReaction.message.author ? await messageReaction.message.fetch() : messageReaction.message;
  if(msg.author.id !== client.user.id) return;
  if (messageReaction.emoji.name !== '❌') return;
  let member = await msg.guild.members.fetch(user.id);
  if (!member.roles.cache.some(r => r.name === 'Contributor (Code)')) return messageReaction.remove();
  messageReaction.message.delete();

});

client.login(process.env.DISCORD_TOKEN);