export const EXTENSION_STATUS_ENABLED = 'enabled';
export const EXTENSION_STATUS_DISABLED = 'disabled';
export const EXTENSION_STATUS_UNSUPPORTED = 'unsupported';

export const EXTENSION_ICONS = {
  48: 'icons/icon-48.png',
  96: 'icons/icon-96.png',
} as const;

export const EXTENSION_ICONS_GREY = {
  48: 'icons/icon-48-grey.png',
  96: 'icons/icon-96-grey.png',
} as const;

export const PLATFORM_DOMAIN_CHATGPT = 'chatgpt.com';
export const PLATFORM_DOMAIN_CHAT_OPENAI = 'chat.openai.com';

export const SUPPORTED_PLATFORM_DOMAINS = [
  PLATFORM_DOMAIN_CHATGPT,
  PLATFORM_DOMAIN_CHAT_OPENAI,
] as const;

export const PII_EMAIL = 'EMAIL';
export const PII_PHONE = 'PHONE';
export const PII_CREDIT_CARD = 'CREDIT_CARD';
export const PII_SSN = 'SSN';
export const PII_IP_ADDRESS = 'IP_ADDRESS';
export const PII_ADDRESS = 'ADDRESS';
export const PII_NAME = 'NAME';
export const PII_LOCATION = 'LOCATION';
export const PII_ORGANIZATION = 'ORGANIZATION';
export const PII_SECRET = 'SECRET';

export const PII_STATUS_PROTECTED = 'protected';
export const PII_STATUS_EXCLUDED = 'excluded';

export const MESSAGE_SET_EXTENSION_STATUS = 'SET_EXTENSION_STATUS';
export const MESSAGE_GET_EXTENSION_STATUS = 'GET_EXTENSION_STATUS';
export const MESSAGE_GET_CHAT_ID = 'GET_CHAT_ID';
export const MESSAGE_SET_CHAT_REDACTIONS = 'SET_CHAT_REDACTIONS';
export const MESSAGE_GET_CHAT_REDACTIONS = 'GET_CHAT_REDACTIONS';
export const MESSAGE_SET_CHAT_EXCLUDED_PII = 'SET_CHAT_EXCLUDED_PII';
export const MESSAGE_GET_CHAT_EXCLUDED_PII = 'GET_CHAT_EXCLUDED_PII';
