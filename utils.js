window.Utils = {
    // ============================================================
    // 1. HTML ESCAPE
    // ============================================================
    escapeHtml: function(str) {
        if (str === null || str === undefined) return "";
        return String(str).replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    },

    // ============================================================
    // 2. LOCALSTORAGE SAFE SET (with better error handling)
    // ============================================================
    safeSetItem: function(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error('❌ localStorage error:', e);
            // Only show alert for critical errors, not for quota exceeded
            if (e.name !== 'QuotaExceededError' && e.name !== 'NS_ERROR_FILE_NO_DEVICE_SPACE') {
                this.showAlert("⚠️ ការទុកទិន្នន័យបរាជ័យ! ទំហំផ្ទុកឧបករណ៍របស់អ្នកអាចពេញ។");
            }
            return false;
        }
    },

    // ============================================================
    // 3. DATE FORMAT
    // ============================================================
    formatDate: function(date) {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    },

    formatDateTime: function(date) {
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${this.formatDate(date)} ${hh}:${mm}`;
    },

    // ============================================================
    // 4. MASTER DATA INDEX
    // ============================================================
    rebuildMasterIndex: function() {
        window.masterDataIndex = new Map((window.masterData || []).map((r) => [r.invoice, r]));
    },

    findByInvoice: function(invoice) {
        if (window.masterDataIndex instanceof Map) return window.masterDataIndex.get(invoice);
        return (window.masterData || []).find((r) => r.invoice === invoice);
    },

    // ============================================================
    // 5. DEBOUNCE
    // ============================================================
    debounce: function(fn, delay) {
        let timer = null;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    // ============================================================
    // 6. METHOD HELPERS
    // ============================================================
    hasMethod: function(methodString, method) {
        if (!methodString) return false;
        return String(methodString).split(',').map(s => s.trim()).filter(Boolean).includes(method);
    },

    mergeMethod: function(existingMethodString, newMethod) {
        const parts = (existingMethodString ? String(existingMethodString).split(',').map(s => s.trim()).filter(Boolean) : []);
        if (!parts.includes(newMethod)) parts.push(newMethod);
        return parts.join(',');
    },

    methodLabel: function(methodString) {
        const labels = {
            digital: 'Digital',
            box: 'ប្រអប់',
            door: 'ទ្វារ',
            owner: 'ម្ចាស់',
            neighbor: 'អ្នកជិតខាង',
            suspended: '⏸️ ផ្អាកប្រើ'
        };
        if (!methodString) return '';
        return String(methodString).split(',').map(s => s.trim()).filter(Boolean)
            .map(m => labels[m] || m).join(' + ');
    },

    primaryMethod: function(methodString) {
        if (!methodString) return '';
        const parts = String(methodString).split(',').map(s => s.trim()).filter(Boolean);
        const suspended = parts.find(m => m === 'suspended');
        if (suspended) return suspended;
        const physical = parts.find(m => m !== 'digital');
        return physical || parts[0] || '';
    },

    // ============================================================
    // 7. STATUS HELPERS
    // ============================================================
    isActive: function(status) {
        return status === 'កំពុងប្រើប្រាស់' || status === 'ប្រើប្រាស់';
    },

    isInactive: function(status) {
        return status === 'ឈប់ប្រើ';
    },

    isDeleted: function(status) {
        return status === 'បានលុប' || status === 'លុប';
    },

    isSuspended: function(status) {
        return status === 'ផ្អាកប្រើ';
    },

    statusClass: function(status) {
        if (this.isActive(status)) return 'status-active';
        if (this.isInactive(status)) return 'status-inactive';
        if (this.isDeleted(status)) return 'status-deleted';
        if (this.isSuspended(status)) return 'status-suspended';
        return 'status-unknown';
    },

    statusColor: function(status) {
        if (this.isActive(status)) return '#16a34a';
        if (this.isInactive(status)) return '#f59e0b';
        if (this.isDeleted(status)) return '#dc2626';
        if (this.isSuspended(status)) return '#b45309';
        return '#94a3b8';
    },

    // ============================================================
    // 8. DASHBOARD HELPERS
    // ============================================================

    // ---- Filter active customers (exclude inactive & deleted) ----
    getActiveCustomers: function(data) {
        if (!data || !Array.isArray(data)) return [];
        return data.filter(customer => {
            const status = String(
                customer["ស្ថានភាព"] ??
                customer.status ??
                ""
            ).trim();
            return status !== "ឈប់ប្រើ" &&
                   status !== "បានលុប";
        });
    },

    // ---- MODIFIED: Use active customers for stat-records ----
    updateSystemStatus: function(text, count) {
        const lblStatus = document.getElementById('stat-status');
        const lblRecords = document.getElementById('stat-records');
        if (lblStatus) lblStatus.innerText = text;
        if (lblRecords) {
            // Use active customers count instead of raw count
            const active = this.getActiveCustomers(window.masterData || []);
            lblRecords.innerText = active.length;
        }
    },

    // ---- 🆕 Count digital bills ----
    countDigitalBills: function(data) {
        if (!data || !Array.isArray(data)) return 0;
        return data.filter(row => this.hasMethod(row.method, 'digital')).length;
    },

    // ============================================================
    // 9. UI HELPERS
    // ============================================================
    updateProgressCounter: function() {
        const lblCounter = document.getElementById('lbl-counter-progress');
        if (!lblCounter || !window.currentExportData) return;
        const cachedStats = window.UI && window.UI._stats;
        const total = cachedStats ? cachedStats.total : window.currentExportData.length;
        const done = cachedStats ? cachedStats.delivered : window.currentExportData.filter(r => r.status === "បានចែករួចរាល់" || r.status === "ផ្អាកប្រើ").length;
        lblCounter.innerText = `ចែកបាន៖ ${done}/${total}`;
        if (window.UI && typeof window.UI.updateProgressBar === 'function') {
            window.UI.updateProgressBar();
        }
    },

    // ---- Safe showAlert with fallback ----
    showAlert: function(message) {
        // Use toast if available, otherwise fallback to alert
        if (window.showToast) {
            window.showToast(message);
        } else {
            alert(message);
        }
    }
};
