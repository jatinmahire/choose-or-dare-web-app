// debounce.js — Timing utility functions

/**
 * Returns a debounced version of fn that delays execution until
 * ms milliseconds have elapsed since the last call.
 * Default delay: 300ms (per PRD).
 *
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, ms);
  };
}

/**
 * Returns a throttled version of fn that executes at most once
 * per ms milliseconds based on timestamp comparison.
 * Default interval: 500ms (per PRD).
 *
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function throttle(fn, ms = 500) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= ms) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Returns a version of fn that executes only the very first time it is called.
 * All subsequent calls are silently ignored.
 *
 * @param {Function} fn
 * @returns {Function}
 */
export function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
