const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'digitalbill.js'), 'utf8');
const context = { window: {}, console, setTimeout, clearTimeout, confirm: () => true };
context.window = context;
vm.createContext(context);
vm.runInContext(code, context);

const engine = context.window.DigitalBillEngine;

const sampleEntries = [
  { digitalColumn: '☑', printedColumn: '☑', columnDetected: true },
  { digitalColumn: '☑', printedColumn: '', columnDetected: true },
  { digitalColumn: '☑', printedColumn: '', columnDetected: true },
  { digitalColumn: '☑', printedColumn: '☑', columnDetected: true },
  { digitalColumn: '', printedColumn: '☑', columnDetected: true },
  { digitalColumn: '', printedColumn: '', columnDetected: true },
];

const classifications = sampleEntries.map((entry) => engine.classifyDeliveryEntry(entry));
const condition1 = classifications.filter((c) => c === 'condition1').length;
const condition2 = classifications.filter((c) => c === 'condition2').length;
const skipped = classifications.filter((c) => c === 'skipped').length;

if (condition1 !== 2 || condition2 !== 2 || skipped !== 2) {
  throw new Error(`Unexpected classification counts: condition1=${condition1}, condition2=${condition2}, skipped=${skipped}`);
}

console.log('digitalbill logic test passed');
