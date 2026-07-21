// ==========================================================================
// 🤖 AUTOMATION & AI ANALYSIS ENGINE (Phase 6 – Integrated)
// --------------------------------------------------------------------------
// Offline-First Client-Side Intelligence & Automation Algorithms.
// Compatible with iPhone Safari, Android, and Standalone PWA.
// ==========================================================================

window.AutomationEngine = {
    _initialized: false,

    init: function() {
        if (this._initialized) return;
        console.log('🤖 Automation & AI Engine initializing...');
        this._initialized = true;
        this.bindEvents();
    },

    bindEvents: function() {
        const autoTagBtn = document.getElementById('btn-auto-tag-digital');
        const analyzeRouteBtn = document.getElementById('btn-analyze-route');
        const detectAnomaliesBtn = document.getElementById('btn-detect-anomalies');

        if (autoTagBtn) {
            autoTagBtn.addEventListener('click', () => this.autoTagDigitalBills());
        }
        if (analyzeRouteBtn) {
            analyzeRouteBtn.addEventListener('click', () => this.analyzeRouteEfficiency());
        }
        if (detectAnomaliesBtn) {
            detectAnomaliesBtn.addEventListener('click', () => this.detectAnomalies());
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
            // Fallback to alert
            alert(`${title}\n\n${content}`);
        }
    },

    // ============================================================
    // 1. AI ANALYSIS: Route Efficiency
    // ============================================================
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
        if (avgDensity > 120) {
            recommendation = "គួរពុះចែកកាប៊ីនជា ២ ផ្នែក ដើម្បីរៀបផ្លូវដើរបានលឿនជាងមុន";
        } else if (avgDensity > 80) {
            recommendation = "ផ្លូវដើរកំពុងផ្ទុកល្មម អាចបង្កើនប្រសិទ្ធភាពដោយរៀបតាមទីតាំងជិតគ្នា";
        }

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

    // ============================================================
    // 2. AI ANALYSIS: Digital Candidates
    // ============================================================
    predictDigitalCandidates: function() {
        if (!window.masterData) return [];

        return window.masterData.filter(row => {
            const hasDigitalNote = (row.digitalNote || '').toLowerCase().includes('digital');
            const isNotYetDigital = !window.Utils?.hasMethod(row.method, 'digital');
            const isActive = row.status === 'កំពុងប្រើប្រាស់' || row.status === 'មិនទាន់ចែក';

            return isNotYetDigital && isActive && (hasDigitalNote || (row.customerType && row.customerType.includes('ពាណិជ្ជកម្ម')));
        });
    },

    // ============================================================
    // 3. AI ANALYSIS: Anomaly Detection
    // ============================================================
    detectAnomalies: function() {
        if (!window.masterData || window.masterData.length === 0) {
            this._showResult('⚠️ គ្មានទិន្នន័យ', 'សូម Import Master Data ជាមុនសិន!', true);
            return;
        }

        const data = window.masterData;
        const seenInvoices = new Map();
        const duplicates = [];
        const suspended = [];
        const missingInfo = [];

        data.forEach((row, index) => {
            // Check duplicates
            if (seenInvoices.has(row.invoice)) {
                duplicates.push({ invoice: row.invoice, name: row.name, index: index });
            } else {
                seenInvoices.set(row.invoice, index);
            }

            // Check suspended
            if (row.status === 'ផ្អាកប្រើ' || window.Utils?.hasMethod(row.method, 'suspended')) {
                suspended.push(row);
            }

            // Check missing address
            if (!row.address || row.address === 'មិនមានអាសយដ្ឋាន' || row.address === 'N/A') {
                missingInfo.push(row);
            }
        });

        let result = `
🚨 Anomaly Detection Report

📌 ចំនួនសរុប: ${data.length}
📌 ស្ទួន (Duplicate): ${duplicates.length}
📌 ផ្អាកប្រើ (Suspended): ${suspended.length}
📌 ខ្វះអាសយដ្ឋាន: ${missingInfo.length}
        `;

        if (duplicates.length > 0) {
            result += `\n🔁 ស្ទួន IN: ${duplicates.map(d => d.invoice).join(', ')}`;
        }
        if (suspended.length > 0 && suspended.length <= 10) {
            result += `\n⏸️ ផ្អាកប្រើ: ${suspended.map(r => r.invoice).join(', ')}`;
        } else if (suspended.length > 10) {
            result += `\n⏸️ ផ្អាកប្រើ ${suspended.length} ជួរ (បង្ហាញតែ ១០ ដំបូង): ${suspended.slice(0, 10).map(r => r.invoice).join(', ')}...`;
        }

        this._showResult('🚨 Anomaly Detection', result);
    },

    // ============================================================
    // 4. AUTOMATION: Auto-Tag Digital Bills
    // ============================================================
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
    },

    // ============================================================
    // 5. AUTOMATION: Batch Mark Method (for future use)
    // ============================================================
    batchMarkMethod: function(targetInvoices, method) {
        if (!targetInvoices || targetInvoices.length === 0 || !method) return 0;

        let count = 0;
        const nowStamp = window.Utils?.formatDateTime(new Date()) || new Date().toLocaleString();

        targetInvoices.forEach(inv => {
            const row = window.Utils?.findByInvoice(inv);
            if (row) {
                row.method = window.Utils?.mergeMethod(row.method, method);
                if (method === 'suspended') {
                    row.status = 'ផ្អាកប្រើ';
                } else {
                    row.status = 'បានចែករួចរាល់';
                }
                row.deliveredAt = nowStamp;
                count++;
            }
        });

        if (count > 0 && window.StorageEngine) {
            window.StorageEngine.saveMasterCache();
            window.StorageEngine.persistAll();
        }

        return count;
    }
};

// ---- Auto-init ----
document.addEventListener('DOMContentLoaded', function() {
    if (window.AutomationEngine && typeof window.AutomationEngine.init === 'function') {
        window.AutomationEngine.init();
    }
});