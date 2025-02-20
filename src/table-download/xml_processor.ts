import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import {
  InvoiceData,
  UBLEXTENSIONS_FIELDS,
  INVOICE_GENERAL_FIELDS,
  ACCOUNTING_SUPPLIER_FIELDS,
  ACCOUNTING_CUSTOMER_FIELDS,
  INVOICE_LINES,
  XML_MAPPINGS,
} from './field_definitions';
import { promisify } from 'util';
import * as xlsx from 'xlsx';

const parseString = promisify(xml2js.parseString);

class XMLProcessor {
  private namespaces = {
    ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    sts: 'dian:gov:co:facturaelectronica:Structures-2-1',
    cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    ds: 'http://www.w3.org/2000/09/xmldsig#',
  };

  private extractFieldValue(
    root: any,
    fieldName: string,
    lineContext: any = null,
  ): string | null {
    const xpath = XML_MAPPINGS[fieldName];
    if (!xpath) return null;

    let context = lineContext ? lineContext : root;

    // Handle attribute extraction
    if (xpath.includes('@')) {
      const [parentXPath, attrName] = xpath.split('@');
      const parent = this.findElement(context, parentXPath);
      return parent ? parent[attrName] : null;
    } else {
      const element = this.findElement(context, xpath);
      return element ? element : null;
    }
  }

  private findElement(context: any, xpath: string) {
    // Implement your own logic to find elements based on the xpath
    // This is a placeholder for actual XPath handling
    return context; // Replace with actual logic
  }

  public async processHeaderData(
    xmlFile: string,
    root: any,
  ): Promise<InvoiceData> {
    const data: InvoiceData = { FileName: path.basename(xmlFile) };
    const allFields = [
      ...INVOICE_GENERAL_FIELDS,
      ...UBLEXTENSIONS_FIELDS,
      ...ACCOUNTING_SUPPLIER_FIELDS,
      ...ACCOUNTING_CUSTOMER_FIELDS,
    ];

    for (const fieldName of allFields) {
      const value = this.extractFieldValue(root, fieldName);
      if (value !== null) {
        data[fieldName] = value; // Type assertion
      }
    }

    return data;
  }

  public async processLineItems(xmlFile: string, root: any): Promise<any[]> {
    const lineItems: any[] = [];
    const invoiceLines = root.findall('.//cac:InvoiceLine');

    for (const line of invoiceLines) {
      const lineData: any = { FileName: path.basename(xmlFile) };
      for (const fieldName of INVOICE_LINES) {
        const value = this.extractFieldValue(root, fieldName, line);
        lineData[fieldName] = value;
      }
      lineItems.push(lineData);
    }

    return lineItems;
  }

  public async processXMLFile(xmlFile: string): Promise<[InvoiceData, any[]]> {
    try {
      const xmlContent = await fs.promises.readFile(xmlFile, 'utf-8');
      const result = await parseString(xmlContent);
      const headerData = await this.processHeaderData(xmlFile, result);
      const lineItems = await this.processLineItems(xmlFile, result);
      return [headerData, lineItems];
    } catch (error) {
      console.error(`Error processing ${xmlFile}: ${error}`);
      return [null, []];
    }
  }

  public async processFolder(folderPath: string): Promise<[any[], any[]]> {
    const folder = path.resolve(folderPath);
    const xmlFiles = fs
      .readdirSync(folder)
      .filter((file) => file.endsWith('.xml'));
    const headerResults: InvoiceData[] = [];
    const lineResults: any[] = [];

    for (const xmlFile of xmlFiles) {
      const [headerData, lineItems] = await this.processXMLFile(
        path.join(folder, xmlFile),
      );
      if (headerData) headerResults.push(headerData);
      lineResults.push(...lineItems);
    }

    return [headerResults, lineResults];
  }
}

export async function processInvoices(inputFolder: string, outputFile: string) {
  const processor = new XMLProcessor();
  const [headerResults, lineResults] = await processor.processFolder(
    inputFolder,
  );

  if (headerResults.length > 0 || lineResults.length > 0) {
    const workbook = xlsx.utils.book_new();

    // Create sheets
    const headerSheet = xlsx.utils.json_to_sheet(headerResults);
    xlsx.utils.book_append_sheet(workbook, headerSheet, 'Header');

    const lineSheet = xlsx.utils.json_to_sheet(lineResults);
    xlsx.utils.book_append_sheet(workbook, lineSheet, 'Lines');

    // Write to file
    xlsx.writeFile(workbook, outputFile);
    console.log(`Results saved to: ${outputFile}`);
  } else {
    console.warn('No data to save');
  }
}

// Example usage
(async () => {
  const inputFolder = path.join(__dirname, 'XML');
  const outputFile = path.join(__dirname, 'Facturacion_Electronica.xlsx');
  await processInvoices(inputFolder, outputFile);
})();
