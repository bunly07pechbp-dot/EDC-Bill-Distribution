// ==========================================================================
// 📲 Digital Bill Report Import (Glyph detection & Canonical IN Mapping)
// ==========================================================================
window.DigitalBillEngine = {
    CHECKED_CODE: 0xF0FE,
    UNCHECKED_CODE: 0xF0A8,
    CHECKBOX_OFFSET_FROM_HEADER: 12,
    ROW_Y_TOL: 5,
    CHECKBOX_Y_WINDOW: 8,
    CHECKBOX_X_TOL: 10,

    init: function() {
        const fileInput = document.getElementById('digitalbill-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', this.importPdf.bind(this));
        }
    },

    _getPageItems: async function(page) {
        const content = await page.getTextContent();
        return content.items.map((item) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5]
        }));
    },

    _groupItemsByRow: function(items) {
        const rows = [];
        items.forEach((item) => {
            let row = rows.find((r) => Math.abs(r.y - item.y) <= this.ROW_Y_TOL);
            if (!row) { row = { y: item.y, items: [] }; rows.push(row); }
            row.items.push(item);
        });
        return rows;
    },

    _findPrintedColumnX: function(items) {
        const printedItem = items.find((i) => i.str.includes('ពុម') || i.str.includes('ោះព'));
        return printedItem ? printedItem.x + this.CHECKBOX_OFFSET_FROM_HEADER : null;
    },

    extractRows: async function(pdf) {
        const allRows = [];
        let printedColX = null;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const items = await this._getPageItems(page);

            if (printedColX === null) {
                const found = this._findPrintedColumnX(items);
                if (found !== null) printedColX = found;
            }

            const rows = this._groupItemsByRow(items);
            rows.forEach((row) => {
                const rowText = row.items.map((i) => i.str).join(' ');
                const invMatch = rowText.match(/\b\d{6,8}\b/);
                if (!invMatch) return;
                const invoice = window.Utils.normalizeIN(invMatch[0]);

                let printedChecked = null;
                if (printedColX !== null) {
                    const nearbyItems = items.filter((i) =>
                        Math.abs(i.y - row.y) <= this.CHECKBOX_Y_WINDOW &&
                        Math.abs(i.x - printedColX) <= this.CHECKBOX_X_TOL
                    );
                    for (const it of nearbyItems) {
                        for (let k = 0; k < it.str.length; k++) {
                            const code = it.str.charCodeAt(k);
                            if (code === this.CHECKED_CODE) { printedChecked = true; break; }
                            if (code === this.UNCHECKED_CODE) { printedChecked = false; break; }
                        }
                        if (printedChecked !== null) break;
                    }
                }

                allRows.push({ invoice, printedChecked, columnDetected: printedColX !== null });
            });
        }

        return { rows: allRows, headerFound: printedColX !== null };
    },

    extractSummaryTotals: function(fullText) {
        try {
            const totalMatch = fullText.match(/ឌីជីថល[៖:]\s*(\d+)/);
            const notPrintedMatch = fullText.match(/មិន\s*េបាះពុម(?:្ព)?[៖:]\s*(\d+)/);
            const printedMatch = fullText.match(/(?<!មិន\s{0,3})េបាះពុម(?:្ព)?[៖:]\s*(\d+)/);
            return {
                total: totalMatch ? parseInt(totalMatch[1], 10) : null,
                printed: printedMatch ? parseInt(printedMatch[1], 10) : null,
                notPrinted: notPrintedMatch ? parseInt(notPrintedMatch[1], 10) : null
            };
        } catch (e) {
            return { total: null, printed: null, notPrinted: null };
        }
    },

    importPdf: function(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        console.log('[DigitalBill] File selected:', file.name, file.size, 'bytes');

        if (typeof pdfjsLib === 'undefined') {
            console.error('[DigitalBill] pdfjsLib is not loaded.');
            window.Utils.showAlert('❌ Library PDF មិនត្រូវបានផ្ទុក! សូមពិនិត្យអ៊ីនធឺណិត។');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => {
            console.error('[DigitalBill] FileReader error:', reader.error);
            window.Utils.showAlert('❌ ការអានហ្វាល់ PDF បរាជ័យ!');
            event.target.value = '';
        };

        reader.onload = async (e) => {
            try {
                const typedArray = new Uint8Array(e.target.result);

                const loadingTask = pdfjsLib.getDocument({
                    data: typedArray,
                    disableWorker: true,
                    useSystemFonts: true,          
                    disableFontFace: false,
                    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                    cMapPacked: true
                });

                const pdf = await loadingTask.promise;
                console.log('[DigitalBill] PDF loaded, pages:', pdf.numPages);

                const { rows: extractedRows, headerFound } = await this.extractRows(pdf);
                console.log('[DigitalBill] Extracted rows:', extractedRows.length);

                let fullText = '';
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const content = await page.getTextContent();
                    fullText += content.items.map((item) => item.str).join(' ') + '\n';
                }

                if (extractedRows.length === 0) {
                    window.Utils.showAlert('⚠️ រកមិនឃើញលេខ IN ណាមួយក្នុង PDF។');
                    return;
                }

                if (!window.masterData || window.masterData.length === 0) {
                    window.Utils.showAlert('⚠️ សូម Import Master Data ជាមុនសិន!');
                    return;
                }

                const seenInvoices = new Set();
                const matchedEntries = [];
                let notFoundCount = 0;

                extractedRows.forEach((r) => {
                    const canonical = window.Utils.normalizeIN(r.invoice);
                    if (!canonical || seenInvoices.has(canonical)) return;
                    seenInvoices.add(canonical);
                    
                    const masterRow = window.Utils.findByInvoice(canonical);
                    if (masterRow) {
                        matchedEntries.push({ row: masterRow, canonicalInvoice: canonical, printedChecked: r.printedChecked, columnDetected: r.columnDetected });
                    } else {
                        notFoundCount++;
                    }
                });

                if (matchedEntries.length === 0) {
                    window.Utils.showAlert(`⚠️ គ្មានលេខ IN ណាត្រូវគ្នានឹង Master Data។`);
                    return;
                }

                const condition1Entries = [];
                const condition2Entries = [];
                const undetectedEntries = [];

                matchedEntries.forEach((entry) => {
                    if (!entry.columnDetected || entry.printedChecked === null) {
                        undetectedEntries.push(entry);
                        condition1Entries.push(entry);
                        return;
                    }
                    if (entry.printedChecked) condition1Entries.push(entry);
                    else condition2Entries.push(entry);
                });

                const summary = this.extractSummaryTotals(fullText);
                let validationNote = '';
                if (headerFound && summary.printed !== null && summary.notPrinted !== null) {
                    validationNote = `\nℹ️ របាយការណ៍៖ Printed ${summary.printed} / Not Printed ${summary.notPrinted}`;
                }

                const notFoundMsg = notFoundCount > 0 ? `\n(មិនឃើញ ${notFoundCount} លេខ IN ក្នុង Master Data)` : '';
                const detectionWarning = undetectedEntries.length > 0
                    ? `\n\n⚠️ មិនឃើញ checkbox ច្បាស់លាស់សម្រាប់ ${undetectedEntries.length} ជួរ — នឹងប្រើលក្ខខណ្ឌ១ (សុវត្ថិភាព)។`
                    : '';

                const confirmMsg =
                    `📲 បានស្រង់ ${seenInvoices.size} លេខ IN ពី PDF ត្រូវគ្នា ${matchedEntries.length} ជួរ។${notFoundMsg}\n\n` +
                    `🏷️ លក្ខខណ្ឌ១ (Digital + Printed)៖ ${condition1Entries.length} ជួរ — បន្ថែមស្លាក Digital (រក្សាស្ថានភាពចែក)\n` +
                    `✅ លក្ខខណ្ឌ២ (Digital + មិន Printed)៖ ${condition2Entries.length} ជួរ — សម្គាល់ "បានចែករួចរាល់"${validationNote}${detectionWarning}\n\n` +
                    `អនុវត្តទេ?`;

                if (!confirm(confirmMsg)) return;

                const nowStamp = window.Utils.formatDateTime(new Date());

                // Condition 1: Add digital tag, DO NOT reset delivery state
                condition1Entries.forEach((entry) => {
                    entry.row.method = window.Utils.mergeMethod(entry.row.method, 'digital');
                    if (window.JobsEngine && typeof window.JobsEngine.recordDelivery === 'function') {
                        if (window.Utils.isCompletedStatus(entry.row.status)) {
                            window.JobsEngine.recordDelivery(entry.canonicalInvoice, entry.row.status, entry.row.method, entry.row.deliveredAt || nowStamp);
                        }
                    }
                });

                // Condition 2: Mark as Delivered and sync with Job Engine
                condition2Entries.forEach((entry) => {
                    entry.row.method = window.Utils.mergeMethod(entry.row.method, 'digital');
                    entry.row.status = 'បានចែករួចរាល់';
                    entry.row.deliveredAt = nowStamp;
                    if (window.JobsEngine && typeof window.JobsEngine.recordDelivery === 'function') {
                        window.JobsEngine.recordDelivery(entry.canonicalInvoice, 'បានចែករួចរាល់', entry.row.method, nowStamp);
                    }
                });

                window.StorageEngine.saveMasterCache();
                window.StorageEngine.saveProgress();
                window.StorageEngine.loadHistoryList();

                if (window.JobsEngine && typeof window.JobsEngine.renderJobsList === 'function') {
                    window.JobsEngine.renderJobsList();
                }

                window.Utils.showAlert(
                    `✅ បានធីករួច!\n` +
                    `🏷️ ${condition1Entries.length} ជួរ បញ្ចូលស្លាក Digital\n` +
                    `✅ ${condition2Entries.length} ជួរ សម្គាល់ "បានចែករួចរាល់"`
                );

            } catch (err) {
                console.error('[DigitalBill] ❌ PDF import error:', err);
                window.Utils.showAlert(`❌ ការអាន PDF បរាជ័យ! ${err.message || 'មិនស្គាល់'}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.DigitalBillEngine.init();
});