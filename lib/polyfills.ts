/**
 * Polyfills for React Native
 * These are required for youtubei.js to work properly
 */

// URL polyfill - must be imported before anything else
import 'react-native-url-polyfill/auto';

// EventTarget and Event polyfills
// @ts-expect-error - event-target-shim types issue with package.json exports
import { Event, EventTarget } from 'event-target-shim';
globalThis.EventTarget = EventTarget as unknown as typeof globalThis.EventTarget;
globalThis.Event = Event as unknown as typeof globalThis.Event;

// TextEncoder/TextDecoder polyfill
import { TextEncoder, TextDecoder } from 'text-encoding';
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

// ReadableStream polyfill
import { ReadableStream } from 'web-streams-polyfill';
if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as unknown as typeof globalThis.ReadableStream;
}

console.log('[Polyfills] Loaded successfully');
