const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require("fs");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('toggleupdates')
		.setDescription('Enable or disable chapter update DMs')
        .addStringOption(option => 
            option.setName('enablement')
                .setDescription('On/off')
                .setRequired(true)
                .addChoice('On', 'on')
                .addChoice('Off', 'off')),
	async execute(interaction) {
        try {
            await interaction.deferReply();
            const config = JSON.parse(fs.readFileSync("./config.json"));
            config.ENABLE_UPDATES = (interaction.options.getString('enablement') === 'on') ? true : false;
            fs.writeFileSync("./config.json", JSON.stringify(config)); 
            console.log(`Enable updates set to ${config.ENABLE_UPDATES}`);
            interaction.editReply(`Update notifications set to ${config.ENABLE_UPDATES}`);
        } catch (error) {
            console.error(error);
            interaction.editReply("There was an error.");
        }
	}
};