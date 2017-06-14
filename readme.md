# Telegram Bot using NodeJS, Heroku and Firebase

Me and my friends started using Telegram a few years ago, this is a great cloud-based mobile and desktop messaging app with a focus on security and speed. We are in a couple of channels/groups with different friends from college/work, Some of us use slack for work, where we have the ability to do @here/@channel and send a notification to everyone in the shared group. We wanted to be able to do the same on Telegram, so we decided to create a bot for this purpose.

This is a really simple bot, we’ll try to share what we have learned during the process here, and this might help you to build your next bot.
We started reading [this](https://core.telegram.org/bots), these are the basic steps:

# Create your bot using Telegram platform

This is a really funny step because you will have to talk with another bot [@BotFather](https://telegram.me/botfather) to give life to your new child, there you’ll be able to set the name of your bot and get the API key which we’ll use in the following steps.

# Setting up the web application

There are two basic ways to get informations from your bot, the first one is using the endpoint [getUpdates](https://core.telegram.org/bots/api#getupdates) provided by Telegram:
```
https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
```

This endpoint will provide the messages that your bot has received so far.

The second way, which is the one we used, is changing your bot behavior to send messages to your web application every time that it receives a new message, you can do by simply calling the following URL:
```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<YOUR_URL>
```

We found this method better than the `getUpdates` because you don’t have to worry about filtering or keeping track of the last updates, and also performing constantly this request.

Webhooks allow you to respond right away to the user request because your bot will notify the app, the app will process, then you’ll send a message to the bot and then the bot will talk to the user.

# Setting up Firebase

Since the bot cannot access to the list of users in the group his participating, we needed to keep track of those users. We used Firebase which is one of the quickest way of saving data, the setup is really straight-forward and the docs are really clear.
Basically this is all you need to do:

```javascript
var config = {
  apiKey: "<API_KEY>",
  authDomain: "<PROJECT_ID>.firebaseapp.com",
  databaseURL: "https://<DATABASE_NAME>.firebaseio.com",
  storageBucket: "<BUCKET>.appspot.com",
};
firebase.initializeApp(config);

```

### Things you need to keep in mind:

* We are using just the API_KEY to authenticate to the database. You can do this by going to the database rules on Firebase and set the values to `true`:

```javascript
{
 rules: {
    .read: true,
    .write: true
 }
}
```

* We use promises for requesting data from the db:

```javascript
const db = firebase.database();
const ref = db.ref(`chats/${chatId}/`); ref.once(‘value’).then(snapshot => {
    // This materialize the object we previously saved in the db
    const chat = snapshot.val();

    // Our object looks like this:
    // {
    //  message_id: 123, //we track the last message we received
    //  usernames: '@user1 @user2' //list of the users in this group
    // }
}, err => console.log(err));
```

* We also use promises for updating data:

```javascript
ref.update({
    'message_id': message_id,
    'usernames': '@user1 @user2'
}).then(m => {
    // This is a nice callback to have, because you're sure that the
    // update happened correctly before finishing the request, and you
    // can return feedback right away to the user.
}, err => console.log('always track the possible errors', err);
```

# How to communicate with the bot

This is the moment where your bot takes life, you can make your bot talk by doing the following:

```javascript
// Axios is really easy to use,
// and it has promises ♥
// but you can use any other library
// https://github.com/mzabriskie/axios
axios.post('https://api.telegram.org/bot<BOT_TOKEN>/sendMessage', {
    chat_id: chatId, // The chat-id comes in the request
       // this is the group where the bot is participating
   text: `Hello world, I'm a bot!`
});
```

Good to know: if you want to validate that a user is one of the administrator of the group you will have to perform an extra request, because the message doesn’t contain this level of information, but you only need to do the following:

```javascript
axios.post('https://api.telegram.org/getChatAdministrators', {
    chat_id: chatId
}).then(response => {
    const admins = response.data.result;
    const userIsAdmin = admins.filter(a => a.user.username === user).length > 0;
});
```

And that’s it! All set! :1st_place_medal:

# How our bot works

You only need to add @pinchannelbot to a group, one of the user admins has to manually set the users that want to be notify when someone does /here or /channel by doing:

```
/set @user1 @user2 User3 User4
```

The bot will add to the list any user newly added to the group and will remove from the list any user removed from the group.
Then anyone can notify everyone in the channel by doing:
```
/ping
/channel
/here
```

The code is really simple, we hope this helps you build a great bot we can use someday.

### Happy coding!