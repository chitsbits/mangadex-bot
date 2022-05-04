const { MessageEmbed } = require('discord.js');
const { default: axios } = require('axios');
const { MD_USERNAME, MD_PASSWORD } = require("./config.json");
const fs = require("fs");

const mdEndpoint = 'https://api.mangadex.org';
const uploadsEndpoint = 'https://uploads.mangadex.org';

async function login() {
    try {
        const resp = await axios.post(`${mdEndpoint}/auth/login`, {
            username: MD_USERNAME,
            password: MD_PASSWORD
        });
        const token = resp.data.token;
        writeConfigTokens(token.session, token.refresh);
        console.log("Successfully authenticated user!");
    } catch (error) {
        console.error(error);
        console.log("There was an error logging in");
    }
}
// Sends the refresh token to request a new session token.
// If it fails, then relog to get a new refresh token.
async function refreshSessionToken() {
    try {
        console.log("Attempting to get new session token");
        const resp = await axios.post(`${mdEndpoint}/auth/refresh`, {
            token: getConfigToken("REFRESH")
        });
        const tokens = resp.data.token;
        writeConfigTokens(tokens.session, tokens.refresh);       
        console.log("Got new session token");
    } catch (error) {
        console.error(error);
        console.log("There was an error getting a new session token");
        login();
    }
}
async function checkSessionToken() {
    try {
        const token = getConfigToken("SESSION");
        const resp = await axios.get(`${mdEndpoint}/auth/check` ,
        { headers: {"Authorization": `Bearer ${token}`}});
        console.log(`Checking session token: ${resp.data.isAuthenticated}`);
        return resp.data.isAuthenticated;
    } catch (error) {
        console.error(error);
    }
}
async function checkAuth() {
    if (!await checkSessionToken()) {
        await refreshSessionToken();
    }
}
async function getManga(mangaId) {
    try {
        const resp = await axios.get(
            `${mdEndpoint}/manga/${mangaId}?includes[]=author&includes[]=cover_art`);
        return resp.data.data;
    } catch (error) {
        console.error(error);
    }
}
async function searchManga(query) {
    try {
        const resp = await axios.get(`${mdEndpoint}/manga?title=${query}&limit=4`);
        console.log(`Response status: ${resp.status}`);
        return resp.data;
    } catch (error) {
        console.error(error);
    }
}
async function pollUpdates(lastPollTime) {
    const updates = await getFollowingUpdates(lastPollTime);
    return createUpdateAlertEmbeds(updates.data);
    
}
async function getFollowingUpdates(lastPollTime) {
    try {
        await checkAuth();
        const resp = await axios.get(`${mdEndpoint}/user/follows/manga/feed?limit=100`
        +`&${new URLSearchParams({createdAtSince: lastPollTime}).toString()}`
        +`&translatedLanguage%5B%5D=en`
        +`&includeFutureUpdates=0`
        +`&order%5BcreatedAt%5D=desc`
        +`&includes[]=manga`
        +`&includes[]=scanlation_group`, {
            headers: { "Authorization": `Bearer ${getConfigToken("SESSION")}`}
        });
        if (resp.data.total > 0) {
            console.log(resp.data);
        }
        return resp.data;
    } catch (error) {
        console.error(error);
        console.error(error.response.data.errors);
        console.log("Failed to fetch updates");
    }
}
async function getFollowingList() {
    try {
        await checkAuth();
        // MD query size limit is 100 entries
        const resp = await axios.get(`${mdEndpoint}/user/follows/manga?limit=100`, {
            headers: { "Authorization": `Bearer ${getConfigToken("SESSION")}`}
        });
        return resp.data
    } catch (error) {
        console.error(error);
        console.log("Failed to get following list");
    }
}
async function createUpdateAlertEmbeds(feedList) {
    let embeds = [];
    for (chapter of feedList) {
        const scanlator = chapter.relationships.find(obj => obj.type === 'scanlation_group');
        
        // Refrence expansion from chapter feeds don't expose a manga's cover, so another call is needed
        const manga = chapter.relationships.find(obj => obj.type === 'manga');
        const sourceManga = await getManga(manga.id);

        const cover = sourceManga.relationships.find(obj => obj.type === 'cover_art');
        const coverUrl = `${uploadsEndpoint}/covers/${manga.id}/${cover.attributes.fileName}.256.jpg`;

        // Take the manga's english title, or search for english alt title
        let enTitle = sourceManga.attributes.title.en;
        if (enTitle === undefined) {
            enTitle = sourceManga.attributes.altTitles.find(title => "en" in title).en;
        }
        // Omit chapter title if it doesn't exist
        const chapterTitle = (chapter.attributes.title == null) ? "" : `: ${chapter.attributes.title}`;

        const embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`${enTitle} - Chapter ${chapter.attributes.chapter} ${chapterTitle}`)
            .setDescription(`Scanlated by ${scanlator.attributes.name}`)
            .setURL(`https://mangadex.org/chapter/${chapter.id}`)
            .setImage(coverUrl)
            .setTimestamp()
            .setFooter({ text: 'Mangadex Bot', iconURL: 'https://i.imgur.com/wf3UqsY.jpg' });
        embeds.push(embed);
    }
    return embeds;
}
function createMangaListEmbed(mangaList, page) {
    try {
        // Cap results to 100, or lower if less than 100 results (MD API returns max of 100 results)
        const total = (mangaList.total > 100) ? 100 : mangaList.total;
        if (total == 0) {
            return new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Following list is empty.');
        }
        const firstIndex = page*12;
        const lastIndex = ((page*12) + 12 < total) ? (page*12) + 12 : total;
        if (firstIndex > total) {
            return new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Invalid page.');
        }
        const listFields = [];
        for (let i = firstIndex; i < lastIndex; ++i) {
            const manga = mangaList.data[i];
            // Take the english title, or search for english alt title
            let enTitle = manga.attributes.title.en;
            if (enTitle === undefined) {
                enTitle = manga.attributes.altTitles.find(title => "en" in title).en;
            }
            listFields[i] = { name: `${i+1}: ${enTitle}`, value: `[Link](https://mangadex.org/title/${manga.id})`, inline: true};
        }

        const mangaListEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('View list on MangaDex')
            .setURL('https://mangadex.org/titles/follows')
            .setAuthor({
                name: `${MD_USERNAME}'s following list`,
                iconURL: 'https://i.imgur.com/wf3UqsY.jpg',
                url: 'https://mangadex.org/user/me'
            })
            .setFields(listFields)
            .setTimestamp()
            .setFooter({ text: 'Mangadex Bot', iconURL: 'https://i.imgur.com/wf3UqsY.jpg' });

        return mangaListEmbed;
    } catch (error) {
        console.log(error);
    }

}
function createMangaSearchEmbed(manga) {
    try {
        console.log(manga.attributes);

        const cover = manga.relationships.find(obj => obj.type === 'cover_art');
        const author = manga.relationships.find(obj => obj.type === 'author');

        const coverUrl = `${uploadsEndpoint}/covers/${manga.id}/${cover.attributes.fileName}.512.jpg`;

        let enTitle = manga.attributes.title.en;
        if (enTitle === undefined) {
            enTitle = manga.attributes.altTitles.find(title => "en" in title).en;
        }

        const resultEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(enTitle)
            .setURL(`https://mangadex.org/title/${manga.id}`)
            .addFields(
                { name: 'Description', value: manga.attributes.description.en.substring(0,1024)},
                //{ name: '\u200B', value: '\u200B' },
                { name: 'Release year ', value: manga.attributes.year.toString(), inline: true },
                { name: 'Status ', value: manga.attributes.status, inline: true },
                { name: 'Author ', value: author.attributes.name, inline: true },
                { name: 'Demographic ', value: manga.attributes.publicationDemographic, inline: true },
                //{ name: 'Chapters: ', value: author.attributes.name, inline: true },
            )
            .setImage(coverUrl)
            .setTimestamp()
            .setFooter({ text: 'Mangadex Bot', iconURL: 'https://i.imgur.com/wf3UqsY.jpg' });
        return resultEmbed;
    } catch (error) {
        console.error(error);
        return new MessageEmbed()
            .setTitle("There was an error.");
    }
}
function writeConfigTokens(session, refresh) {
    const config = JSON.parse(fs.readFileSync("./config.json"));
    config.REFRESH = refresh;
    config.SESSION = session;
    fs.writeFileSync("./config.json", JSON.stringify(config));      
}
function getConfigToken(token) {
    const config = JSON.parse(fs.readFileSync("./config.json"));
    if (token === "REFRESH") return config.REFRESH;
    else return config.SESSION;
}

module.exports = {
    login,
    getManga,
    refreshSessionToken,
    searchManga,
    pollUpdates,
    getFollowingList,
    getFollowingUpdates,
    createMangaSearchEmbed,
    createMangaListEmbed
}

