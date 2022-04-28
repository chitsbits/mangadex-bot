const { MessageButton, MessageActionRow, MessageEmbed } = require('discord.js');
const { getManga, getFollowingList, createMangaSearchEmbed, createMangaListEmbed } = require('../manga.js');
const fs = require("fs");

module.exports = {
	name: 'interactionCreate',
	async execute(interaction) {
        console.log(`Interaction caught: ${interaction}`);
        const userId = JSON.parse(fs.readFileSync("./config.json")).USER_ID;
        if (interaction.user.id != userId) return;

		if (interaction.isCommand()) {
            console.log('interaction is command');
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) return;
    
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
        else if (interaction.isButton()) {
            console.log('interaction is button');
            if (interaction.customId === 'testButton') {
                const buttonRow = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('testButton')
                        .setLabel('~daddy~')
                        .setStyle('PRIMARY')
                        .setEmoji('😩')
                );
                await interaction.update({content: 'AMONG US', components: [buttonRow]});
            }
            else if (interaction.customId.slice(0, 10) === 'pageChange') {
                const page = parseInt(interaction.customId.slice(10));
                const followingList = await getFollowingList();
                const followingListEmbed = createMangaListEmbed(followingList, page)

                const buttonRow = new MessageActionRow();
                const prevButton = new MessageButton()
                    .setCustomId(`pageChange${page-1}`)
                    .setLabel('Previous')
                    .setStyle('PRIMARY')
                const nextButton = new MessageButton()
                    .setCustomId(`pageChange${page+1}`)
                    .setLabel('Next')
                    .setStyle('PRIMARY');

                if ((page-1) * 12 < 0) prevButton.setDisabled(true);
                if ((page+1) * 12 > followingList.total) nextButton.setDisabled(true);

                buttonRow.addComponents(prevButton, nextButton);
                await interaction.update({ content: '\u200b', embeds: [followingListEmbed], components: [buttonRow]});
            }
        }
        else if (interaction.isSelectMenu()) {
            console.log('interaction is select menu');

            if (interaction.customId === 'testSelect') {
                const resultEmbed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('example result from menu')
                    .setURL('https://discord.js.org')
                    .setDescription('example description');
                await interaction.update({ content: 'Your results:', embeds: [resultEmbed], components: [] });
            }
            else if (interaction.customId === 'search_result_menu') {

                const mangaId = interaction.values[0];
                const embed = createMangaSearchEmbed(await getManga(mangaId));
                await interaction.update({ content: '\u200b', embeds: [embed], components: []});

            }
        }
	},
};
