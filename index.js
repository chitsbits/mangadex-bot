const fs = require('node:fs');
const { Client, Collection, Intents } = require('discord.js');
const { pollUpdates, refreshSessionToken } = require("./manga.js");
const { BOT_TOKEN } = require("./config.json");

const bot = new Client({ intents: [Intents.FLAGS.GUILDS] });

// Retrieves commands from /commands and adds them to the bot client
bot.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.data.name, command);
}

// Retrieves events from /events and adds listeners to the bot client
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.isOnce) {
        bot.once(event.name, (...eventArgs) => event.execute(...eventArgs));
    } else {
        bot.on(event.name, (...eventArgs) => event.execute(...eventArgs));
    }
}

bot.login(BOT_TOKEN).then(async () => {
    let oldTime = new Date().toISOString().slice(0,19);
    const user = await bot.users.fetch(JSON.parse(fs.readFileSync("./config.json")).USER_ID);
    setInterval(async () => {
        try {
            const config = JSON.parse(fs.readFileSync("./config.json"));
            if (config.ENABLE_UPDATES) {
                console.log(`Polling for updates since ${oldTime}`);  
                await refreshSessionToken();          
                const updateEmbeds = await pollUpdates(oldTime);
                if (updateEmbeds.length > 0) user.send({ content: '\u200B', embeds: updateEmbeds});
            }
            oldTime = new Date().toISOString().slice(0,19);
        } catch (error) {
            console.log("There was an error with polling updates.");
        }
    }, 300000);
})
