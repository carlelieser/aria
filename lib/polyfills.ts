import 'react-native-url-polyfill/auto';
// @ts-expect-error - event-target-shim types issue with package.json exports
import { Event, EventTarget } from 'event-target-shim';
import { TextEncoder, TextDecoder } from 'text-encoding';
import { ReadableStream } from 'web-streams-polyfill';

globalThis.EventTarget = EventTarget as unknown as typeof globalThis.EventTarget;
globalThis.Event = Event as unknown as typeof globalThis.Event;

if (typeof globalThis.TextEncoder === 'undefined') {
	globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
	globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

if (typeof globalThis.ReadableStream === 'undefined') {
	globalThis.ReadableStream = ReadableStream as unknown as typeof globalThis.ReadableStream;
}
