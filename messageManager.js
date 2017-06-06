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
    } else if (message.text) {
        usernames = stripOutUserNames(message.text);
    }

    if(usernames.length > 0) 
        return usernames;
    else 
        throw `Sorry we didn't get that.`;
};

const isCommand = (entities) => {
    return !!entities.find(e => e.type === 'bot_command');
};

const isSet = (text) => {
    return text.toLocaleLowerCase().indexOf('/set') > -1;
};

const isPing = (text) => {
    return text.toLocaleLowerCase().indexOf('/ping') > -1;
};

const isClear = (text) => {
    return text.toLocaleLowerCase().indexOf('/clear') > -1;
};

const joinUsernames = (usernames) => {
    return usernames.size > 0 ? [...usernames].join(' ') : 'No usernames added.';
};

const processMessage = (message, chats) => {
    if (isCommand(message.entities)) {
        if (isSet(message.text)) {
            if (chats[message.chat.id] && chats[message.chat.id].usernames) {
                chats[message.chat.id].usernames.add(...extractMessageText(message));
            } else {
                if (!chats[message.chat.id])
                    chats[message.chat.id] = {};

                chats[message.chat.id].usernames = new Set(extractMessageText(message));
            }
            return joinUsernames(chats[message.chat.id].usernames);
        } else if (isPing(message.text)) {
            return joinUsernames(chats[message.chat.id].usernames);
        } else if (isClear(message.text)) {
            chats[message.chat.id].usernames.clear();
            return 'All usernames were cleared.';
        }
    }
};


module.exports = {
    extractMessageText,
    processMessage: (m, c) => processMessage(m, c)
};
