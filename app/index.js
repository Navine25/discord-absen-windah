// Require the necessary discord.js classes
require("dotenv").config();
const { Client, Intents, Util } = require("discord.js");
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { QuickDB } = require("quick.db");
const { CommandInteraction } = require("discord.js");
const NewsAPI = require("newsapi");
const newsapi = new NewsAPI(process.env.NEWSAPI);
client.db = new QuickDB();
client.request = new (require("rss-parser"))();
client.config = require("../config.json");
let dateTime = new Date();
let today =
  dateTime.getFullYear() + "-" + dateTime.getMonth() + "-" + dateTime.getDate();
const { SlashCommandBuilder } = require("@discordjs/builders");

const rest = new REST({ version: "9" }).setToken(process.env.TOKEN);

const command = new SlashCommandBuilder()
  .setName("news")
  .setDescription("Find news in Indonesian")
  .addStringOption((option) =>
    option
      .setName("category")
      .setDescription(
        "business | entertainment | general | health | science | sports | technology"
      )
      .setRequired(true)
      .addChoices(
        { name: "business", value: "business" },
        { name: "general", value: "general" },
        { name: "health", value: "health" },
        { name: "science", value: "science" },
        { name: "entertaintment", value: "entertaintment" },
        { name: "sports", value: "sports" },
        { name: "technology", value: "technology" }
      )
  )
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("what you want to search")
      .setRequired(false)
  );

// -------------- MANY SUBCOMMAND------------------
// const command = new SlashCommandBuilder()
//   .setName("news")
//   .setDescription("Find news in Indonesian")
//   .addSubcommand((subcommand) =>
//     subcommand
//       .setName("business")
//       .setDescription("Business News")
//       .addUserOption((option) =>
//         option.setName("target").setDescription("The user")
//       )
//   )
//   .addSubcommand((subcommand) =>
//     subcommand.setName("entertainment").setDescription("Entertaintment News")
//   );

// When the client is ready, run this code (only once)
client.on("ready", async () => {
  console.log("Ready!");
  console.log(today);
  const testGuildId = ["984074920269053982", "908632787874091038"];
  testGuildId.map(async (guildId) => {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
      body: [command.toJSON()],
    });
  });
  await handleUpload();
});

// client.on("messageCreate", async (msg) => {
//   let search = "";
//   let category = "";
//   if (msg.content.startsWith("h!news")) search = msg.content.split(" ");
//   console.log(search.length);
//   search = search[1];
//   searchNews({ msg: search });
// });

client.on("interactionCreate", (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "news")
    searchNews({
      msg: interaction.options.getString("query"),
      category: interaction.options.getString("category"),
      interaction: interaction,
    });
});

function handleUpload() {
  if (client.db.get(`postedVideos`) === null) client.db.set(`postedVideos`, []);
  setInterval(async () => {
    for (let index = 0; index < client.config.channel_id.length; index++) {
      const client_request = await client.request.parseURL(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${client.config.channel_id[index]}`
      );
      const re = await client.db.get(`postedVideos`);
      console.log(re, "re"); // null
      if (re != null && re.includes(client_request.items[0].link)) return;
      else {
        await client.db.set(`videoData`, client_request.items[0]);
        await client.db.push("postedVideos", client_request.items[0].link);
        let parsed = await client.db.get(`videoData`);
        console.log("Parsed:", parsed);
        let channel = client.channels.cache.get(client.config.channel);
        if (!channel) return;
        if (parsed) {
          console.log("Release Discord:", parsed.title);
          let message = client.config.messageTemplate
            .replace(/{author}/g, parsed.author)
            .replace(/{title}/g, Util.escapeMarkdown(parsed.title))
            .replace(/{url}/g, parsed.link);
          channel.send(message);
        }
      }
    }
  }, client.config.watchInterval);
}

function searchNews({ msg, category, interaction }) {
  newsapi.v2
    .topHeadlines({
      q: msg ?? "",
      category: category,
      from: today,
      to: today,
      country: "id",
    })
    .then((response) => {
      let channel = client.channels.cache.get(client.config.channel);
      if (!channel) return;
      if (response.articles.length > 10)
        newsGot = response.articles.slice(0, 10);
      else newsGot = response.articles;
      console.log(newsGot);
      const clientChannel = client.channels.cache.get(interaction.channelId);
      for (let index = 0; index < newsGot.length; index++) {
        let embed = {
          title: newsGot[index].title,
          description: newsGot[index].description,
          url: newsGot[index].url,
          color: 5814783,
          author: {
            name: (index+1) + ". " + newsGot[index].source.name,
            "icon_url": "https://i.pinimg.com/474x/a4/4d/35/a44d35320a5f87e42dd0c158c25941aa.jpg"
          },
          image: {
            url: newsGot[index].urlToImage ?? "https://i.pinimg.com/474x/a4/4d/35/a44d35320a5f87e42dd0c158c25941aa.jpg",
          },
          "footer": {
            "text": "by Hehe Bot"
          },
          "timestamp": today,
        };
        clientChannel.send({ embeds: [embed] });
      }
      interaction.reply("Top 10 news in category");
    })
    .catch((err) => console.log(err));
}

// Login to Discord with your client's token
client.login(process.env.TOKEN);
