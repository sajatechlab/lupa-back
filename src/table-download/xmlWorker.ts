const { parentPort } = require('worker_threads');
const xml2js = require('xml2js');

parentPort.on('message', async (xmlContent) => {
  try {
    const parser = new xml2js.Parser({ explicitArray: false, trim: true, xmlns: true });
    const result = await parser.parseStringPromise(xmlContent);
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({ error });
  }
});