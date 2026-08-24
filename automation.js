// ==========================================================================
// 🤖 AUTOMATION & PRINT ISSUES ENGINE (Bulletproof & Self-Contained)
// ==========================================================================

window.AutomationEngine = {
    _initialized: false,
    PRINT_ISSUES_KEY: 'EDC_PRINT_ISSUES',
    _printIssues: [],

    init: function() {
        console.log('🤖 AutomationEngine.init() starting...');
        this.loadPrintIssues();
        this.bindEvents();
        this.renderPrintIssues();
        this._initialized = true;
        console.log('✅ AutomationEngine initialized successfully.');
    },

    bindEvents: function() {
        // AI Analytics Buttons
        document.getElementById('btn-auto-tag-digital')?.addEventListener('click', () => this.autoTagDigitalBills());
        document.getElementById('btn-analyze-route')?.addEventListener('click', () => this.analyzeRouteEfficiency());
        document.getElementById('btn-detect-anomalies')?.addEventListener('click', () => this.detectAnomalies());

        // Add Issue Button
        const addBtn = document.getElementById('btn-add-print-issue');
        if (addBtn) {
            addBtn.onclick = (e) => {
                e.preventDefault();
                this.addPrintIssue();
            };
        }

        // Enter Key for Input
        const inInput = document.getElementById('input-issue-in');
        if (inInput) {
            inInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addPrintIssue();
                }
            };
        }

        const noteInput = document.getElementById('input-issue-note');
        if (noteInput) {
            noteInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addPrintIssue();
                }
            };
        }

        // Export Button
        const exportBtn = document.getElementById('btn-export-print-issues');
        if (exportBtn) {
            exportBtn.onclick = (e) => {
                e.preventDefault();
                this.exportPrintIssues();
            };
        }
    },

    loadPrintIssues: function() {
        try {
            const raw = localStorage.getItem(this.PRINT_ISSUES_KEY);
            this._printIssues = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(this._printIssues)) this._printIssues = [];
        } catch (e) {
            console.error('❌ Failed to load print issues from localStorage:', e);
            this._printIssues = [];
        }
    },

    savePrintIssues: function() {
        try {
            localStorage.setItem(this.PRINT_ISSUES_KEY, JSON.stringify(this._printIssues));
            if (window.DBEngine && typeof window.DBEngine.saveSetting === 'function') {
                window.DBEngine.saveSetting('printIssues', this._printIssues);
            }
        } catch (e) {
            console.error('❌ Failed to save print issues:', e);
        }
    },

    // ⚡ មុខងារកត់ត្រា (ដំណើរការភ្លាមៗ ១០០%)
    addPrintIssue: function() {
        try {
            const inInput = document.getElementById('input-issue-in');
            const typeSelect = document.getElementById('select-issue-type');
            const noteInput = document.getElementById('input-issue-note');

            const rawVal = inInput ? inInput.value.trim() : '';
            
            // Clean/Normalize IN Number
            let canonicalIN = rawVal;
            if (window.Utils && typeof window.Utils.normalizeIN === 'function') {
                canonicalIN = window.Utils.normalizeIN(rawVal);
            } else {
                canonicalIN = rawVal.replace(/[^\d\w]/g, '').trim();
            }

            if (!canonicalIN) {
                alert('⚠️ សូមបញ្ចូលលេខ IN!');
                if (inInput) inInput.focus();
                return;
            }

            const issueType = typeSelect ? typeSelect.value : 'បោះពុម្ពមិនគ្រប់';
            const note = noteInput ? noteInput.value.trim() : '';

            // ស្វែងរកព័ត៌មានអតិថិជនពី Master Data
            let matchedName = 'ក្រៅ Master Data';
            let matchedBox = 'N/A';
            let matchedCabin = window.currentCabinGlobal || 'N/A';

            if (window.masterDataIndex && window.masterDataIndex.has(canonicalIN)) {
                const rec = window.masterDataIndex.get(canonicalIN);
                if (rec) {
                    matchedName = rec.name || matchedName;
                    matchedBox = rec.box || matchedBox;
                    matchedCabin = rec.cabin || matchedCabin;
                }
            } else if (Array.isArray(window.masterData)) {
                const rec = window.masterData.find(r => String(r.invoice || '').trim() === canonicalIN);
                if (rec) {
                    matchedName = rec.name || matchedName;
                    matchedBox = rec.box || matchedBox;
                    matchedCabin = rec.cabin || matchedCabin;
                }
            }

            // Time string
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}`;

            const newRecord = {
                id: 'issue_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                invoice: canonicalIN,
                name: matchedName,
                box: matchedBox,
                cabin: matchedCabin,
                issueType: issueType,
                note: note,
                recordedAt: timeStr
            };

            // បញ្ចូលទៅខាងលើគេបង្អស់
            this._printIssues.unshift(newRecord);
            this.savePrintIssues();
            
            // ⚡ បង្ហាញចេញមកលើតារាងភ្លាមៗ
            this.renderPrintIssues();

            // Clear inputs
            if (inInput) {
                inInput.value = '';
                inInput.focus();
            }
            if (noteInput) noteInput.value = '';

            if (window.Utils && typeof window.Utils.showAlert === 'function') {
                window.Utils.showAlert(`✅ បានកត់ត្រា៖ IN ${canonicalIN} (${matchedName})`);
            } else {
                console.log(`✅ Recorded: IN ${canonicalIN}`);
            }

        } catch (err) {
            console.error('❌ Critical Error in addPrintIssue:', err);
            alert('❌ មានបញ្ហាក្នុងការកត់ត្រា៖ ' + err.message);
        }
    },

    deletePrintIssue: function(id) {
        const item = this._printIssues.find(i => i.id === id);
        if (!item) return;

        if (confirm(`🗑️ លុបលេខ IN: ${item.invoice} (${item.name}) ចេញពីបញ្ជី?`)) {
            this._printIssues = this._printIssues.filter(i => i.id !== id);
            this.savePrintIssues();
            this.renderPrintIssues();
        }
    },

    // ⚡ Render ចេញមកលើអេក្រង់ផ្ទាល់ (បង្ហាញតែ ល.រ, លេខ IN, ឈ្មោះអតិថិជន និងប៊ូតុងលុប)
    renderPrintIssues: function() {
        const tbody = document.getElementById('print-issues-tbody');
        const badgeCount = document.getElementById('badge-issue-count');
        
        if (badgeCount) {
            badgeCount.innerText = `${this._printIssues.length} ផ្ទះ`;
        }

        if (!tbody) return;

        if (!this._printIssues || this._printIssues.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--text-muted);">📭 មិនទាន់មានទិន្នន័យកត់ត្រាទេ</td></tr>`;
            return;
        }

        const esc = (str) => {
            if (!str) return '';
            return String(str).replace(/[&<>"']/g, (c) => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[c]));
        };

        let html = '';
        for (let i = 0; i < this._printIssues.length; i++) {
            const item = this._printIssues[i];
            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="text-align: center; font-weight: 600; color: var(--text-muted); padding: 10px 4px;">${i + 1}</td>
                    <td style="text-align: center; font-family: monospace; font-weight: 800; color: var(--primary); font-size: 14px; padding: 10px 4px;">${esc(item.invoice)}</td>
                    <td style="text-align: left; font-weight: 700; color: var(--text-name); padding: 10px 8px;">${esc(item.name)}</td>
                    <td style="text-align: center; padding: 10px 4px;">
                        <button type="button" onclick="window.AutomationEngine.deletePrintIssue('${item.id}')" style="padding: 4px 8px; min-height: 28px; font-size: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;" title="លុបចោល">🗑️</button>
                    </td>
                </tr>
            `;
        }

        tbody.innerHTML = html;
    },

    exportPrintIssues: function() {
        if (!this._printIssues || this._printIssues.length === 0) {
            alert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ទេ!');
            return;
        }

        if (typeof ExcelJS === 'undefined') {
            alert('❌ Library ExcelJS មិនត្រូវបានផ្ទុក!');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Re-Print Request');
            const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            sheet.mergeCells('A1:D1');
            sheet.getCell('A1').value = 'បញ្ជីស្នើសុំបោះពុម្ពវិក្កយបត្រឡើងវិញ';
            sheet.getCell('A1').font = { name: 'Khmer OS Muol Light', size: 13, bold: true };
            sheet.getCell('A1').alignment = { horizontal: 'center' };

            const headers = ['ល.រ', 'លេខ IN', 'ឈ្មោះអតិថិជន', 'ប្រភេទបញ្ហា'];
            const headerRow = sheet.getRow(3);
            headerRow.height = 25;
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { name: 'Khmer OS Battambang', size: 10, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                cell.border = borderStyle;
            });

            this._printIssues.forEach((item, idx) => {
                const row = sheet.getRow(idx + 4);
                const cells = [
                    idx + 1,
                    item.invoice,
                    item.name,
                    item.issueType
                ];
                cells.forEach((val, cIdx) => {
                    const cell = row.getCell(cIdx + 1);
                    cell.value = val;
                    cell.font = { name: 'Khmer OS Battambang', size: 10 };
                    cell.alignment = { horizontal: (cIdx === 2) ? 'left' : 'center', vertical: 'middle' };
                    cell.border = borderStyle;
                });
            });

            sheet.getColumn(1).width = 6;
            sheet.getColumn(2).width = 18;
            sheet.getColumn(3).width = 32;
            sheet.getColumn(4).width = 20;

            workbook.xlsx.writeBuffer().then(buffer => {
                const dateStr = new Date().toISOString().slice(0, 10);
                saveAs(new Blob([buffer]), `RePrint_Request_${dateStr}.xlsx`);
                if (window.Utils && typeof window.Utils.showAlert === 'function') {
                    window.Utils.showAlert('✅ Export របាយការណ៍សុំបោះពុម្ពរួចរាល់!');
                } else {
                    alert('✅ Export របាយការណ៍សុំបោះពុម្ពរួចរាល់!');
                }
            });
        } catch (err) {
            console.error('❌ Export error:', err);
            alert('❌ Export បរាជ័យ៖ ' + err.message);
        }
    },

    _showResult: function(title, content, isError = false) {
        const results = document.getElementById('analytics-results');
        const contentEl = document.getElementById('analytics-result-content');
        if (results && contentEl) {
            results.style.display = 'block';
            contentEl.innerHTML = `<strong>${title}</strong>\n\n${content}`;
            contentEl.style.color = isError ? '#dc2626' : 'var(--text)';
        } else {
            alert(`${title}\n\n${content}`);
        }
    },

    analyzeRouteEfficiency: function() {
        if (!window.masterData || window.masterData.length === 0) {
            this._showResult('⚠️ គ្មានទិន្នន័យ', 'សូម Import Master Data ជាមុនសិន!', true);
            return;
        }

        const data = window.masterData;
        const cabinCount = new Set(data.map(r => r.cabin)).size;
        const totalRecords = data.length;
        const avgDensity = Math.round(totalRecords / (cabinCount || 1));
        let optimizationScore = Math.min(98, Math.max(60, Math.round((avgDensity / 50) * 85)));

        let recommendation = "លំដាប់ផ្លូវដើរបច្ចុប្បន្នមានប្រសិទ្ធភាពល្អ";
        if (avgDensity > 120) recommendation = "គួរពុះចែកកាប៊ីនជា ២ ផ្នែក ដើម្បីរៀបផ្លូវដើរបានលឿនជាងមុន";
        else if (avgDensity > 80) recommendation = "ផ្លូវដើរកំពុងផ្ទុកល្មម អាចបង្កើនប្រសិទ្ធភាពដោយរៀបតាមទីតាំងជិតគ្នា";

        const result = `
📊 Route Efficiency Analysis

📌 ចំនួនកាប៊ីនសរុប: ${cabinCount}
📌 ចំនួនផ្ទះសរុប: ${totalRecords}
📌 ដង់ស៊ីតេមធ្យម: ${avgDensity} ផ្ទះ/កាប៊ីន
📌 ពិន្ទុប្រសិទ្ធភាព: ${optimizationScore}%

💡 អនុសាសន៍: ${recommendation}
        `;
        this._showResult('🗺️ Route Efficiency Analysis', result);
    },

    detectAnomalies: function() {
        if (!window.masterData || window.masterData.length === 0) {
            this._showResult('⚠️ គ្មានទិន្នន័យ', 'សូម Import Master Data ជាមុនសិន!', true);
            return;
        }

        const data = window.masterData;
        const seenInvoices = new Map();
        const duplicates = [], suspended = [], missingInfo = [];

        data.forEach((row, index) => {
            const canonical = window.Utils?.normalizeIN ? window.Utils.normalizeIN(row.invoice) : String(row.invoice || '').trim();
            if (seenInvoices.has(canonical)) duplicates.push({ invoice: row.invoice, name: row.name, index: index });
            else seenInvoices.set(canonical, index);

            if (row.status === 'ផ្អាកប្រើ' || (window.Utils?.hasMethod && window.Utils.hasMethod(row.method, 'suspended'))) suspended.push(row);
            if (!row.address || row.address === 'មិនមានអាសយដ្ឋាន' || row.address === 'N/A') missingInfo.push(row);
        });

        let result = `
🚨 Anomaly Detection Report

📌 ចំនួនសរុប: ${data.length}
📌 ស្ទួន (Duplicate): ${duplicates.length}
📌 ផ្អាកប្រើ (Suspended): ${suspended.length}
📌 ខ្វះអាសយដ្ឋាន: ${missingInfo.length}
        `;

        if (duplicates.length > 0) result += `\n🔁 ស្ទួន IN: ${duplicates.map(d => d.invoice).join(', ')}`;
        if (suspended.length > 0 && suspended.length <= 10) result += `\n⏸️ ផ្អាកប្រើ: ${suspended.map(r => r.invoice).join(', ')}`;
        else if (suspended.length > 10) result += `\n⏸️ ផ្អាកប្រើ ${suspended.length} ជួរ (បង្ហាញតែ ១០ ដំបូង): ${suspended.slice(0, 10).map(r => r.invoice).join(', ')}...`;

        this._showResult('🚨 Anomaly Detection', result);
    },

    autoTagDigitalBills: function() {
        if (!window.masterData || window.masterData.length === 0) {
            this._showResult('⚠️ គ្មានទិន្នន័យ', 'សូម Import Master Data ជាមុនសិន!', true);
            return;
        }

        let taggedCount = 0;
        window.masterData.forEach(row => {
            if (row.digitalNote && row.digitalNote.toLowerCase().includes('digital')) {
                if (!window.Utils?.hasMethod || !window.Utils.hasMethod(row.method, 'digital')) {
                    row.method = window.Utils?.mergeMethod ? window.Utils.mergeMethod(row.method, 'digital') : 'digital';
                    taggedCount++;
                }
            }
        });

        if (taggedCount > 0 && window.StorageEngine) {
            window.StorageEngine.saveMasterCache();
            window.StorageEngine.persistAll();
        }

        const result = `
🏷️ Auto-Tag Digital Bills

✅ បានធីក Digital ចំនួន: ${taggedCount} ជួរ
📌 សរុប ${window.masterData.length} ផ្ទះ

${taggedCount > 0 ? '💾 ទិន្នន័យត្រូវបានរក្សាទុក!' : 'ℹ️ គ្មានជួរណាដែលត្រូវធីកទេ (ពិនិត្យមើល column "digitalNote")'}
        `;
        this._showResult('🏷️ Auto-Tag Digital Bills', result);
    }
};

// Auto Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AutomationEngine.init());
} else {
    window.AutomationEngine.init();
}
