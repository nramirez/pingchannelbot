var assert = require('assert');
const messageManager = require('./messageManager');
const message = {
  chat: {
    id: 'exampleId',
    text: "/setusernames@pingchannelbot @username @username1",
  }
};

describe('message manager', () => {
  describe('extractMessageText', () => {
    it('gets usernames as string', () => {
      const usernames = messageManager.extractMessageText(message).join(' ');
      assert.equal('@username @username1', usernames);
    });
  });

  describe('newMessageRequest', () => {
    it('initializes usernames from messages', () => {
      let chats = {};

      messageManager.processMessage(message, chats);
      console.log(chats)

      assert.equal(chats[message.chat.id].usernames.size, 2);
    });
  });
});