// ==========================================================================
// 🤖 AUTOMATION & AI ANALYSIS ENGINE (Smart Name Lookup & Auto-Recovery)
// ==========================================================================

window.AutomationEngine = {
    _initialized: false,
    PRINT_ISSUES_KEY: 'EDC_PRINT_ISSUES',
    _printIssues: [],

    init: function() {
        if (this._initialized) {
            this.bindPrintIssueEvents();
            this.renderPrintIssues();
            return;
        }

        console.log('🤖 AutomationEngine initializing...');
        this.loadPrintIssues();
        this.bindEvents();
        this.renderPrintIssues();
        this._initialized = true;
        console.log('✅ AutomationEngine initialized successfully.');
    },

    bindEvents: function() {
        document.getElementById('btn-auto-tag-digital')?.addEventListener('click', () => this.autoTagDigitalBills());
        document.getElementById('btn-analyze-route')?.addEventListener('click', () => this.analyzeRouteEfficiency());
        document.getElementById('btn-detect-anomalies')?.addEventListener('click', () => this.detectAnomalies());

        this.bindPrintIssueEvents();
    },

    bindPrintIssueEvents: function() {
        const addBtn = document.getElementById('btn-add-print-issue');
        if (addBtn) {
            addBtn.onclick = (e) => {
                if (e) e.preventDefault();
                this.addPrintIssue();
            };
        }

        const inInput = document.getElementById('input-issue-in');
        if (inInput) {
            inInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addPrintIssue();
                }
            };
        }

        const exportBtn = document.getElementById('btn-export-print-issues');
        if (exportBtn) {
            exportBtn.onclick = (e) => {
                if (e) e.preventDefault();
                this.exportPrintIssues();
            };
        }

        const tbody = document.getElementById('print-issues-tbody');
        if (tbody) {
            tbody.onclick = (e) => {
                const delBtn = e.target.closest('.btn-delete-issue');
                if (delBtn && delBtn.dataset.id) {
                    this.deletePrintIssue(delBtn.dataset.id);
                }
            };
        }
    },

    loadPrintIssues: function() {
        try {
            const raw = localStorage.getItem(this.PRINT_ISSUES_KEY);
            this._printIssues = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(this._printIssues)) {
                this._printIssues = [];
            }
        } catch (e) {
            console.error('❌ Failed to parse print issues from localStorage:', e);
            this._printIssues = [];
        }
        return this._printIssues;
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

    // ⚡ មុខងារស្វែងរកឈ្មោះអតិថិជនឆ្លាតវៃ (Smart Multi-Field Scanner)
    _findCustomerDetails: function(canonicalIN) {
        if (!canonicalIN) return { name: 'ក្រៅ Master Data', box: 'N/A', cabin: 'N/A' };

        const norm = (val) => {
            if (window.Utils && typeof window.Utils.normalizeIN === 'function') {
                return window.Utils.normalizeIN(val);
            }
            return String(val || '').replace(/[^\d\w]/g, '').trim();
        };

        const targetIN = norm(canonicalIN);

        // Function ស្រង់ឈ្មោះចេញពី Object ទោះជា Key ឈ្មោះអ្វីក៏ដោយ
        const extractFromRow = (r) => {
            if (!r || typeof r !== 'object') return null;

            let name = r.name || r.customerName || r.clientName || r.custName || 
                       r.ឈ្មោះ || r.ឈ្មោះអតិថិជន || r.អតិថិជន || r.khmerName || 
                       r.consumerName || r.nom || r.cName || '';

            // ប្រសិនបើ Key ធម្មតាមិនឃើញ សូមស្កេនគ្រប់ Key ក្នុង Object
            if (!name) {
                const keys = Object.keys(r);
                for (let k of keys) {
                    const lk = k.toLowerCase();
                    if (lk.includes('name') || lk.includes('ឈ្មោះ') || lk.includes('cust') || lk.includes('client')) {
                        if (r[k] && typeof r[k] === 'string' && r[k].trim() !== '') {
                            name = r[k].trim();
                            break;
                        }
                    }
                }
            }

            const box = r.box || r.boxNo || r.ប្រអប់ || 'N/A';
            const cabin = r.cabin || r.កាប៊ីន || (window.currentCabinGlobal || 'N/A');

            if (name && String(name).trim() !== '') {
                return { name: String(name).trim(), box: String(box).trim(), cabin: String(cabin).trim() };
            }
            return null;
        };

        // 1. ស្វែងរកតាម masterDataIndex ($O(1)$)
        if (window.masterDataIndex && typeof window.masterDataIndex.get === 'function') {
            const rec = window.masterDataIndex.get(targetIN);
            const res = extractFromRow(rec);
            if (res) return res;
        }

        // 2. ស្វែងរកតាម Utils.findByInvoice
        if (window.Utils && typeof window.Utils.findByInvoice === 'function') {
            const rec = window.Utils.findByInvoice(targetIN);
            const res = extractFromRow(rec);
            if (res) return res;
        }

        // 3. ស្វែងរកផ្ទាល់ក្នុង window.masterData
        if (Array.isArray(window.masterData)) {
            const rec = window.masterData.find(r => {
                const inv = r.invoice || r.in || r.inNumber || r.លេខIN || r.IN;
                return norm(inv) === targetIN;
            });
            const res = extractFromRow(rec);
            if (res) return res;
        }

        // 4. ស្វែងរកក្នុង currentExportData (បើកំពុងបើក Job)
        if (Array.isArray(window.currentExportData)) {
            const rec = window.currentExportData.find(r => {
                const inv = r.invoice || r.in || r.inNumber || r.លេខIN || r.IN;
                return norm(inv) === targetIN;
            });
            const res = extractFromRow(rec);
            if (res) return res;
        }

        return {
            name: 'ក្រៅ Master Data',
            box: 'N/A',
            cabin: window.currentCabinGlobal || 'N/A'
        };
    },

    // ⚡ មុខងារកត់ត្រារហ័ស
    addPrintIssue: function() {
        try {
            const inInput = document.getElementById('input-issue-in');
            const rawVal = inInput ? inInput.value.trim() : '';
            
            let canonicalIN = '';
            if (window.Utils && typeof window.Utils.normalizeIN === 'function') {
                canonicalIN = window.Utils.normalizeIN(rawVal);
            } else {
                canonicalIN = rawVal.replace(/[^\d\w]/g, '').trim();
            }

            if (!canonicalIN) {
                if (window.Utils && typeof window.Utils.showAlert === 'function') {
                    window.Utils.showAlert('⚠️ សូមបញ្ចូលលេខ IN!');
                } else {
                    alert('⚠️ សូមបញ្ចូលលេខ IN!');
                }
                if (inInput) inInput.focus();
                return;
            }

            // 🛡️ DUPLICATE PROTECTION
            const isDuplicate = this._printIssues.some(
                item => item.invoice === canonicalIN
            );

            if (isDuplicate) {
                if (window.Utils && typeof window.Utils.showAlert === 'function') {
                    window.Utils.showAlert('⚠️ IN នេះត្រូវបានកត់ត្រារួចហើយ');
                } else {
                    alert('⚠️ IN នេះត្រូវបានកត់ត្រារួចហើយ');
                }
                if (inInput) inInput.focus();
                return;
            }

            // ស្វែងរកព័ត៌មានអតិថិជន
            const customer = this._findCustomerDetails(canonicalIN);

            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const newRecord = {
                id: 'issue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                invoice: canonicalIN,
                name: customer.name,
                box: customer.box,
                cabin: customer.cabin,
                issueType: 'ខូច/មិនគ្រប់',
                note: '',
                recordedAt: timeStr
            };

            this._printIssues.unshift(newRecord);
            this.savePrintIssues();
            this.renderPrintIssues();

            if (inInput) {
                inInput.value = '';
                inInput.focus();
            }

            if (window.Utils && typeof window.Utils.showAlert === 'function') {
                window.Utils.showAlert(`✅ បានកត់ត្រា៖ IN ${canonicalIN} (${customer.name})`);
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

    // ⚡ Render ចេញមកលើតារាង (មាន Live Recovery បើ Record ចាស់ជាប់ទទេ)
    renderPrintIssues: function() {
        const tbody = document.getElementById('print-issues-tbody');
        const badge = document.getElementById('badge-issue-count');
        const list = this._printIssues || [];

        if (badge) {
            badge.innerText = `${list.length} ផ្ទះ`;
        }

        if (!tbody) return;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="empty-state" style="text-align:center; padding:24px; color:var(--text-muted, #94a3b8);">📭 មិនទាន់មានទិន្នន័យកត់ត្រាទេ</td></tr>`;
            return;
        }

        const esc = (str) => {
            if (!str && str !== 0) return '';
            return String(str).replace(/[&<>"']/g, (c) => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[c]));
        };

        let hasModified = false;
        let html = '';

        for (let i = 0; i < list.length; i++) {
            const item = list[i];

            // 🔧 LIVE RECOVERY: បើ Record នេះអត់ទាន់មានឈ្មោះ ឬចេញទទេ សូមស្វែងរកមកវិញភ្លាមៗ
            if (!item.name || item.name === 'ក្រៅ Master Data' || item.name.trim() === '') {
                const recovered = this._findCustomerDetails(item.invoice);
                if (recovered && recovered.name !== 'ក្រៅ Master Data') {
                    item.name = recovered.name;
                    item.box = recovered.box;
                    item.cabin = recovered.cabin;
                    hasModified = true;
                }
            }

            const displayName = item.name && item.name.trim() !== '' ? esc(item.name) : 'ក្រៅ Master Data';

            html += `
                <tr style="border-bottom: 1px solid var(--border, #334155);">
                    <td style="text-align: center; font-weight: 600; color: var(--text-muted, #94a3b8); padding: 12px 6px;">${i + 1}</td>
                    <td style="text-align: center; font-family: monospace; font-weight: 800; color: #38bdf8; font-size: 15px; padding: 12px 6px;">${esc(item.invoice)}</td>
                    <td style="text-align: left; font-weight: 700; color: var(--text, #f8fafc); font-size: 14px; padding: 12px 10px;">${displayName}</td>
                    <td style="text-align: center; padding: 12px 6px;">
                        <button type="button" class="btn btn-delete-issue" data-id="${esc(item.id)}" style="padding: 5px 10px; min-height: 30px; font-size: 13px; background: #ef4444; color: #ffffff; border: none; border-radius: 6px; cursor: pointer;" title="លុបចោល">🗑️</button>
                    </td>
                </tr>
            `;
        }

        tbody.innerHTML = html;

        // ប្រសិនបើមានការ Recover ឈ្មោះជោគជ័យ សូម Save ចូល Storage ឡើងវិញ
        if (hasModified) {
            this.savePrintIssues();
        }
    },

    exportPrintIssues: function() {
        if (!this._printIssues || this._printIssues.length === 0) {
            if (window.Utils && typeof window.Utils.showAlert === 'function') {
                window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ទេ!');
            } else {
                alert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ទេ!');
            }
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

            sheet.mergeCells('A1:C1');
            sheet.getCell('A1').value = 'បញ្ជីស្នើសុំបោះពុម្ពវិក្កយបត្រឡើងវិញ (ខូច/មិនគ្រប់)';
            sheet.getCell('A1').font = { name: 'Khmer OS Muol Light', size: 13, bold: true };
            sheet.getCell('A1').alignment = { horizontal: 'center' };

            const headers = ['ល.រ', 'លេខ IN', 'ឈ្មោះអតិថិជន'];
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
                    item.name
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

            workbook.xlsx.writeBuffer().then(buffer => {
                const dateStr = new Date().toISOString().slice(0, 10);
                saveAs(new Blob([buffer]), `RePrint_Request_${dateStr}.xlsx`);
                if (window.Utils && typeof window.Utils.showAlert === 'function') {
                    window.Utils.showAlert('✅ Export របាយការណ៍សុំបោះពុម្ពរួចរាល់!');
                }
            });
        } catch (err) {
            console.error('❌ Export print issues error:', err);
            alert('❌ Export បរាជ័យ៖ ' + err.message);
        }
    },

    // ============================================================
    // 🧠 AI & ROUTE ANALYTICS
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

        if (taggedCount > 0 && window.StorageEngine && typeof window.StorageEngine.saveMasterCache === 'function') {
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.AutomationEngine.init());
} else {
    window.AutomationEngine.init();
}
