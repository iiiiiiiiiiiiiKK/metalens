/**
 * Escaping helpers. Generated markup must never be broken by the user's own
 * content, so every attribute value and text node goes through these.
 */

const ATTR_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes a string for use inside a double-quoted HTML attribute. */
export function escapeHtmlAttr(value: string): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ATTR_MAP[ch]);
}

/** Escapes a string for use as HTML text content. */
export function escapeHtmlText(value: string): string {
  return String(value ?? '').replace(/[&<>]/g, (ch) => ATTR_MAP[ch]);
}

/**
 * Normalises a value for output: control characters and newlines collapse to a
 * single space, because a raw newline inside a content attribute is legal but
 * almost always a mistake.
 */
export function normalizeAttrValue(value: string): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
