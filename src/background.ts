import browser, { type Runtime } from 'webextension-polyfill';
import type {
  MessageRequest,
  MessageGetExtensionStatusResponse,
  MessageSetExtensionStatusRequest,
  Redactions,
} from './types';
import {
  EXTENSION_ICONS,
  EXTENSION_ICONS_GREY,
  EXTENSION_STATUS_ENABLED,
  EXTENSION_STATUS_UNSUPPORTED,
  MESSAGE_SET_EXTENSION_STATUS,
  MESSAGE_GET_EXTENSION_STATUS,
  MESSAGE_SET_CHAT_REDACTIONS,
  MESSAGE_GET_CHAT_REDACTIONS,
  MESSAGE_SET_CHAT_EXCLUDED_PII,
  MESSAGE_GET_CHAT_EXCLUDED_PII,
  MESSAGE_GET_CHAT_ID,
} from './constants';
import { parseChatIdFromUrl, isSupportedPlatformUrl } from './helpers/url';

const getStorageValue = async <T>(key: string): Promise<T | undefined> => {
  const storage = await browser.storage.session.get(key);
  return storage[key] as T | undefined;
};

const setStorageValue = async <T>(key: string, value: T): Promise<void> => {
  await browser.storage.session.set({ [key]: value });
};

const refreshExtensionIcon = async (): Promise<void> => {
  const extensionStatus = await fetchExtensionStatus();

  browser.action.setIcon({
    path: extensionStatus === EXTENSION_STATUS_ENABLED ? EXTENSION_ICONS : EXTENSION_ICONS_GREY,
  });
};

const fetchExtensionStatus = async (): Promise<string> => {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.url || !isSupportedPlatformUrl(activeTab.url)) {
    return EXTENSION_STATUS_UNSUPPORTED;
  }

  return (await getStorageValue<string>('status')) || EXTENSION_STATUS_ENABLED;
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

const getChatRedactions = async (chatId: string): Promise<Redactions> => {
  return (await getStorageValue<Redactions>(`chat_${chatId}`)) || {};
};

const setChatRedactions = async (chatId: string, redactions: Redactions): Promise<void> => {
  await setStorageValue(`chat_${chatId}`, redactions);
};

const migratePendingChatRedactions = async (chatId: string): Promise<void> => {
  const redactions = await getChatRedactions('pending');
  const excludedPII = await getChatExcludedPII('pending');

  if (Object.keys(redactions).length === 0 && excludedPII.length === 0) {
    return;
  }

  await setChatRedactions(chatId, redactions);
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

  browser.tabs.onActivated.addListener(async () => {
    await refreshExtensionIcon();
  });

  browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.url) {
      const chatId = parseChatIdFromUrl(tab.url);

      if (chatId !== 'pending') {
        await migratePendingChatRedactions(chatId);
      }
    }

    if (changeInfo.status === 'complete') {
      await refreshExtensionIcon();
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
        return {
          status: await fetchExtensionStatus(),
        } as MessageGetExtensionStatusResponse;
      }

      case MESSAGE_GET_CHAT_ID: {
        return { chatId: await fetchChatId(sender) };
      }

      case MESSAGE_SET_CHAT_REDACTIONS: {
        const chatId = await fetchChatId(sender);
        await setChatRedactions(chatId, message.redactions);
        return;
      }

      case MESSAGE_GET_CHAT_REDACTIONS: {
        const chatId = await fetchChatId(sender);
        return { redactions: await getChatRedactions(chatId) };
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
