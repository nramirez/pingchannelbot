const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const messageManager = require('./messageManager');
const telegramManager = require('./telegramManager');
const firebase = require('firebase');
const config = require('./config');
const mixpanel = require('mixpanel').init(config.mixpanelToken);
const moment = require('moment');

firebase.initializeApp(config.firebase);
const db = firebase.database();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/new-message', (req, res) => {
  const { message } = req.body;

  if (!message) {
    mixpanel.track('message not present: ', { body: req.body });

    return res.end('Error: message is undefined');
  }

  // Somehow we're getting a message with { message: [knownObject], update_id: 32413}
  // We're only interested in the message object
  if (message.message) {
    mixpanel.track('unexpected inner message', { message: message });
    message = message.message;
  }

  let allowedDate = moment().add(-5, 'm');
  const messageDate = moment.unix(message.date);
  const shouldProcess = messageDate > allowedDate;

  mixpanel.track('new-message', {
    shouldProcess: shouldProcess,
    message: message
  });

  if (!shouldProcess) {
    mixpanel.track('Message rejected due to old date', { messageDate, allowedDate, message });
    return res.end('Message rejected due to old date');
  }

  try {
    const chatId = message.chat.id;
    const ref = db.ref(`chats/${chatId}/`);
    ref.once('value').then(snapshot => {
      const chat = snapshot.val();
      const usernames = chat && chat.usernames ? chat.usernames : '';

      if (chat && chat.message_id && chat.message_id > message.message_id) {
        mixpanel.track('Message rejected due to old chat id', {
          chat_message_id: chat.message_id,
          message: message
        });
        return res.end('Message rejected due to old chat id', chat.message_id, message.message_id);
      }

      if (messageManager.isCommand(message.entities)) {
        if (messageManager.isSet(message.text)) {
          setUsernames(message, chatId, usernames, ref, res);
        } else if (messageManager.isPingAll(message.text)) {
          return pingAll(chatId, usernames || 'No usernames added. Use set command to add them.', res);
        } else if (messageManager.isPing(message.text)) {
          return pingTeam(message, chatId, chat, res);
        } else if (messageManager.isClear(message.text)) {
          clearUsernames(message, chatId, ref, res);
        } else if (messageManager.isReadTeams(message.text)) {
          return readTeams(chatId, chat, res);
        } else if (messageManager.isSetTeam(message.text)) {
          return setTeam(message, chatId, ref, res);
        }
      } else if (messageManager.isReplyToSetTeamName(message)) {
        message.text = '/team ' + message.text;
        return setTeam(message, chatId, ref, res);
      } else if (messageManager.isReplyToSetTeamUsers(message)) {
        // Which users will be part of teamName?
        const text = message.reply_to_message.text;
        const teamName = text.substring(28, text.length - 1);
        message.text = `/team ${teamName} ${message.text}`;
        return setTeam(message, chatId, ref, res);
      } else if (message.new_chat_participant || message.left_chat_participant) {
        return addOrRemoveParticipant(message, chatId, usernames, ref, res);
      }
    }).catch(e => {
      mixpanel.track('Error reading chat from db', { e });
      return res.end('Error reading chat from db', { e });
    });
  } catch (e) {
    mixpanel.track('Error processing message', { e, message });
    telegramManager.talkToBot(chatId, `Sorry we didn't get that`);
    return res.end('Error somewhere: ', e);
  };

  return res.end('end of the request');
});

app.get('/', (req, res) => {
  res.send('Bot up and running!');
});

app.listen(config.currentPort, () => {
  console.log(`Telegram app listening on port ${config.currentPort}!`);
});

const isAdmin = (admins, user) => admins.filter(admin => admin.user.username === user).length > 0;

const setUsernames = (message, chatId, usernames, ref, res) => {
  if (message.from) {
    telegramManager.getChatAdministrators(chatId).then(({ data }) => {
      if (isAdmin(data.result, message.from.username)) {
        const users = messageManager.extractUniqueUsernames(message, usernames);

        if(users !== usernames) {
          ref.update({
            message_id: message.message_id,
            usernames: users,
          }).then(m => {
            telegramManager.talkToBot(chatId, 'Usernames added.')
              .then(() => {
                mixpanel.track('talkToBot setUsernames', { users, message });
                res.end('Updated message:', m);
              })
              .catch(e => {
                mixpanel.track('Error talkToBot setUsernames', { e, message });
                res.end('Error updating db usernames ', e);
              });
          }).catch(e => {
            mixpanel.track('Error setUsernames getChatAdministrators', { e, chatId, message });
            return res.end('Error setUsernames getChatAdministrators', e);
          });
        } else {
          telegramManager.talkToBot(chatId, 'Please, specify usernames to be added.')
            .then(() => {
              mixpanel.track('talkToBot setUsernames no usernames specified', { chatId, message });
              res.end('Please, specify usernames to be added.');
            }).catch(e => {
              mixpanel.track('Error talkToBot setUsernames Admin Only', { e, chatId, message });
              res.end('Error: ', e);
            });
        }
      } else {
        telegramManager.talkToBot(chatId, 'This action is only allowed for admins.')
          .then(() => {
            mixpanel.track('talkToBot setUsernames Admin Only', { chatId, message });
            res.end('This action is only allowed for admins.');
          }).catch(e => {
            mixpanel.track('Error talkToBot setUsernames Admin Only', { e, chatId, message });
            res.end('Error: ', e);
          });
      }
    }).catch(e => {
      mixpanel.track('Error setUsernames getChatAdministrators', { e, chatId, message });
      res.end('Error setUsernames getChatAdministrators', err);
    });
  } else {
    mixpanel.track('setUsernames undefined message.from', { chatId, message });
    res.end('Error message.from is undefined');
  }
};

const pingAll = (chatId, text, res) => {
  telegramManager.talkToBot(chatId, text)
    .then(() => {
      mixpanel.track('talkToBot PingAll', { chatId, text });
      return res.end('Message posted!');
    }).catch(e => {
      mixpanel.track('Error talkToBot PingAll', { e, chatId, text });
      return res.end('Error talkToBot PingAll', e);
    });
};

const pingTeam = (message, chatId, chat, res) => {
  // /ping team-name
  let substrIndex = 5;
  if (message.text.indexOf('/ping@pingchannelbot') === 0) {
    substrIndex = 20;
  }
  const teamName = message.text.substr(substrIndex).trim().toLowerCase();
  let msg = 'No users in this team.';
  if (!teamName) {
    msg = 'Please specify the name of the team';
  } else if (!chat[teamName].users)
    msg = 'No users in this team.';
  else {
    msg = chat[teamName].users;
  }

  telegramManager.talkToBot(chatId, msg)
    .then(() => {
      mixpanel.track('talkToBot pingTeam', { chatId, msg });
      return res.end('Message posted!', chatId, msg)
    }).catch(e => {
      mixpanel.track('Error talkToBot pingTeam', { chatId, messsage });
      return res.end('Error: ', e);
    });
};

const clearUsernames = (message, chatId, ref, res) => {
  if (message.from) {
    telegramManager.getChatAdministrators(chatId)
      .then(({ data }) => {
        if (isAdmin(data.result, message.from.username)) {
          ref.set({
            usernames: '',
          });
          telegramManager.talkToBot(chatId, 'All cleared.').then(() => {
            mixpanel.track('talkToBot clearUsernames', { chatId, message });
            return res.end('All cleared.');
          }).catch(e => {
            mixpanel.track('Error talkToBot clearUsernames', { chatId, message });
            return res.end('Error: ', e);
          });
        } else {
          telegramManager.talkToBot(chatId, 'This action is only allowed for admins.').then(() => {
            mixpanel.track('talkToBot clearUsernames Admin Only', { chatId, message });
            res.end('This action is only allowed for admins.');
          }).catch(e => {
            mixpanel.track('Error talkToBot clearUsernames Admin Only', { e, message });
            res.end('Error talkToBot clearUsernames Admin Only', e);
          });
        }
      }).catch(e => {
        mixpanel.track('Error clearUsernames getChatAdministrators', { chatId, message });
        res.end('Error: ', e);
      });
  } else {
    mixpanel.track('clearUsernames undefined message.from', { chatId, message });
    res.end('Error clearUsernames undefined message.from');
  }
};

const addOrRemoveParticipant = (message, chatId, usernames, ref, res) => {
  const isValid = ((
        message.new_chat_participant &&
        message.new_chat_participant.username &&
        message.new_chat_participant.username.indexOf('pingchannelbot') < 0) ||
      (
        message.left_chat_participant &&
        message.left_chat_participant.username &&
        message.left_chat_participant.username.indexOf('pingchannelbot') < 0
      ));

  if (!isValid)
    return res.end('Undefined username');

  ref.set({
    'usernames': messageManager.extractUniqueUsernames(message, usernames),
  });

  const msg = message.new_chat_participant ?
    `${message.new_chat_participant.username} was added to the list.` :
    `${message.left_chat_participant.username} was removed from the list.`;

  telegramManager.talkToBot(chatId, msg).then(() => {
    mixpanel.track('talkToBot addOrRemoveParticipant', { chatId, message, msg });
    return res.end(msg);
  }).catch(e => {
    mixpanel.track('Error talkToBot addOrRemoveParticipant', { chatId, message, msg });
    return res.end('Error talkToBot addOrRemoveParticipant: ', e);
  });
};

const readTeams = (chatId, chat, res) => {
  const teams = Object.keys(chat)
                  .filter(t => t !== 'usernames')
                  .map(team => chat[team].name)
                  .join('\n');
  const message = `Teams:\n ${teams}`;                  
  telegramManager.talkToBot(chatId, message)
    .then(t => {
      mixpanel.track('talkToBot readTeams', { chatId, teams });
      res.end('Team list displayed', t);
    }).catch(e => {
      mixpanel.track('Error talkToBot readTeams', { chatId, teams });
      res.end('Team list error', e);
    });
};

const _setTeam = (message, chatId, ref, res) => {
  // remove '/team' from the text which length = 5
  let substrIndex = 5;
  if (message.text.indexOf('/team@pingchannelbot') === 0) {
    substrIndex = 20;
  }
  const text = message.text.substr(substrIndex).trim();
  const emptyIndex = text.indexOf(' ');
  const teamName = emptyIndex < 0 ? text : text.substr(0, emptyIndex);
  const teamUsers = emptyIndex > -1 ? text.substr(emptyIndex + 1).trim() : '';

  if (!teamName) {
    telegramManager.talkToBot(chatId, `What's the name of the team?`)
      .then(t => {
        mixpanel.track('talkToBot _setTeam: Team name required', { chatId });
        return res.end('Name of the team required', t)
      }).catch(e => {
        mixpanel.track('Error talkToBot _setTeam: team required', { chatId, teams });
        res.end('Error talkToBot _setTeam: team required', e);
      });
    return;
  }

  try {
    const users = messageManager.extractUniqueUsernames(message, teamUsers);
    const botMessage = `Team: ${teamName} created.\nYou can now do \`/ping ${teamName}\` to notify all the users in this team`;
    let update = {
      message_id: message.message_id,
      [teamName.toLowerCase()]: {}
    };
    update[teamName.toLowerCase()].name = teamName;
    update[teamName.toLowerCase()].users = users;
    ref.update(update).then(m => {
      telegramManager.talkToBot(chatId, botMessage)
        .then(() => {
          mixpanel.track('setTeam', { chatId, m });
          return res.end('Team updated:', m);
        }).catch(e => {
          mixpanel.track('Error talkToBot setTeam', { e, message });
          return res.end('Error talkToBot setTeam', e);
        });
    }).catch(e => {
      mixpanel.track('Error setTeam db update', { chatId, m, e });
      return res.end('Error setTeam db update', e);
    });
  } catch (e) {
    return telegramManager.talkToBot(chatId, `Which users will be part of ${teamName}?`)
      .then(t => {
        mixpanel.track('talkToBot setTeam:usernames', { chatId, e, t });
        return res.end('talkToBot setTeam:usernames', t);
      }).catch(e => {
        mixpanel.track('Error talkToBot setTeam:usernames', { chatId, e, t });
        res.end('Error talkToBot setTeam:usernames', chatId, e, t);
      });
  }
}

const setTeam = (message, chatId, ref, res) => {
  if (message.from) {
    telegramManager.getChatAdministrators(chatId).then(({ data }) => {
      if (isAdmin(data.result, message.from.username)) {
        return _setTeam(message, chatId, ref, res);
      } else {
        mixpanel.track('setTeam  Admin Only', { chatId, message });
        return res.end('setTeam  Admin Only', e);
      }
    }).catch(e => {
      mixpanel.track('talkToBot setTeam Admin Only', { chatId, message });
      return res.end('talkToBot setTeam Admin Only', e);
    });
  } else {
    mixpanel.track('setTeam undefined message.from', { chatId, message });
    return res.end('setTeam undefined message.from');
  }
};