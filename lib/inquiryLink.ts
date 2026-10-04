/**
 * Odkaz z e-mailu na konkrétní poptávku: /admin?inquiry=<klíč>.
 * Když správce není přihlášený, klíč si přihlašovací stránka uloží do
 * prohlížeče a administrace ho po přihlášení otevře (odkaz přežije i
 * přihlášení e-mailovým odkazem v jiné záložce).
 */
export const INQUIRY_PARAM = 'inquiry';
export const INQUIRY_STORE = 'elevate:admin-inquiry';
/** „inquiry:<čas ISO>:<8 znaků>" — nic jiného se z adresy nepřebírá */
export const INQUIRY_KEY = /^inquiry:[0-9TZ:.-]{20,30}:[0-9a-f]{8}$/;
export const isInquiryKey = (value: unknown): value is string => typeof value === 'string' && INQUIRY_KEY.test(value);
