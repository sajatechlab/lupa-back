import { parentPort } from 'worker_threads';
import * as xml2js from 'xml2js';

interface WorkerMessage {
  xmlContent: string;
  type: 'Received' | 'Sent';
  fileName: string;
}

if (parentPort) {
  parentPort.on('message', async (message: WorkerMessage) => {
    try {
      const { xmlContent, type, fileName } = message;

      const parser = new xml2js.Parser({
        explicitArray: false,
        trim: true,
        mergeAttrs: false,
        tagNameProcessors: [],
        attrNameProcessors: [],
        valueProcessors: [], // Remove automatic number parsing
        xmlns: true,
      });

      const parserResult = await parser.parseStringPromise(xmlContent);

      parentPort?.postMessage({
        success: true,
        data: {
          result: parserResult.Invoice,
          type,
          fileName,
        },
      });
    } catch (error) {
      parentPort?.postMessage({
        success: false,
        error: error.message,
      });
    }
  });
}
