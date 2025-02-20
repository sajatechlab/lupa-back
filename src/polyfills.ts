import { ReadableStream } from 'web-streams-polyfill';
import { Buffer } from 'buffer';
import * as crypto from 'crypto';

// Add ReadableStream to global scope
(global as any).ReadableStream = ReadableStream;
(global as any).Buffer = Buffer;
(global as any).crypto = crypto;
