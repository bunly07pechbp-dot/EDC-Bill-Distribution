// ==========================================================================
// 🤖 AUTOMATION & AI ANALYSIS ENGINE (Compact: Show IN & Name Only)
// ==========================================================================

window.AutomationEngine = {
    _initialized: false,
    PRINT_ISSUES_KEY: 'EDC_PRINT_ISSUES',
    _printIssues: [],

    init: function() {
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

        // Print Issues Controls
        const inInput = document.getElementById('input-issue-in');
        if (inInput) {
            inInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addPrintIssue();
                }
            });
        }

        const noteInput = document.getElementById('input-issue-note');
        if (noteInput) {
            noteInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addPrintIssue();
                }
            });
        }

        document.getElementById('btn-export-print-issues')?.addEventListener('click', () => this.exportPrintIssues());

        document.getElementById('print-issues-tbody')?.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.btn-delete-issue');
            if (delBtn) {
                this.deletePrintIssue(delBtn.dataset.id);
            }
        });
    },

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

    // ⚡ មុខងារកត់ត្រារហ័ស
    addPrintIssue: function() {
        try {
            const inInput = document.getElementById('input-issue-in');
            const typeSelect = document.getElementById('select-issue-type');
            const noteInput = document.getElementById('input-issue-note');

            const rawIN = inInput?.value ? inInput.value.trim() : '';
            const canonicalIN = window.Utils?.normalizeIN ? window.Utils.normalizeIN(rawIN) : rawIN.replace(/\D/g, '');
            const issueType = typeSelect?.value || 'បោះពុម្ពមិនគ្រប់';
            const note = noteInput?.value ? noteInput.value.trim() : '';

            if (!canonicalIN) {
                if (window.Utils?.showAlert) window.Utils.showAlert('⚠️ សូមបញ្ចូលលេខ IN!');
                else alert('⚠️ សូមបញ្ចូលលេខ IN!');
                if (inInput) inInput.focus();
                return;
            }

            // ស្វែងរកព័ត៌មានអតិថិជនពី Master Data
            let matched = null;
            if (window.masterDataIndex && window.masterDataIndex.has(canonicalIN)) {
                matched = window.masterDataIndex.get(canonicalIN);
            } else if (window.Utils?.findByInvoice) {
                matched = window.Utils.findByInvoice(canonicalIN);
            }

            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const newRecord = {
                id: 'issue_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                invoice: canonicalIN,
                name: matched ? matched.name : 'ក្រៅ Master Data',
                box: matched ? matched.box : 'N/A',
                cabin: matched ? matched.cabin : (window.currentCabinGlobal || 'N/A'),
                issueType: issueType,
                note: note,
                recordedAt: timeStr
            };

            this._printIssues.unshift(newRecord);
            this.savePrintIssues();
            
            // ⚡ បង្ហាញចេញមកលើតារាងភ្លាមៗ
            this.renderPrintIssues();

            // Clear Input & Auto Focus
            if (inInput) {
                inInput.value = '';
                inInput.focus();
            }
            if (noteInput) noteInput.value = '';

            if (window.Utils?.showAlert) {
                window.Utils.showAlert(`✅ បានកត់ត្រា៖ IN ${canonicalIN} - ${newRecord.name}`);
            }
        } catch (err) {
            console.error('❌ Error in addPrintIssue:', err);
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

    // ⚡ បង្ហាញតែ ល.រ, លេខ IN, និង ឈ្មោះអតិថិជន
    renderPrintIssues: function() {
        const tbody = document.getElementById('print-issues-tbody');
        const badgeCount = document.getElementById('badge-issue-count');
        
        if (badgeCount) {
            badgeCount.innerText = `${this._printIssues.length} ផ្ទះ`;
        }

        if (!tbody) return;

        if (!this._printIssues || this._printIssues.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="text-align:center; padding:24px; color:var(--text-muted);">📭 មិនទាន់មានទិន្នន័យកត់ត្រាទេ</td></tr>`;
            return;
        }

        const esc = str => window.Utils?.escapeHtml ? window.Utils.escapeHtml(str) : String(str || '');

        tbody.innerHTML = this._printIssues.map((item, idx) => `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="text-align: center; font-weight: 600; color: var(--text-muted); padding: 10px 4px;">${idx + 1}</td>
                <td style="text-align: center; font-family: monospace; font-weight: 800; color: var(--primary); font-size: 14px; padding: 10px 4px;">${esc(item.invoice)}</td>
                <td style="text-align: left; font-weight: 700; color: var(--text-name); padding: 10px 8px;">${esc(item.name)}</td>
                <td style="text-align: center; padding: 10px 4px;">
                    <button type="button" class="btn btn-delete-issue" data-id="${esc(item.id)}" style="padding: 4px 8px; min-height: 28px; font-size: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;" title="លុបចោល">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    // 📤 Export Excel
    exportPrintIssues: function() {
        if (!this._printIssues || this._printIssues.length === 0) {
            if (window.Utils?.showAlert) window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ទេ!');
            else alert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ទេ!');
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
                if (window.Utils?.showAlert) window.Utils.showAlert('✅ Export របាយការណ៍សុំបោះពុម្ពរួចរាល់!');
            });
        } catch (err) {
            console.error('❌ Export print issues error:', err);
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
    if (window.AutomationEngine) {
        window.AutomationEngine.init();
    }
});
