// ==========================================================================
// 🤖 AUTOMATION & AI ANALYSIS ENGINE (Includes Damaged/Missing Print Tracker)
// ==========================================================================

window.AutomationEngine = {
    _initialized: false,
    PRINT_ISSUES_KEY: 'EDC_PRINT_ISSUES',
    _printIssues: [],

    init: function() {
        if (this._initialized) return;
        console.log('🤖 Automation & AI Engine initializing...');
        this.loadPrintIssues();
        this.bindEvents();
        this.renderPrintIssues();
        this._initialized = true;
    },

    bindEvents: function() {
        document.getElementById('btn-auto-tag-digital')?.addEventListener('click', () => this.autoTagDigitalBills());
        document.getElementById('btn-analyze-route')?.addEventListener('click', () => this.analyzeRouteEfficiency());
        document.getElementById('btn-detect-anomalies')?.addEventListener('click', () => this.detectAnomalies());

        // Print Issues Events
        document.getElementById('btn-add-print-issue')?.addEventListener('click', () => this.addPrintIssue());
        document.getElementById('input-issue-in')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addPrintIssue();
        });
        document.getElementById('btn-export-print-issues')?.addEventListener('click', () => this.exportPrintIssues());

        document.getElementById('print-issues-tbody')?.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.btn-delete-issue');
            if (delBtn) {
                this.deletePrintIssue(delBtn.dataset.id);
            }
        });
    },

    // ============================================================
    // 🖨️ PRINT ISSUES MANAGEMENT (កត់ត្រាវិក្កយបត្រខ្វះ/ខូច)
    // ============================================================
    loadPrintIssues: function() {
        try {
            const raw = localStorage.getItem(this.PRINT_ISSUES_KEY);
            this._printIssues = raw ? JSON.parse(raw) : [];
        } catch (e) {
            this._printIssues = [];
        }
    },

    savePrintIssues: function() {
        try {
            localStorage.setItem(this.PRINT_ISSUES_KEY, JSON.stringify(this._printIssues));
            if (window.DBEngine?.isSupported?.()) {
                window.DBEngine.saveSetting('printIssues', this._printIssues);
            }
        } catch (e) {
            console.error('❌ Failed to save print issues:', e);
        }
    },

    addPrintIssue: function() {
        const inInput = document.getElementById('input-issue-in');
        const typeSelect = document.getElementById('select-issue-type');
        const noteInput = document.getElementById('input-issue-note');

        const rawIN = inInput?.value.trim();
        const canonicalIN = window.Utils?.normalizeIN ? window.Utils.normalizeIN(rawIN) : String(rawIN || '').trim();
        const issueType = typeSelect?.value || 'បោះពុម្ពមិនគ្រប់';
        const note = noteInput?.value.trim() || '';

        if (!canonicalIN) {
            window.Utils?.showAlert('⚠️ សូមបញ្ចូលលេខ IN!');
            return;
        }

        // ស្វែងរកព័ត៌មានអតិថិជនពី Master Data
        const matched = window.Utils?.findByInvoice(canonicalIN);

        const newRecord = {
            id: 'issue_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            invoice: canonicalIN,
            name: matched ? matched.name : 'ក្រៅ Master Data',
            box: matched ? matched.box : 'N/A',
            cabin: matched ? matched.cabin : (window.currentCabinGlobal || 'N/A'),
            issueType: issueType,
            note: note,
            recordedAt: window.Utils?.formatDateTime(new Date()) || new Date().toLocaleString()
        };

        this._printIssues.unshift(newRecord);
        this.savePrintIssues();
        this.renderPrintIssues();

        inInput.value = '';
        if (noteInput) noteInput.value = '';
        inInput.focus();

        window.Utils?.showAlert(`✅ បានកត់ត្រាលេខ IN ${canonicalIN} (${issueType})!`);
    },

    deletePrintIssue: function(id) {
        const item = this._printIssues.find(i => i.id === id);
        if (!item) return;

        if (confirm(`🗑️ លុបការកត់ត្រាលេខ IN: ${item.invoice} ចេញពីបញ្ជី?`)) {
            this._printIssues = this._printIssues.filter(i => i.id !== id);
            this.savePrintIssues();
            this.renderPrintIssues();
        }
    },

    renderPrintIssues: function() {
        const tbody = document.getElementById('print-issues-tbody');
        if (!tbody) return;

        if (this._printIssues.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state">📭 មិនទាន់មានទិន្នន័យកត់ត្រាទេ</td></tr>`;
            return;
        }

        const esc = str => window.Utils?.escapeHtml(str) || String(str || '');

        tbody.innerHTML = this._printIssues.map((item, idx) => `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="text-align: center; font-family: monospace; font-weight: bold; color: #2563eb;">${esc(item.invoice)}</td>
                <td style="text-align: left; font-weight: 700; color: var(--text-name);">${esc(item.name)}</td>
                <td style="text-align: center; color: #ea580c; font-weight: bold;">${esc(item.box)}</td>
                <td style="text-align: center;"><span class="status-badge" style="background: #fee2e2; color: #dc2626;">${esc(item.issueType)}</span></td>
                <td style="text-align: left; font-size: 12px; color: var(--text-secondary);">${esc(item.note || '-')}</td>
                <td style="text-align: center; font-size: 11px; color: var(--text-muted);">${esc(item.recordedAt)}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn btn-delete-issue" data-id="${esc(item.id)}" style="padding: 2px 8px; min-height: 28px; font-size: 11px; background: #dc2626; border-radius: 4px;">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    exportPrintIssues: function() {
        if (this._printIssues.length === 0) {
            window.Utils?.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ទេ!');
            return;
        }

        if (typeof ExcelJS === 'undefined') {
            window.Utils?.showAlert('❌ Library ExcelJS មិនត្រូវបានផ្ទុក!');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Re-Print Request');
            const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            sheet.mergeCells('A1:G1');
            sheet.getCell('A1').value = 'បញ្ជីស្នើសុំបោះពុម្ពវិក្កយបត្រឡើងវិញ (ខូច/មិនគ្រប់)';
            sheet.getCell('A1').font = { name: 'Khmer OS Muol Light', size: 13, bold: true };
            sheet.getCell('A1').alignment = { horizontal: 'center' };

            const headers = ['ល.រ', 'លេខ IN', 'ឈ្មោះអតិថិជន', 'ប្រអប់', 'កាប៊ីន', 'ប្រភេទបញ្ហា', 'កំណត់ចំណាំ'];
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
                    item.box,
                    item.cabin,
                    item.issueType,
                    item.note
                ];
                cells.forEach((val, cIdx) => {
                    const cell = row.getCell(cIdx + 1);
                    cell.value = val;
                    cell.font = { name: 'Khmer OS Battambang', size: 10 };
                    cell.alignment = { horizontal: (cIdx === 2 || cIdx === 6) ? 'left' : 'center', vertical: 'middle' };
                    cell.border = borderStyle;
                });
            });

            sheet.getColumn(1).width = 6;
            sheet.getColumn(2).width = 16;
            sheet.getColumn(3).width = 28;
            sheet.getColumn(4).width = 14;
            sheet.getColumn(5).width = 14;
            sheet.getColumn(6).width = 20;
            sheet.getColumn(7).width = 30;

            workbook.xlsx.writeBuffer().then(buffer => {
                const dateStr = new Date().toISOString().slice(0, 10);
                saveAs(new Blob([buffer]), `RePrint_Request_${dateStr}.xlsx`);
                window.Utils?.showAlert('✅ Export របាយការណ៍សុំបោះពុម្ពរួចរាល់!');
            });
        } catch (err) {
            console.error('❌ Export print issues error:', err);
            window.Utils?.showAlert('❌ Export បរាជ័យ!');
        }
    },

    // ============================================================
    // AI & ROUTE ANALYTICS
    // ============================================================
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

            if (row.status === 'ផ្អាកប្រើ' || window.Utils?.hasMethod(row.method, 'suspended')) suspended.push(row);
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
                if (!window.Utils?.hasMethod(row.method, 'digital')) {
                    row.method = window.Utils?.mergeMethod(row.method, 'digital');
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

document.addEventListener('DOMContentLoaded', function() {
    if (window.AutomationEngine && typeof window.AutomationEngine.init === 'function') {
        window.AutomationEngine.init();
    }
});
