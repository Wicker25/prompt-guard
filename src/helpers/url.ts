import { SUPPORTED_PLATFORM_DOMAINS } from '../constants';

export const parseChatIdFromUrl = (url: string): string => {
  const match = url.match(/\/c\/([a-f0-9-]+)/i);
  return match ? match[1] : 'pending';
};

export const isSupportedPlatformUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return SUPPORTED_PLATFORM_DOMAINS.some((domain) => hostname === domain);
  } catch {
    return false;
  }
};
