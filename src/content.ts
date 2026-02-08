import browser from 'webextension-polyfill';
import { distance as levenshtein } from 'fastest-levenshtein';
import { redactPII } from './core/pii';
import { escapeHtml, findTextNodes, waitForElement } from './helpers/dom';
import {
  getExtensionStatus,
  getChatRedactions,
  setChatRedactions,
  getChatExcludedPII,
  setChatExcludedPII,
} from './messages';
import { RedactionMap, MessageRequest, ExtensionStatus } from './types';
import {
  MESSAGE_SET_EXTENSION_STATUS,
  EXTENSION_STATUS_ENABLED,
  PII_STATUS_PROTECTED,
  PII_STATUS_EXCLUDED,
} from './constants';
import './main.css';
import {
  initializePlaceholderChip,
  createPlaceholderChip,
  updatePlaceholderChipStatus,
} from './components/PlaceholderChip';
import { showNotification } from './components/Notification';

let isProcessingSubmit = false;

const syncExtensionStatus = (status: ExtensionStatus): void => {
  document.body.dataset.pgStatus = status;
};

const normalizePII = (value: string): string => value.toLowerCase().trim();

const addToExcludedPII = async (value: string): Promise<void> => {
  const excludedPII = await getChatExcludedPII();

  await setChatExcludedPII([...excludedPII, normalizePII(value)]);
  showNotification(`"${value}" excluded from protection.`);
};

const removeFromExcludedPII = async (value: string): Promise<void> => {
  const excludedPII = await getChatExcludedPII();

  await setChatExcludedPII(excludedPII.filter((v) => v !== normalizePII(value)));
  showNotification(`"${value}" included in protection.`);
};

const isExcludedPII = async (pii: string): Promise<boolean> => {
  const excludedPII = await getChatExcludedPII();

  const normalizedPII = normalizePII(pii);

  for (const entry of excludedPII) {
    const normalizedExcludedPII = normalizePII(entry);

    if (normalizedPII === normalizedExcludedPII) {
      return true;
    }

    const maxDistance = normalizedPII.length < 6 ? 1 : 2;

    if (levenshtein(normalizedPII, normalizedExcludedPII) <= maxDistance) {
      return true;
    }
  }

  return false;
};

const redactPromptText = async (promptText: string): Promise<string> => {
  const [redactionMap, excludedPII] = await Promise.all([
    getChatRedactions(),
    getChatExcludedPII(),
  ]);

  const {
    detectedPII,
    redactionMap: newRedactionMap,
    redactedText,
  } = await redactPII(promptText, redactionMap, excludedPII);

  await setChatRedactions(newRedactionMap);

  if (detectedPII.length > 0) {
    showNotification(`Protected ${detectedPII.length} personal data item(s).`);
  }

  return redactedText;
};

const getPromptInputElement = (): HTMLElement | null => {
  const elementSelectors = [
    '#prompt-textarea', // ChatGPT
  ];

  for (const elementSelector of elementSelectors) {
    const element = document.querySelector<HTMLElement>(elementSelector);

    if (element) {
      return element;
    }
  }

  return null;
};

const getPromptSubmitElement = (): HTMLButtonElement | null => {
  const buttonSelectors = [
    '#composer-submit-button', // ChatGPT
  ];

  for (const elementSelector of buttonSelectors) {
    const element = document.querySelector<HTMLButtonElement>(elementSelector);

    if (element) {
      return element;
    }
  }

  return null;
};

const getPromptMessageElements = (): HTMLElement[] => {
  const elementSelectors = [
    '.group\\/turn-messages', // ChatGPT
  ];

  for (const elementSelector of elementSelectors) {
    const elements = document.querySelectorAll<HTMLElement>(elementSelector);

    if (elements.length > 0) {
      return Array.from(elements);
    }
  }

  return [];
};

const getPromptInputText = (promptInputElement: HTMLElement): string => {
  if (promptInputElement.tagName === 'TEXTAREA') {
    return (promptInputElement as HTMLTextAreaElement).value;
  }

  return promptInputElement.innerText || promptInputElement.textContent || '';
};

const setPromptInputText = (promptInputElement: HTMLElement, promptText: string): void => {
  if (promptInputElement.tagName === 'TEXTAREA') {
    (promptInputElement as HTMLTextAreaElement).value = promptText;
    return;
  }

  // Normalize the prompt text for ChatGTP
  promptInputElement.innerHTML = promptText
    .split('\n\n')
    .map((paragraph: string) => {
      const lines = paragraph
        .split('\n')
        .map((line: string) => escapeHtml(line))
        .join('<br>');

      return `<p>${lines || '<br>'}</p>`;
    })
    .join('');

  promptInputElement.setAttribute('data-pg-processed', 'true');
};

const handlePromptSubmit = async (promptInputElement: HTMLElement): Promise<void> => {
  const extensionStatus = await getExtensionStatus();

  if (extensionStatus !== EXTENSION_STATUS_ENABLED) {
    return;
  }

  const promptText = getPromptInputText(promptInputElement);

  if (!promptText || promptText.trim() === '') {
    return;
  }

  const redactedPromptText = await redactPromptText(promptText);
  setPromptInputText(promptInputElement, redactedPromptText);
};

const attachPromptInputHandler = (promptInputElement: HTMLElement): void => {
  // Make the function idempotent
  if (promptInputElement.dataset.pgManaged) {
    return;
  }

  promptInputElement.dataset.pgManaged = 'true';

  promptInputElement.addEventListener(
    'keydown',
    async (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const promptSubmitElement = getPromptSubmitElement();

        if (promptSubmitElement) {
          promptSubmitElement.click();
        }
      }
    },
    { capture: true }
  );
};

const attachPromptSubmitHandler = (promptSubmitElement: HTMLButtonElement): void => {
  // Make the function idempotent
  if (promptSubmitElement.dataset.pgManaged) {
    return;
  }

  promptSubmitElement.dataset.pgManaged = 'true';

  promptSubmitElement.addEventListener(
    'click',
    async (e) => {
      // Let original handler run when it's time to submit the prompt
      if (isProcessingSubmit) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const promptInputElement = getPromptInputElement();

      if (!promptInputElement) {
        return;
      }

      await handlePromptSubmit(promptInputElement);

      // Trigger the event a second time but let the original callback intercept it
      isProcessingSubmit = true;

      setTimeout(() => {
        promptSubmitElement.click();
        isProcessingSubmit = false;
      });
    },
    { capture: true }
  );
};

const restorePIIInTextNode = async (textNode: Text, redactionMap: RedactionMap): Promise<void> => {
  const text = textNode.textContent || '';
  const matches = [...text.matchAll(/\[([A-Z_]+)_(\d+)\]/g)].filter((m) => redactionMap[m[0]]);

  if (matches.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const match of matches) {
    const placeholder = match[0];
    const redaction = redactionMap[placeholder];

    if (match.index! > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    fragment.appendChild(
      createPlaceholderChip({
        placeholder,
        originalValue: redaction.original,
        piiType: redaction.type,
        isExcluded: await isExcludedPII(redaction.original),
        onToggleExclude: async (excluded) => {
          if (excluded) {
            await addToExcludedPII(redaction.original);
            updatePlaceholderChipStatus(placeholder, PII_STATUS_EXCLUDED);
          } else {
            await removeFromExcludedPII(redaction.original);
            updatePlaceholderChipStatus(placeholder, PII_STATUS_PROTECTED);
          }
        },
      })
    );

    lastIndex = match.index! + placeholder.length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode?.replaceChild(fragment, textNode);
};

const restorePIIInMessageElement = async (
  element: HTMLElement,
  redactionMap: RedactionMap
): Promise<void> => {
  const textNodes = findTextNodes(
    element,
    (node) => !!(node.parentNode as Element)?.closest('.pg-placeholder-chip')
  );

  for (const textNode of textNodes) {
    await restorePIIInTextNode(textNode, redactionMap);
  }
};

const restorePIIInMessages = async (): Promise<void> => {
  const redactionMap = await getChatRedactions();

  if (Object.keys(redactionMap).length === 0) {
    return;
  }

  const promptMessageElements = getPromptMessageElements();

  for (const promptMessageElement of promptMessageElements) {
    await restorePIIInMessageElement(promptMessageElement, redactionMap);
  }
};

const initialize = async (): Promise<void> => {
  let promptInputElement = await waitForElement(getPromptInputElement);
  let promptSubmitElement = await waitForElement(getPromptSubmitElement);

  attachPromptInputHandler(promptInputElement);
  attachPromptSubmitHandler(promptSubmitElement);

  initializePlaceholderChip();

  // Reconnect the elements whenever the DOM changes and ensure the redacted PII is automatically
  // restored on the page
  let restoreTimeout: number | null = null;

  const mutationObserver = new MutationObserver(() => {
    const currentInputElement = getPromptInputElement();
    const currentSubmitElement = getPromptSubmitElement();

    if (currentInputElement && currentInputElement !== promptInputElement) {
      promptInputElement = currentInputElement;
      attachPromptInputHandler(promptInputElement);
    }

    if (currentSubmitElement && currentSubmitElement !== promptSubmitElement) {
      promptSubmitElement = currentSubmitElement;
      attachPromptSubmitHandler(promptSubmitElement);
    }

    // Debounced PII restoration
    if (restoreTimeout) {
      clearTimeout(restoreTimeout);
    }

    restoreTimeout = window.setTimeout(() => {
      restorePIIInMessages();
    }, 300);
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Keep the extension status in sync
  syncExtensionStatus(await getExtensionStatus());

  browser.runtime.onMessage.addListener(((message: MessageRequest) => {
    if (message.type === MESSAGE_SET_EXTENSION_STATUS) {
      syncExtensionStatus(message.status);
    }
  }) as Parameters<typeof browser.runtime.onMessage.addListener>[0]);

  console.log('PromptGuard: Content script initialized');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
