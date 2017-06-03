var assert = require('assert');
const messageManager = require('./messageManager'); 

describe('message manager', function() {
  it('should get usernames as string', function() {
    const message = {
        chat: {
            text: "/setusernames@pingchannelbot @username @username1",
        }};
    const usernames = messageManager.extractMessageText(message).join(' ');
    assert.equal('@username @username1', usernames);
  });
});