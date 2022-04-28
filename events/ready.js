
const { login } = require("../manga.js");

module.exports = {
    name: 'ready',
    isOnce: true,
    execute(client) {
        //client.user.setActivity('');
        console.log(`Ready! Logged in as ${client.user.tag}`);
        login();
    },
};