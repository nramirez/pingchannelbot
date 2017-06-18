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
    message.new_chat_participant = undefined;
    message.left_chat_participant = undefined;
  });

  describe('extractUniqueUsernames', () => {
    it('can extract 1 username', () => {
      message.text = '/set@pingchannelbot @username';
      const usernames = messageManager.extractUniqueUsernames(message, '');

      assert.strictEqual('@username', usernames);
    });

    it('gets usernames as string', () => {
      let users = '@naz klk @lola maria laba 24123ffsdf @winner32 @willy-ovalle @carlos@marcos';
      const usernames = messageManager.extractUniqueUsernames(message, users);

      assert.strictEqual('@naz @lola @winner32 @willy-ovalle @carlos @marcos @username @username1', usernames);
    });

    describe('new_chat_participant', () => {
      it('adds new member', () => {
        message.new_chat_participant = {
          username: 'newuser'
        };

        const usernames = messageManager.extractUniqueUsernames(message, '');

        assert.strictEqual('@newuser', usernames);
      });

      it('ignores new member with undefined usernames', () => {
        var users = '@username';
        message.new_chat_participant = {
          username: undefined
        };

        const usernames = messageManager.extractUniqueUsernames(message, users);

        assert.strictEqual(users, usernames);
      });
    });

    describe('left_chat_participant', () => {
      it('removes member', () => {
        var users = '@existing @new';
        message.text = undefined;
        message.left_chat_participant = {
          username: 'existing'
        };

        const usernames = messageManager.extractUniqueUsernames(message, users);

        assert.strictEqual('@new', usernames);
      });

      it('ignores undefined usernames', () => {
        var users = '@existing @new';
        message.text = undefined;
        message.left_chat_participant = {
          username: undefined
        };

        const usernames = messageManager.extractUniqueUsernames(message, users);

        assert.strictEqual(users, usernames);
      });
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
