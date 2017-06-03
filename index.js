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

const newMessageHandler = (req, res) => {
    const { message } = req.body

  //Each message contains "text" and a "chat" object, which has an "id" which is the chat id

  if (!message) {
    // In case a message is not present, or if our message does not have the word marco in it, do nothing and return an empty response
    return res.end()
  }

  // If we've gotten this far, it means that we have received a message containing the word "marco".
  // Respond by hitting the telegram bot API and responding to the approprite chat_id with the word "Polo!!"
  // Remember to use your own API toked instead of the one below  "https://api.telegram.org/bot<your_api_token>/sendMessage"
  const sentMessageUrl = `https://api.telegram.org/bot${process.env.API_ID}/sendMessage`;
  if(chats[message.chat.id].usernames) {
      chats[message.chat.id].usernames.add(...messageManager.extractMessageText(message));
  } else {
      chats[message.chat.id].usernames =  new Set(messageManager.extractMessageText(message));
  }

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
};

app.post('/new-message', function(req, res) {
  try {
      return newMessageHandler(req, res);
  } catch (error) {
     JL().fatalException("Exception info", e); 
  }
});

app.get('/', function(req, res) {
    res.send('Bot up and running!');
});

app.get('/logger', function(req, res){
    res.sendfile('/jsnlog.logger');
});

// Finally, start our server
app.listen(3000, function() {
  console.log(`Telegram app listening on port 3000! Api Key ${process.env.API_ID}`);
});
