var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const axios = require('axios');
const messageManager = require('./messageManager');
var firebase = require('firebase');
require('dotenv').config();

var config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: 'pingchannelbot.firebaseapp.com',
  databaseURL: 'https://pingchannelbot.firebaseio.com',
  storageBucket: 'pingchannelbot.appspot.com',
};

firebase.initializeApp(config);
const db = firebase.database();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
})); // for parsing application/x-www-form-urlencoded

const talkToBot = (chatId, text, res) => {
  axios.post(`https://api.telegram.org/bot${process.env.API_ID}/sendMessage`, {
    chat_id: chatId,
    text: text
  }).then(response => {
    // We get here if the message was successfully posted
    console.log('Message posted')
    res.end('ok');
  }).catch(err => {
    // ...and here if it was not
    console.log('Error posting to chat:', err);
    res.end('Error posting to chat:' + err);
  });
}

app.post('/new-message', (req, res) => {
  console.log(JSON.stringify(req.body));
  const { message } = req.body;
  //Each message contains 'text' and a 'chat' object, which has an 'id' which is the chat id

  if (!message) {
    // In case a message is not present, or if our message does not have the word marco in it, do nothing and return an empty response
    return res.end('Error: message is undefined');
  }
  //TODO: is this really a thing?
  // Somehow we're getting a message with { message: [knownObject], update_id: 32413}
  // We're only interested in the message object
  if (message.message)
    message = message.message;

  try {
    const chatId = message.chat.id;
    const ref = db.ref(`chats/${chatId}/`);
    ref.once('value').then(snapshot => {
      const chat = snapshot.val();
      const usernames = chat && chat.usernames ? chat.usernames : '';
      console.log('le usernames', chat, usernames);
      if (chat && chat.message_id && chat.message_id > message.message_id) {
        console.log('discarting old message', chat.message_id, message.message_id);
        return res.end('Error: message is undefined');
      }

      if (messageManager.isCommand(message.entities)) {
        if (messageManager.isSet(message.text)) {
          ref.update({
            'message_id': message.message_id,
            'usernames': '' + messageManager.extractUniqueUsernames(message, usernames)
          }).then(m => {
            console.log('Updated message:', m);
            res.end('Updated message:', m);
          }).catch(e => {
            console.log('Error updating db:', e);
            res.end('Error updating db:', e);
          });
        } else if (messageManager.isPing(message.text)) {
          talkToBot(chatId, usernames || 'No usernames added.', res);
        } else if (messageManager.isClear(message.text)) {
          ref.set({
            usernames: ''
          });
          talkToBot(chatId, 'All cleared.', res);
        }
      } else if (message.new_chat_participant || message.left_chat_participant) {
        ref.set({
          'usernames': messageManager.extractUniqueUsernames(message, usernames)
        });
      }
      res.end('usernames', usernames);
    }).catch(error => {
      console.log('Error reading db:', error);
      res.end('Error reading db:', error);
    });
  } catch (err) {
    console.log('Error somewhere: ', err);
    talkToBot(chatId, `Sorry we didn't get that`, res);
    res.end('Error somewhere: ', err);
  }

  res.end('Terminamos');
});

app.get('/', (req, res) => {
  res.send('Bot up and running!');
});

// Finally, start our server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Telegram app listening on port 3000! Api Key ${process.env.API_ID}`);
});
