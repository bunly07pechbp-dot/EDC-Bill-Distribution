// ==========================================================================
// 🗄️ Archive & Backup Engine (New Feature Module - Fixed Backup Export)
// ==========================================================================
window.ArchiveEngine = {
    ARCHIVE_KEY: 'EDC_MONTHLY_ARCHIVES',

    init: function() {
        this.injectUI();
        this.updateDashboard();
    },

    // ---- Inject UI into DOM ----
    injectUI: function() {
        // 1. Create Dashboard Stats
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid && !document.getElementById('stat-delivered')) {
            statsGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
            statsGrid.insertAdjacentHTML('beforeend', `
                <div class="stat-card"><h3>✅ Delivered</h3><p id="stat-delivered" style="color: #16a34a;">0</p></div>
                <div class="stat-card"><h3>⏳ Pending</h3><p id="stat-pending" style="color: #ea580c;">0</p></div>
                <div class="stat-card"><h3>📊 Progress</h3><p id="stat-progress" style="color: #7c3aed;">0%</p></div>
                <div class="stat-card"><h3>📱 Digital</h3><p id="stat-digital" style="color: #2563eb; font-size: 24px; font-weight: 800;">0</p></div>
            `);
        }

        // 2. Create Archive & Backup buttons
        const actionBar = document.getElementById('block-actions');
        if (actionBar && !document.getElementById('btn-close-month')) {
            actionBar.insertAdjacentHTML('beforeend', `
                <div style="width: 100%; height: 1px; background: #e2e8f0; margin: 10px 0;"></div>
                <button class="btn" id="btn-close-month" style="background-color: #475569;">📁 Close Month</button>
                <button class="btn" id="btn-backup" style="background-color: #0d9488;">💾 Backup (Export)</button>
                <button class="btn" id="btn-restore" style="background-color: #0f766e;">🔄 Restore (Import)</button>
                <input type="file" id="restore-file-input" accept=".json" style="display:none;" />
            `);

            document.getElementById('btn-close-month').addEventListener('click', () => this.closeMonth());
            document.getElementById('btn-backup').addEventListener('click', () => this.exportBackup());
            
            const restoreInput = document.getElementById('restore-file-input');
            document.getElementById('btn-restore').addEventListener('click', () => restoreInput.click());
            restoreInput.addEventListener('change', (e) => this.importBackup(e));
        }
    },

    // ---- PHASE 6 FIX: Count Digital Bills too ----
    updateDashboard: function() {
        if (!window.masterData) return;

        // Get active customers only (exclude ឈប់ប្រើ and បានលុប)
        const activeCustomers = window.Utils.getActiveCustomers(window.masterData);
        const total = activeCustomers.length;

        let delivered = 0;
        let digital = 0;

        activeCustomers.forEach(row => {
            // Count delivered
            if (row.status === 'បានចែករួចរាល់') {
                delivered++;
            }
            // Count digital bills
            if (window.Utils.hasMethod(row.method, 'digital')) {
                digital++;
            }
        });

        const pending = total - delivered;
        const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;

        const elTotal = document.getElementById('stat-records');
        const elDelivered = document.getElementById('stat-delivered');
        const elPending = document.getElementById('stat-pending');
        const elProgress = document.getElementById('stat-progress');
        const elDigital = document.getElementById('stat-digital');

        if (elTotal) elTotal.innerText = total;
        if (elDelivered) elDelivered.innerText = delivered;
        if (elPending) elPending.innerText = pending;
        if (elProgress) elProgress.innerText = `${progress}%`;
        if (elDigital) elDigital.innerText = digital; // 🆕 Update Digital count
    },

    // ---- Close Month ----
    closeMonth: async function() {
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់បិទខែ!');
            return;
        }

        const monthName = prompt("សូមបញ្ចូលឈ្មោះខែដែលចង់បិទ (ឧទាហរណ៍ កក្កដា ២០២៦) / Enter Month Name:");
        if (!monthName) return;

        if (!confirm(`⚠️ តើអ្នកប្រាកដជាចង់បិទខែ "${monthName}" មែនទេ?\n\n- ទិន្នន័យទាំងអស់នឹងត្រូវបានរក្សាទុកជាប្រវត្តិ\n- ផ្ទះដែលចែករួចនឹងត្រូវបានលុបចេញ\n- ផ្ទះដែលនៅសល់នឹងត្រូវបានផ្ទេរទៅខែបន្ទាប់ (Carry Forward)`)) return;

        // 1. Create Archive Snapshot
        const archiveSnapshot = {
            id: `archive_${Date.now()}`,
            name: monthName,
            date: window.Utils.formatDateTime(new Date()),
            data: JSON.parse(JSON.stringify(window.masterData)),
            history: window.StorageEngine._cache.history || []
        };

        const archives = window.StorageEngine.loadArchives() || [];
        archives.push(archiveSnapshot);
        window.StorageEngine.saveArchives(archives);

        // 2. Carry Forward
        const pendingRecords = window.masterData.filter(row => row.status !== 'បានចែករួចរាល់');
        window.masterData = pendingRecords;
        window.currentExportData = [];
        window.Utils.rebuildMasterIndex();

        // 3. Clear cache and save
        window.StorageEngine.clearWorkingCache(); 
        await window.StorageEngine.saveMasterCache();
        
        // Clear old history
        localStorage.removeItem(window.StorageEngine.HISTORY_STORAGE_KEY);
        window.StorageEngine._cache.history = [];
        window.StorageEngine.loadHistoryList ? window.StorageEngine.loadHistoryList() : null;

        this.updateDashboard();
        window.Utils.showAlert(`✅ បានបិទខែ "${monthName}" រួចរាល់!\nផ្ទេរ ${pendingRecords.length} ផ្ទះដែលនៅសល់ទៅខែបន្ទាប់។`);
    },

    // ---- Backup Export ----
    exportBackup: function() {
        try {
            console.log('📤 Starting safe backup export...');

            const backupData = {
                version: 2,
                appName: 'EDC_MANAGEMENT_SYSTEM',
                timestamp: new Date().toISOString(),
                localStorage: {}
            };

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('EDC_') || key.includes('COMPANIES') || key.includes('REGULAR'))) {
                    backupData.localStorage[key] = localStorage.getItem(key);
                }
            }

            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
            const filename = `EDC_FullBackup_${dateStr}.json`;

            if (typeof saveAs === 'function') {
                console.log('💾 Saving via FileSaver library');
                saveAs(blob, filename);
            } else {
                console.log('💾 Saving via anchor download fallback');
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 150);
            }

            window.Utils.showAlert('✅ Backup រួចរាល់! ទិន្នន័យទាំងអស់ត្រូវបានរក្សាទុកជាឯកសារ JSON ។');
        } catch (err) {
            console.error('❌ Export backup error:', err);
            window.Utils.showAlert('❌ ការបង្កើត Backup បរាជ័យ: ' + err.message);
        }
    },

    // ---- Restore Backup ----
    importBackup: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('⚠️ ការ Restore នឹងជំនួសទិន្នន័យបច្ចុប្បន្នទាំងអស់! តើអ្នកប្រាកដជាចង់បន្ត?')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (!backup.localStorage || Object.keys(backup.localStorage).length === 0) {
                    window.Utils.showAlert('❌ ហ្វាល់ Backup នេះមិនមានទិន្នន័យត្រឹមត្រូវទេ!');
                    return;
                }

                localStorage.clear();
                for (const [key, value] of Object.entries(backup.localStorage)) {
                    localStorage.setItem(key, value);
                }

                window.Utils.showAlert('✅ Restore ទិន្នន័យជោគជ័យ! កំពុងផ្ទុកទំព័រឡើងវិញ...');
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                console.error('❌ Restore error:', err);
                window.Utils.showAlert('❌ ហ្វាល់ Backup មិនត្រឹមត្រូវ ឬខូច!');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    }
};
