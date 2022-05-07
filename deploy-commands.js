const fs = require('node:fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config()

const cliArgs = process.argv.slice(2);

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

// Register commands globally
if (cliArgs.includes('-g')) {
    rest.put(Routes.applicationCommands(process.env.BOT_CLIENT_ID), { body: commands })
        .then(() => console.log('Successfully registered application commands globally.'))
        .catch(console.error);
}
// Register commands in dev guild
else {    
    rest.put(Routes.applicationGuildCommands(process.env.BOT_CLIENT_ID, process.env.DEV_GUILD_ID), { body: commands })
        .then(() => console.log('Successfully registered application guild commands.'))
        .catch(console.error);
}