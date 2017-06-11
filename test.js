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

  describe('extractUniqueUsernames', () => {
    it('can extract 1 username', () => {
      let users = '';
      message.text = '/set@pingchannelbot @username';
      const usernames = messageManager.extractUniqueUsernames(message, users);

      assert.strictEqual('@username', usernames);
    });

    it('gets usernames as string', () => {
      let users = 'username';
      const usernames = messageManager.extractUniqueUsernames(message, users);

      assert.strictEqual('@username @username1', usernames);
    });
  });

  describe('newMessageRequest', () => {
    it('initializes usernames from messages', () => {
      let users = '';
      const text = messageManager.extractUniqueUsernames(message, users);

      assert.strictEqual(text, '@username @username1');
    });
  });
});
