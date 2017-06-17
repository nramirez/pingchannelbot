const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const messageManager = require('./messageManager');
const telegramManager = require('./telegramManager');
const firebase = require('firebase');
const config = require('./config');
var mixpanel = require('mixpanel').init(config.mixpanelToken);
var moment = require('moment');

firebase.initializeApp(config.firebase);
const db = firebase.database();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/new-message', (req, res) => {
  const { message } = req.body;

  if (!message) {
    // In case a message is not present, or if our message does not have the word marco in it, do nothing and return an empty response
    return res.end('Error: message is undefined');
  }

  // Somehow we're getting a message with { message: [knownObject], update_id: 32413}
  // We're only interested in the message object
  if (message.message)
    message = message.message;

  let allowedDate = moment().add(-5, 'm');
  const messageDate = moment.unix(message.date);
  const shouldProcess = messageDate > allowedDate;

  mixpanel.track('new-message', {
    shouldProcess: shouldProcess,
    message: message
  });

  if (!shouldProcess) {
    return res.end('Message rejected because it is too old');
  }

  try {
    const chatId = message.chat.id;
    const ref = db.ref(`chats/${chatId}/`);
    ref.once('value').then(snapshot => {
      const chat = snapshot.val();
      const usernames = chat && chat.usernames ? chat.usernames : '';

      if (chat && chat.message_id && chat.message_id > message.message_id) {
        console.log('Discarding... This is an older message', chat.message_id, message.message_id);
        return res.end('Discarding... This is an older message', chat.message_id, message.message_id);
      }

      if (messageManager.isCommand(message.entities)) {
        if (messageManager.isSet(message.text)) {
          setUsernames(message, chatId, usernames, ref, res);
        } else if (messageManager.isPing(message.text)) {
          pingAll(chatId, usernames || 'No usernames added. Use set command to add them.', res);
        } else if (messageManager.isClear(message.text)) {
          clearUsernames(message, chatId, ref, res);
        }
      } else if (message.new_chat_participant || message.left_chat_participant) {
        addOrRemoveParticipant(message, chatId, usernames, ref, res);
      }
    }, error => {
      console.log('Error reading db:', error);
      return res.end('Error reading db:', error);
    });
  } catch (err) {
    telegramManager.talkToBot(chatId, `Sorry we didn't get that`);
    return res.end('Error somewhere: ', err);
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
        ref.update({
          'message_id': message.message_id,
          'usernames': messageManager.extractUniqueUsernames(message, usernames),
        }).then(m => {
          telegramManager.talkToBot(chatId, 'Usernames added.').then(() => {
            res.end('Updated message:', m);
          }, err => {
            console.log(err);
            res.end('Error: ', err);
          });
        }, e => {
          console.log('Error updating db:', e);
          res.end('Error updating db:', e);
        });
      } else {
        telegramManager.talkToBot(chatId, 'This action is only allowed for admins.').then(() => {
          res.end('This action is only allowed for admins.');
        }, err => {
          console.log(err);
          res.end('Error: ', err);
        });
      }
    }, err => {
      console.log(err);
      res.end('Error: ', err);
    });
  } else {
    console.log('Error message.from is undefined');
    res.end('Error message.from is undefined');
  }
};

const pingAll = (chatId, text, res) => {
  telegramManager.talkToBot(chatId, text).then(() => {
    res.end('Message posted!');
  }, err => {
    console.log(err);
    res.end('Error: ', err);
  });
};

const clearUsernames = (message, chatId, ref, res) => {
  if (message.from) {
    telegramManager.getChatAdministrators(chatId).then(({ data }) => {
      if (isAdmin(data.result, message.from.username)) {
        ref.set({
          usernames: '',
        });
        telegramManager.talkToBot(chatId, 'All cleared.').then(() => {
          res.end('All cleared.');
        }, err => {
          console.log(err);
          res.end('Error: ', err);
        });
      } else {
        telegramManager.talkToBot(chatId, 'This action is only allowed for admins.').then(() => {
          res.end('This action is only allowed for admins.');
        }, err => {
          console.log(err);
          res.end('Error: ', err);
        });
      }
    }, err => {
      console.log(err);
      res.end('Error: ', err);
    });
  } else {
    console.log('Error message.from is undefined');
    res.end('Error message.from is undefined');
  }
};

const addOrRemoveParticipant = (message, chatId, usernames, ref, res) => {
  ref.set({
    'usernames': messageManager.extractUniqueUsernames(message, usernames),
  });

  const msg = message.new_chat_participant ?
    `${message.new_chat_participant.username} was added to the list.` :
    `${message.left_chat_participant.username} was removed from the list.`;

  telegramManager.talkToBot(chatId, msg).then(() => {
    res.end(msg);
  }, err => {
    console.log(err);
    res.end('Error: ', err);
  });
};