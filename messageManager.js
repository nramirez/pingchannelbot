const extractValidUsernames = usernames => {
    const matches = usernames.match(/@[^\s|@]*/g);
    return matches ? matches.filter(u => u !== '@pingchannelbot') : [];
};

const joinUsernames = usernames => usernames.size > 0
    ? [...usernames].join(' ')
    : 'No usernames added.';

const extractUniqueUsernames = (message, usernames) => {
    if (message.new_chat_participant) {
        if(message.new_chat_participant.username)
            usernames += ` @${message.new_chat_participant.username}`;
    } else if (message.text) {
        usernames += ' ' + message.text;
    }

    let users = extractValidUsernames(usernames);

    if (message.left_chat_participant) {
        if(message.left_chat_participant.username) {
            users = users.filter(u => u !== `@${message.left_chat_participant.username}`);
        }
    }

    if (users.length > 0)
        return joinUsernames(new Set(users));
    else
        throw `Sorry we didn't get that.`;
};

module.exports = {
    extractUniqueUsernames,
    isCommand: entities => entities && entities.filter(e => e.type === 'bot_command').length,
    isSet: text => text.toLocaleLowerCase().indexOf('/set') > -1,
    isPing: text => (text.toLocaleLowerCase().indexOf('/ping') > -1 ||
        text.toLocaleLowerCase().indexOf('/channel') > -1 ||
        text.toLocaleLowerCase().indexOf('/here') > -1),
    isClear: text => text.toLocaleLowerCase().indexOf('/clear') > -1,
};
