const { MessageActionRow, MessageSelectMenu } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { searchManga } = require("../manga.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search for a Mangadex title')
        .addStringOption(option => 
            option.setName('title')
                .setDescription('The title to search')
                .setRequired(true)),

	async execute(interaction) {
        try {
            await interaction.deferReply();
            const searchString = interaction.options.getString('title');
            const query = new URLSearchParams(searchString);

            const searchResp = await searchManga(query);
            const mangaList = searchResp.data;
            
            // Cap results to 4, or lower if less than 4 results
            const numResults = (searchResp.total > 4) ? 4 : searchResp.total;

            // Return if no results
            if (numResults == 0) {
                interaction.editReply('No results.');
                return;
            }

            // Make an array of MessageSelectOptions 
            let menuArr = [];
            for (i = 0; i < numResults; ++i) {
                const title = mangaList[i].attributes.title.en.substring(0, 99);
                menuArr[i] = {
                    label: title,
                    value: mangaList[i].id
                };
            }

            // Make reply components
            const row = new MessageActionRow()
                .addComponents(
                    new MessageSelectMenu()
                        .setCustomId('search_result_menu')
                        .setPlaceholder('Select manga:')
                        .addOptions(menuArr)
                );

            interaction.editReply({content: `Search results:`, components: [row] });

        } catch (error) {
            console.error(error);
            interaction.editReply("There was an error.");
        }
	}
};