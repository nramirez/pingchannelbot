var assert = require('assert');
const messageManager = require('./messageManager');
const defaultText = '/setusernames@pingchannelbot @username @username1';
const message = {
  chat: {
    id: 'exampleId',
    text: defaultText,
  }
};


describe('message manager', () => {
  beforeEach(() => {
    message.chat.text = defaultText;
  });

  describe('extractMessageText', () => {
    it('can extract 1 username', () => {
      message.chat.text = '/setusernames@pingchannelbot @username'

      const usernames = messageManager.extractMessageText(message).join(' ');
      assert.equal('@username', usernames);
    });

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