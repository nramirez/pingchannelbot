const axios = require('axios');
const config = require('./config');

const getChatAdministrators = chatId => {
  return axios.post(`${config.telegramBaseUrl}/getChatAdministrators`, {
    chat_id: chatId,
  });
};

const talkToBot = (chatId, text) => {
  return axios.post(`${config.telegramBaseUrl}/sendMessage`, {
    chat_id: chatId,
    text: text,
  });
};

module.exports = {
  getChatAdministrators,
  talkToBot,
};
