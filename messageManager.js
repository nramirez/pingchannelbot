const botRelatedUserNames = ['/setusernames', 'setusernames', 'pingchannelbot'];
const stripOutBotRelatedUserNames = (usernames) => {
    return usernames.filter(u => botRelatedUserNames.indexOf(u) === -1);
};
const stripOutUserNames = (message) => {
    const usernames = message.split('@').map(u => u.trim());
    const validUsernames = stripOutBotRelatedUserNames(usernames);
    return validUsernames.map(v => `@${v}`);
}
const extractMessageText = (message) => {
    let usernames = [];
    if (message.new_chat_participant) {
        usernames = stripOutUserNames(message.new_chat_participant.username);
    } else if (message.left_chat_participant) {
        usernames = stripOutUserNames(message.left_chat_participant.username);
    } else if (message.chat && message.chat.text) {
        usernames = stripOutUserNames(message.chat.text);
    }

    return usernames.length > 0 ? usernames : `Sorry we didn't get that.`;
};


const processMessage = (message, chats) => {
    const sentMessageUrl = `https://api.telegram.org/bot${process.env.API_ID}/sendMessage`;

    if (chats[message.chat.id] && chats[message.chat.id].usernames) {
        chats[message.chat.id].usernames.add(...extractMessageText(message));
    } else {
        if (!chats[message.chat.id])
            chats[message.chat.id] = {};

        chats[message.chat.id].usernames = new Set(extractMessageText(message));
    }
};


module.exports = {
    extractMessageText,
    processMessage: (m, c) => processMessage(m, c)
};