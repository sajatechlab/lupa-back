import { ReadableStream } from 'web-streams-polyfill';
import { Buffer } from 'buffer';

// Add ReadableStream to global scope
(global as any).ReadableStream = ReadableStream;
(global as any).Buffer = Buffer;
