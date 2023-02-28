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
        if(pr.data.state === 'closed') {
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
              color = '#b87fff';
            }
          }
        } else if(pr.data.state === 'open') {
          if(pr.data.draft) {
            color = '#4f785b';
          } else {
            color = '#09b43a';
          }
        }
        let embed = new EmbedBuilder()
          .setTitle(`#${pr.data.number} - ${pr.data.title}`)
          .setDescription(pr.data.body)
          .setURL(pr.data.html_url)
          .setColor(color);

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