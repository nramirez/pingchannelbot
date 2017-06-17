require('dotenv').config();

module.exports = {
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: 'pingchannelbot.firebaseapp.com',
    databaseURL: 'https://pingchannelbot.firebaseio.com',
    storageBucket: 'pingchannelbot.appspot.com',
  },
  apiId: process.env.API_ID,
  currentPort: process.env.PORT || 3000,
  telegramBaseUrl: `https://api.telegram.org/bot${process.env.API_ID}`,
  mixpanelToken: process.env.MIXPANEL_TOKEN
};
