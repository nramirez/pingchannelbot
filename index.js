var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const axios = require('axios');
const JL = require('jsnlog');
const messageManager = require('./messageManager');
let chats = {};

//https://api.telegram.org/302104681:AAHIwLgGCNxZ70ETGyTwlRTIsQOZocNzySg/sendMessage
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
})); // for parsing application/x-www-form-urlencoded

app.post('/new-message', function (req, res) {
  const { message } = req.body;
  //Each message contains "text" and a "chat" object, which has an "id" which is the chat id

  if (!message) {
    // In case a message is not present, or if our message does not have the word marco in it, do nothing and return an empty response
    return res.end()
  }

  messageManager.processMessage(message, chats);

  axios.post(sentMessageUrl, {
    chat_id: message.chat.id,
    text: [...chats[message.chat.id].usernames].join(' ')
  }).then(response => {
    // We get here if the message was successfully posted
    console.log('Message posted')
    res.end('ok')
  }).catch(err => {
    // ...and here if it was not
    console.log('Error :', err)
    res.end('Error :' + err)
  });
});

app.get('/', function (req, res) {
  res.send('Bot up and running!');
});

app.get('/logger', function (req, res) {
  res.sendfile('/jsnlog.logger');
});

// Finally, start our server
app.listen(3000, function () {
  console.log(`Telegram app listening on port 3000! Api Key ${process.env.API_ID}`);
});