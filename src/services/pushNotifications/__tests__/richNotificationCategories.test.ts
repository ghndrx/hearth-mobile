/**
 * Rich Notification Categories Tests
 * Tests for inline reply notification actions on iOS and Android
 */

import {
  getRichNotificationCategories,
  extractReplyText,
  buildChatReplyNotificationContent,
  buildMentionNotificationContent,
  parseNotificationReplyData,
  isReplyAction,
  isChatReplyNotification,
  isMentionNotification,
  NOTIFICATION_CATEGORY,
  NOTIFICATION_ACTION,
  NOTIFICATION_DATA_KEYS,
  RichNotificationCategory,
  NotificationReplyData,
} from '../richNotificationCategories';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationCategoriesAsync: jest.fn(),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0,
  },
  TriggerType: {
    DATE: 1,
    TIME_INTERVAL: 2,
    Push: 3,
  },
}));

// Mock React Native Platform
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Platform: {
      OS: 'android',
      Version: 33,
    },
  };
});

describe('RichNotificationCategories', () => {
  describe('getRichNotificationCategories', () => {
    test('should return array of rich notification categories', () => {
      const categories = getRichNotificationCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    test('should include CHAT_REPLY category with reply action', () => {
      const categories = getRichNotificationCategories();
      const chatReplyCategory = categories.find(
        (cat) => cat.categoryId === NOTIFICATION_CATEGORY.CHAT_REPLY
      );

      expect(chatReplyCategory).toBeDefined();
      expect(chatReplyCategory?.actions).toBeDefined();
      expect(chatReplyCategory?.actions.length).toBeGreaterThan(0);

      const replyAction = chatReplyCategory?.actions.find(
        (action) => action.identifier === NOTIFICATION_ACTION.REPLY
      );
      expect(replyAction).toBeDefined();
      expect(replyAction?.buttonTitle).toBe('Reply');
    });

    test('should include MESSAGE category with view and mark read actions', () => {
      const categories = getRichNotificationCategories();
      const messageCategory = categories.find(
        (cat) => cat.categoryId === NOTIFICATION_CATEGORY.MESSAGE
      );

      expect(messageCategory).toBeDefined();
      expect(messageCategory?.actions.length).toBe(2);

      const viewAction = messageCategory?.actions.find(
        (action) => action.identifier === NOTIFICATION_ACTION.VIEW
      );
      expect(viewAction).toBeDefined();
      expect(viewAction?.buttonTitle).toBe('View');

      const markReadAction = messageCategory?.actions.find(
        (action) => action.identifier === NOTIFICATION_ACTION.MARK_READ
      );
      expect(markReadAction).toBeDefined();
    });

    test('should include MENTION category with reply and view actions', () => {
      const categories = getRichNotificationCategories();
      const mentionCategory = categories.find(
        (cat) => cat.categoryId === NOTIFICATION_CATEGORY.MENTION
      );

      expect(mentionCategory).toBeDefined();
      expect(mentionCategory?.actions.length).toBe(2);

      const replyAction = mentionCategory?.actions.find(
        (action) => action.identifier === NOTIFICATION_ACTION.REPLY
      );
      expect(replyAction).toBeDefined();
    });

    test('reply actions should not open app to foreground', () => {
      const categories = getRichNotificationCategories();
      const chatReplyCategory = categories.find(
        (cat) => cat.categoryId === NOTIFICATION_CATEGORY.CHAT_REPLY
      );

      const replyAction = chatReplyCategory?.actions.find(
        (action) => action.identifier === NOTIFICATION_ACTION.REPLY
      );

      expect(replyAction?.options.opensAppToForeground).toBe(false);
    });
  });

  describe('extractReplyText', () => {
    test('should extract text from userText field', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.REPLY,
        userText: 'Hello, this is a reply!',
      } as any;

      const result = extractReplyText(response);
      expect(result).toBe('Hello, this is a reply!');
    });

    test('should trim whitespace from reply text', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.REPLY,
        userText: '   Spaces around text   ',
      } as any;

      const result = extractReplyText(response);
      expect(result).toBe('Spaces around text');
    });

    test('should return null for empty userText', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.REPLY,
        userText: '',
      } as any;

      const result = extractReplyText(response);
      expect(result).toBeNull();
    });

    test('should return null for whitespace-only userText', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.REPLY,
        userText: '   ',
      } as any;

      const result = extractReplyText(response);
      expect(result).toBeNull();
    });

    test('should return null for non-reply action', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.VIEW,
        userText: 'Some text',
      } as any;

      const result = extractReplyText(response);
      expect(result).toBeNull();
    });

    test('should return null when userText is undefined', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.REPLY,
        userText: undefined,
      } as any;

      const result = extractReplyText(response);
      expect(result).toBeNull();
    });
  });

  describe('buildChatReplyNotificationContent', () => {
    test('should build notification content with CHAT_REPLY category', () => {
      const content = buildChatReplyNotificationContent({
        title: 'New message from John',
        body: 'Hey, how are you?',
        conversationId: 'conv-123',
        senderId: 'user-456',
        senderName: 'John Doe',
        messageId: 'msg-789',
      });

      expect(content.title).toBe('New message from John');
      expect(content.body).toBe('Hey, how are you?');
      expect(content.categoryIdentifier).toBe(NOTIFICATION_CATEGORY.CHAT_REPLY);
      expect(content.data[NOTIFICATION_DATA_KEYS.CONVERSATION_ID]).toBe('conv-123');
      expect(content.data[NOTIFICATION_DATA_KEYS.SENDER_ID]).toBe('user-456');
      expect(content.data[NOTIFICATION_DATA_KEYS.SENDER_NAME]).toBe('John Doe');
      expect(content.data[NOTIFICATION_DATA_KEYS.MESSAGE_ID]).toBe('msg-789');
      expect(content.data[NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE]).toBe(NOTIFICATION_CATEGORY.CHAT_REPLY);
    });

    test('should include threadId when provided', () => {
      const content = buildChatReplyNotificationContent({
        title: 'New message from John',
        body: 'Hey, how are you?',
        conversationId: 'conv-123',
        senderId: 'user-456',
        senderName: 'John Doe',
        messageId: 'msg-789',
        threadId: 'thread-001',
      });

      expect(content.data[NOTIFICATION_DATA_KEYS.THREAD_ID]).toBe('thread-001');
    });

    test('should not include threadId when not provided', () => {
      const content = buildChatReplyNotificationContent({
        title: 'New message from John',
        body: 'Hey, how are you?',
        conversationId: 'conv-123',
        senderId: 'user-456',
        senderName: 'John Doe',
        messageId: 'msg-789',
      });

      expect(content.data[NOTIFICATION_DATA_KEYS.THREAD_ID]).toBeUndefined();
    });

    test('should set sticky to false', () => {
      const content = buildChatReplyNotificationContent({
        title: 'New message',
        body: 'Hello',
        conversationId: 'conv-123',
        senderId: 'user-456',
        senderName: 'John',
        messageId: 'msg-789',
      });

      expect(content.sticky).toBe(false);
    });

    test('should include timestamp in data', () => {
      const beforeTime = Date.now();
      const content = buildChatReplyNotificationContent({
        title: 'New message',
        body: 'Hello',
        conversationId: 'conv-123',
        senderId: 'user-456',
        senderName: 'John',
        messageId: 'msg-789',
      });
      const afterTime = Date.now();

      const timestamp = parseInt(content.data[NOTIFICATION_DATA_KEYS.TIMESTAMP], 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('buildMentionNotificationContent', () => {
    test('should build notification content with MENTION category', () => {
      const content = buildMentionNotificationContent({
        title: 'You were mentioned',
        body: '@you check this out',
        conversationId: 'conv-123',
        senderId: 'user-456',
        senderName: 'Jane',
        messageId: 'msg-789',
      });

      expect(content.categoryIdentifier).toBe(NOTIFICATION_CATEGORY.MENTION);
      expect(content.data[NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE]).toBe(NOTIFICATION_CATEGORY.MENTION);
    });
  });

  describe('parseNotificationReplyData', () => {
    test('should parse valid notification data into reply data', () => {
      const notification = {
        request: {
          content: {
            body: 'Original message text',
            data: {
              [NOTIFICATION_DATA_KEYS.CONVERSATION_ID]: 'conv-123',
              [NOTIFICATION_DATA_KEYS.SENDER_ID]: 'user-456',
              [NOTIFICATION_DATA_KEYS.SENDER_NAME]: 'John Doe',
              [NOTIFICATION_DATA_KEYS.MESSAGE_ID]: 'msg-789',
              [NOTIFICATION_DATA_KEYS.THREAD_ID]: 'thread-001',
              [NOTIFICATION_DATA_KEYS.TIMESTAMP]: '1709856000000',
            },
          },
        },
      } as any;

      const result = parseNotificationReplyData(notification);

      expect(result).not.toBeNull();
      expect(result?.conversationId).toBe('conv-123');
      expect(result?.senderId).toBe('user-456');
      expect(result?.senderName).toBe('John Doe');
      expect(result?.messageId).toBe('msg-789');
      expect(result?.threadId).toBe('thread-001');
      expect(result?.text).toBe('Original message text');
      expect(result?.timestamp).toBe(1709856000000);
    });

    test('should handle missing sender name with default', () => {
      const notification = {
        request: {
          content: {
            body: 'Message text',
            data: {
              [NOTIFICATION_DATA_KEYS.CONVERSATION_ID]: 'conv-123',
              [NOTIFICATION_DATA_KEYS.SENDER_ID]: 'user-456',
              [NOTIFICATION_DATA_KEYS.MESSAGE_ID]: 'msg-789',
            },
          },
        },
      } as any;

      const result = parseNotificationReplyData(notification);

      expect(result?.senderName).toBe('Unknown');
    });

    test('should return null for missing required fields', () => {
      const notification = {
        request: {
          content: {
            body: 'Message text',
            data: {
              [NOTIFICATION_DATA_KEYS.CONVERSATION_ID]: 'conv-123',
              // Missing senderId and messageId
            },
          },
        },
      } as any;

      const result = parseNotificationReplyData(notification);
      expect(result).toBeNull();
    });

    test('should return null for missing conversationId', () => {
      const notification = {
        request: {
          content: {
            body: 'Message text',
            data: {
              [NOTIFICATION_DATA_KEYS.SENDER_ID]: 'user-456',
              [NOTIFICATION_DATA_KEYS.MESSAGE_ID]: 'msg-789',
            },
          },
        },
      } as any;

      const result = parseNotificationReplyData(notification);
      expect(result).toBeNull();
    });

    test('should use current timestamp when timestamp is missing', () => {
      const beforeTime = Date.now();
      const notification = {
        request: {
          content: {
            body: 'Message text',
            data: {
              [NOTIFICATION_DATA_KEYS.CONVERSATION_ID]: 'conv-123',
              [NOTIFICATION_DATA_KEYS.SENDER_ID]: 'user-456',
              [NOTIFICATION_DATA_KEYS.MESSAGE_ID]: 'msg-789',
            },
          },
        },
      } as any;

      const result = parseNotificationReplyData(notification);
      const afterTime = Date.now();

      expect(result?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result?.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('isReplyAction', () => {
    test('should return true for REPLY action', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.REPLY,
      } as any;

      expect(isReplyAction(response)).toBe(true);
    });

    test('should return false for VIEW action', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.VIEW,
      } as any;

      expect(isReplyAction(response)).toBe(false);
    });

    test('should return false for MARK_READ action', () => {
      const response = {
        actionIdentifier: NOTIFICATION_ACTION.MARK_READ,
      } as any;

      expect(isReplyAction(response)).toBe(false);
    });
  });

  describe('isChatReplyNotification', () => {
    test('should return true for CHAT_REPLY notification type', () => {
      const notification = {
        request: {
          content: {
            data: {
              [NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE]: NOTIFICATION_CATEGORY.CHAT_REPLY,
            },
          },
        },
      } as any;

      expect(isChatReplyNotification(notification)).toBe(true);
    });

    test('should return false for MENTION notification type', () => {
      const notification = {
        request: {
          content: {
            data: {
              [NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE]: NOTIFICATION_CATEGORY.MENTION,
            },
          },
        },
      } as any;

      expect(isChatReplyNotification(notification)).toBe(false);
    });
  });

  describe('isMentionNotification', () => {
    test('should return true for MENTION notification type', () => {
      const notification = {
        request: {
          content: {
            data: {
              [NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE]: NOTIFICATION_CATEGORY.MENTION,
            },
          },
        },
      } as any;

      expect(isMentionNotification(notification)).toBe(true);
    });

    test('should return false for CHAT_REPLY notification type', () => {
      const notification = {
        request: {
          content: {
            data: {
              [NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE]: NOTIFICATION_CATEGORY.CHAT_REPLY,
            },
          },
        },
      } as any;

      expect(isMentionNotification(notification)).toBe(false);
    });
  });

  describe('NOTIFICATION_CATEGORY constants', () => {
    test('should have correct category identifiers', () => {
      expect(NOTIFICATION_CATEGORY.MESSAGE).toBe('hearth_message');
      expect(NOTIFICATION_CATEGORY.CHAT_REPLY).toBe('hearth_chat_reply');
      expect(NOTIFICATION_CATEGORY.MENTION).toBe('hearth_mention');
    });
  });

  describe('NOTIFICATION_ACTION constants', () => {
    test('should have correct action identifiers', () => {
      expect(NOTIFICATION_ACTION.REPLY).toBe('hearth_reply');
      expect(NOTIFICATION_ACTION.MARK_READ).toBe('hearth_mark_read');
      expect(NOTIFICATION_ACTION.VIEW).toBe('hearth_view');
    });
  });

  describe('NOTIFICATION_DATA_KEYS constants', () => {
    test('should have correct data keys', () => {
      expect(NOTIFICATION_DATA_KEYS.CONVERSATION_ID).toBe('conversationId');
      expect(NOTIFICATION_DATA_KEYS.SENDER_ID).toBe('senderId');
      expect(NOTIFICATION_DATA_KEYS.SENDER_NAME).toBe('senderName');
      expect(NOTIFICATION_DATA_KEYS.MESSAGE_ID).toBe('messageId');
      expect(NOTIFICATION_DATA_KEYS.THREAD_ID).toBe('threadId');
      expect(NOTIFICATION_DATA_KEYS.NOTIFICATION_TYPE).toBe('notificationType');
      expect(NOTIFICATION_DATA_KEYS.TIMESTAMP).toBe('timestamp');
    });
  });
});
