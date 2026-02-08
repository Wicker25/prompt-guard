import browser, { type Runtime } from 'webextension-polyfill';
import type {
  MessageRequest,
  MessageGetExtensionStatusResponse,
  MessageSetExtensionStatusRequest,
  RedactionMap,
} from './types';
import {
  EXTENSION_ICONS,
  EXTENSION_ICONS_GREY,
  EXTENSION_STATUS_ENABLED,
  MESSAGE_SET_EXTENSION_STATUS,
  MESSAGE_GET_EXTENSION_STATUS,
  MESSAGE_SET_CHAT_REDACTIONS,
  MESSAGE_GET_CHAT_REDACTIONS,
  MESSAGE_SET_CHAT_EXCLUDED_PII,
  MESSAGE_GET_CHAT_EXCLUDED_PII,
  MESSAGE_GET_CHAT_ID,
} from './constants';
import { parseChatIdFromUrl } from './helpers/url';

const getStorageValue = async <T>(key: string): Promise<T | undefined> => {
  const storage = await browser.storage.session.get(key);
  return storage[key] as T | undefined;
};

const setStorageValue = async <T>(key: string, value: T): Promise<void> => {
  await browser.storage.session.set({ [key]: value });
};

const refreshExtensionIcon = async (): Promise<void> => {
  const status = (await getStorageValue<string>('status')) || EXTENSION_STATUS_ENABLED;

  browser.action.setIcon({
    path: status === EXTENSION_STATUS_ENABLED ? EXTENSION_ICONS : EXTENSION_ICONS_GREY,
  });
};

const fetchChatId = async (sender: Runtime.MessageSender): Promise<string> => {
  if (sender.tab?.url) {
    return parseChatIdFromUrl(sender.tab.url);
  }

  // Fallback for popup (no sender.tab)
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (activeTab?.url) {
    return parseChatIdFromUrl(activeTab.url);
  }

  return 'pending';
};

const getChatRedactions = async (chatId: string): Promise<RedactionMap> => {
  return (await getStorageValue<RedactionMap>(`chat_${chatId}`)) || {};
};

const setChatRedactions = async (chatId: string, redactionMap: RedactionMap): Promise<void> => {
  await setStorageValue(`chat_${chatId}`, redactionMap);
};

const migratePendingChatRedactions = async (chatId: string): Promise<void> => {
  const redactionMap = await getChatRedactions('pending');
  const excludedPII = await getChatExcludedPII('pending');

  if (Object.keys(redactionMap).length === 0 && excludedPII.length === 0) {
    return;
  }

  await setChatRedactions(chatId, redactionMap);
  await setChatExcludedPII(chatId, excludedPII);

  await browser.storage.session.remove(['chat_pending', 'excludedPII_pending']);
};

const getChatExcludedPII = async (chatId: string): Promise<string[]> => {
  return (await getStorageValue<string[]>(`excludedPII_${chatId}`)) || [];
};

const setChatExcludedPII = async (chatId: string, list: string[]): Promise<void> => {
  await setStorageValue(`excludedPII_${chatId}`, list);
};

const initialize = async (): Promise<void> => {
  await refreshExtensionIcon();

  // Update the icon when a tab becomes active or finishes loading
  browser.tabs.onActivated.addListener(() => {
    refreshExtensionIcon();
  });

  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.url) {
      const chatId = parseChatIdFromUrl(tab.url);

      if (chatId !== 'pending') {
        migratePendingChatRedactions(chatId);
      }
    }

    if (changeInfo.status === 'complete') {
      refreshExtensionIcon();
    }
  });

  // Process backend logic through message handling
  browser.runtime.onMessage.addListener((async (
    message: MessageRequest,
    sender: Runtime.MessageSender
  ) => {
    switch (message.type) {
      case MESSAGE_SET_EXTENSION_STATUS: {
        await setStorageValue('status', message.status);

        // Update the extension icon
        browser.action.setIcon({
          path:
            message.status === EXTENSION_STATUS_ENABLED ? EXTENSION_ICONS : EXTENSION_ICONS_GREY,
        });

        // Forward to content script (may fail if not on a supported page)
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (activeTab?.id) {
          browser.tabs
            .sendMessage(activeTab.id, {
              type: MESSAGE_SET_EXTENSION_STATUS,
              status: message.status,
            } as MessageSetExtensionStatusRequest)
            .catch(() => {});
        }

        return;
      }

      case MESSAGE_GET_EXTENSION_STATUS: {
        const status = await getStorageValue<string>('status');

        return {
          status: status || EXTENSION_STATUS_ENABLED,
        } as MessageGetExtensionStatusResponse;
      }

      case MESSAGE_GET_CHAT_ID: {
        return { chatId: await fetchChatId(sender) };
      }

      case MESSAGE_SET_CHAT_REDACTIONS: {
        const chatId = await fetchChatId(sender);
        await setChatRedactions(chatId, message.redactionMap);
        return;
      }

      case MESSAGE_GET_CHAT_REDACTIONS: {
        const chatId = await fetchChatId(sender);
        return { redactionMap: await getChatRedactions(chatId) };
      }

      case MESSAGE_SET_CHAT_EXCLUDED_PII: {
        const chatId = await fetchChatId(sender);
        await setChatExcludedPII(chatId, message.excludedPII);
        return;
      }

      case MESSAGE_GET_CHAT_EXCLUDED_PII: {
        const chatId = await fetchChatId(sender);
        return { excludedPII: await getChatExcludedPII(chatId) };
      }

      default: {
        return { error: 'Unknown message type' };
      }
    }
  }) as Parameters<typeof browser.runtime.onMessage.addListener>[0]);
};

initialize();
