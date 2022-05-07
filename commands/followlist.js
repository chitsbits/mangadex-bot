const { MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { getFollowingList, createMangaListEmbed} = require("../manga.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('followlist')
		.setDescription('Display your following list'),
	async execute(interaction) {
        try {
            await interaction.deferReply();
            const followingList = await getFollowingList();
            const followingListEmbed = createMangaListEmbed(followingList, 0);

            const buttonRow = new MessageActionRow();
            const prevButton = new MessageButton()
                .setCustomId('pageUnused')
                .setLabel('Previous')
                .setStyle('PRIMARY')
                .setDisabled(true);
            const nextButton = new MessageButton()
                .setCustomId('pageChange1')
                .setLabel('Next')
                .setStyle('PRIMARY');
            if (followingList.total < 12) nextButton.setDisabled(true);

            buttonRow.addComponents(prevButton, nextButton);
            await interaction.editReply({ content: '\u200b', embeds: [followingListEmbed], components: [buttonRow]});

        } catch (error) {
            console.error(error);
            interaction.editReply("There was an error.");
        }
	}
};