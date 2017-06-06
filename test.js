var assert = require('assert');
const messageManager = require('./messageManager');
const defaultText = '/set@pingchannelbot @username @username1';
const defaultEntities = [
    {
      type: "bot_command",
      offset: 0,
      length: 28,
    },
];
const message = {
  chat: {
    id: 'exampleId'
  },
  text: defaultText,
  entities: defaultEntities,
};


describe('message manager', () => {
  beforeEach(() => {
    message.text = defaultText;
    message.entities = defaultEntities;
  });

  describe('extractMessageText', () => {
    it('can extract 1 username', () => {
      message.text = '/set@pingchannelbot @username';
      const usernames = messageManager.extractMessageText(message).join(' ');
      assert.equal('@username', usernames);
    });

    it('gets usernames as string', () => {
      const usernames = messageManager.extractMessageText(message).join(' ');
      assert.equal('@username @username1', usernames);
    });

    it('gets undefined when message.entities does not have bot_command', () => {
      let chats = {};
      message.entities = [];
      const text = messageManager.processMessage(message, chats);
      assert.equal(text, undefined);
    });
  });

  describe('newMessageRequest', () => {
    it('initializes usernames from messages', () => {
      let chats = {};
      const text = messageManager.processMessage(message, chats);
      assert.equal(text, '@username @username1');
    });

    it('pings', () => {
      message.text = '/ping';
      let chats = {
        exampleId: {
          usernames: new Set(['@username', '@username1']),
        },
      };

      const text = messageManager.processMessage(message, chats);
      assert.equal(text, '@username @username1');
    });

    it('clears', () => {
      message.text = '/clear';
      let chats = {
        exampleId: {
          usernames: new Set(['@username', '@username1']),
        },
      };

      const text = messageManager.processMessage(message, chats);
      assert.equal(chats.exampleId.usernames.size, 0);
    });
  });
});