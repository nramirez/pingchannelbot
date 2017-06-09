const botRelatedUserNames = ['/set', 'pingchannelbot', '/ping'];
const stripOutBotRelatedUserNames = usernames => {
    return usernames.filter(u => botRelatedUserNames.indexOf(u) === -1);
};

const extractValidUsernames = usernames => {
    const users = usernames.split(/(\s+)|@/g).filter(u => !!u)
        .filter(u => u.trim() !== '');

    const validUsernames = stripOutBotRelatedUserNames(users);
    return validUsernames.map(v => `@${v}`.toLocaleLowerCase());
};

const removeUsername = (usernames, user) => {
    const users = usernames.split(/(\s+)|@/g).filter(u => !!u)
        .filter(u => u.trim() !== '');
    users.filter(u => u.indexOf(user.toLocaleLowerCase()) === -1);
    return users.map(v => `@${v}`.toLocaleLowerCase());
};

const joinUsernames = usernames => {
    return usernames.size > 0 ? [...usernames].join(' ') : 'No usernames added.';
};

const extractUniqueUsernames = (message, usernames) => {
    if (message.new_chat_participant) {
        usernames += ' ' + message.new_chat_participant.username;
    } else if (message.text) {
        usernames += ' ' + message.text;
    }

    let users = [];
    if (message.left_chat_participant) {
        users = removeUsername(usernames, message.left_chat_participant.username);
    } else {
        users = extractValidUsernames(usernames);
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
    isPing: text => text.toLocaleLowerCase().indexOf('/ping') > -1,
    isClear: text => text.toLocaleLowerCase().indexOf('/clear') > -1
}