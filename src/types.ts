import {
  MESSAGE_SET_EXTENSION_STATUS,
  MESSAGE_GET_EXTENSION_STATUS,
  MESSAGE_SET_CHAT_REDACTIONS,
  MESSAGE_GET_CHAT_REDACTIONS,
  MESSAGE_SET_CHAT_EXCLUDED_PII,
  MESSAGE_GET_CHAT_EXCLUDED_PII,
  MESSAGE_GET_CHAT_ID,
  EXTENSION_STATUS_ENABLED,
  EXTENSION_STATUS_DISABLED,
  EXTENSION_STATUS_UNSUPPORTED,
  PII_STATUS_PROTECTED,
  PII_STATUS_EXCLUDED,
  PII_EMAIL,
  PII_PHONE,
  PII_CREDIT_CARD,
  PII_SSN,
  PII_IP_ADDRESS,
  PII_ADDRESS,
  PII_NAME,
  PII_LOCATION,
  PII_ORGANIZATION,
  PII_SECRET,
} from './constants';

export type ExtensionStatus =
  | typeof EXTENSION_STATUS_ENABLED
  | typeof EXTENSION_STATUS_DISABLED
  | typeof EXTENSION_STATUS_UNSUPPORTED;

export type PIIType =
  | typeof PII_EMAIL
  | typeof PII_PHONE
  | typeof PII_CREDIT_CARD
  | typeof PII_SSN
  | typeof PII_IP_ADDRESS
  | typeof PII_ADDRESS
  | typeof PII_NAME
  | typeof PII_LOCATION
  | typeof PII_ORGANIZATION
  | typeof PII_SECRET;

export type PIIStatus = typeof PII_STATUS_PROTECTED | typeof PII_STATUS_EXCLUDED;

export interface PII {
  type: PIIType;
  value: string;
  index: number;
}

export interface Redaction {
  type: PIIType;
  original: string;
}

export type Redactions = Record<string, Redaction>;

export interface RedactionResult {
  detectedPII: PII[];
  redactions: Redactions;
  redactedText: string;
}

export interface MessageSetExtensionStatusRequest {
  type: typeof MESSAGE_SET_EXTENSION_STATUS;
  status: ExtensionStatus;
}

export interface MessageGetExtensionStatusRequest {
  type: typeof MESSAGE_GET_EXTENSION_STATUS;
}

export interface MessageGetExtensionStatusResponse {
  status: ExtensionStatus;
}

export interface MessageGetChatIdRequest {
  type: typeof MESSAGE_GET_CHAT_ID;
}

export interface MessageGetChatIdResponse {
  chatId: string;
}

export interface MessageSetChatRedactionsRequest {
  type: typeof MESSAGE_SET_CHAT_REDACTIONS;
  redactions: Redactions;
}

export interface MessageGetChatRedactionsRequest {
  type: typeof MESSAGE_GET_CHAT_REDACTIONS;
}

export interface MessageGetChatRedactionsResponse {
  redactions: Redactions;
}

export interface MessageSetChatExcludedPIIRequest {
  type: typeof MESSAGE_SET_CHAT_EXCLUDED_PII;
  excludedPII: string[];
}

export interface MessageGetChatExcludedPIIRequest {
  type: typeof MESSAGE_GET_CHAT_EXCLUDED_PII;
}

export interface MessageGetChatExcludedPIIResponse {
  excludedPII: string[];
}

export type MessageRequest =
  | MessageSetExtensionStatusRequest
  | MessageGetExtensionStatusRequest
  | MessageGetChatIdRequest
  | MessageSetChatRedactionsRequest
  | MessageGetChatRedactionsRequest
  | MessageSetChatExcludedPIIRequest
  | MessageGetChatExcludedPIIRequest;

export type MessageResponse =
  | MessageGetExtensionStatusResponse
  | MessageGetChatIdResponse
  | MessageGetChatRedactionsResponse
  | MessageGetChatExcludedPIIResponse;
