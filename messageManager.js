const extractValidUsernames = usernames => {
    const matches = usernames.match(/@[^\s|@]*/g);
    return matches ? matches.filter(u => u !== '@pingchannelbot' && u !== '@') : [];
};

const joinUsernames = usernames => usernames.size > 0
    ? [...usernames].join(' ')
    : 'No usernames added.';

const extractUniqueUsernames = (message, usernames) => {
    if (message.new_chat_participant) {
        if (message.new_chat_participant.username)
            usernames += ` @${message.new_chat_participant.username}`;
    } else if (message.text) {
        usernames += ' ' + message.text;
    }

    let users = extractValidUsernames(usernames);

    if (message.left_chat_participant) {
        if (message.left_chat_participant.username) {
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
    isPingAll: text => text.toLocaleLowerCase().indexOf('/channel') > -1
        || text.toLocaleLowerCase().indexOf('/here') > -1,
    isPing: text => text.toLocaleLowerCase().indexOf('/ping') > -1,
    isClear: text => text.toLocaleLowerCase().indexOf('/clear') > -1,
    isReadTeams: text => text.toLocaleLowerCase().indexOf('/teams') > -1,
    isSetTeam: text => text.toLocaleLowerCase().indexOf('/team') > -1,
    isReplyToSetUsers: msg => msg.reply_to_message && msg.reply_to_message.text.indexOf('Which users do you want to add?') > -1,
    isReplyToSetTeamName: msg => msg.reply_to_message && msg.reply_to_message.text.indexOf(`What's the name of the team?`) > -1,
    isReplyToSetTeamUsers: msg => msg.reply_to_message && msg.reply_to_message.text.indexOf('Which users will be part of') > -1,
};
