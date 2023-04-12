module.exports.sendMessage = (message) => {
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
      if (pr.data.state === 'closed') {
        prtype = 'closed';
        color = '#ff6a69';
        if (pr.data.draft) {
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
      } else if (pr.data.state === 'open') {
        if (pr.data.draft) {
          prtype = 'draft';
          color = '#4f785b';
        } else {
          prtype = 'open';
          color = '#09b43a';
        }
      }
      let emoji = '';
      switch (prtype) {
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
};