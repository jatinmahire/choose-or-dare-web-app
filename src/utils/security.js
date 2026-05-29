// security.js — Input sanitization and validation utilities
// All user-supplied strings must pass through these functions before use.

import DOMPurify from 'dompurify';

/**
 * Sanitizes an arbitrary string: strips all HTML tags/attributes,
 * trims whitespace, and enforces a maximum length.
 *
 * @param {string} str - Raw input string
 * @param {number} max - Maximum allowed character length (default 500)
 * @returns {string} Clean, safe string
 */
export function sanitize(str, max = 500) {
  if (typeof str !== 'string') return '';
  const clean = DOMPurify.sanitize(str, {
    ALLOWED_TAGS:  [],   // strip every tag
    ALLOWED_ATTR:  [],   // strip every attribute
  });
  return clean.trim().slice(0, max);
}

/**
 * Sanitize a card text body (max 150 chars).
 * @param {string} str
 * @returns {string}
 */
export function sanitizeCard(str) {
  return sanitize(str, 150);
}

/**
 * Sanitize a player display name (max 50 chars).
 * @param {string} str
 * @returns {string}
 */
export function sanitizeName(str) {
  return sanitize(str, 50);
}

/**
 * Returns true if the given string is a valid UUID v4.
 * Used to validate room/session IDs before sending to the API.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function isValidRoomId(id) {
  if (typeof id !== 'string') return false;
  const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return UUID_V4.test(id);
}

/**
 * Returns true if the given string is a valid Firebase UID or similar user ID.
 * Accepts strings of 10–200 alphanumeric characters only.
 *
 * @param {string} uid
 * @returns {boolean}
 */
export function isValidUid(uid) {
  if (typeof uid !== 'string') return false;
  if (uid.length < 10 || uid.length > 200) return false;
  return /^[a-zA-Z0-9]+$/.test(uid);
}

/**
 * Escapes HTML special characters to prevent injection into innerHTML.
 * Use this when you must insert untrusted text directly into HTML strings.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}
