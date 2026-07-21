// ==========================================================================
// 🗄️ Archive & Backup Engine (New Feature Module - Fixed Backup Export)
// ==========================================================================
window.ArchiveEngine = {
    ARCHIVE_KEY: 'EDC_MONTHLY_ARCHIVES',

    init: function() {
        this.injectUI();
        this.updateDashboard();
    },

    // ចាក់បញ្ចូល UI ថ្មីៗដោយមិនប៉ះពាល់ DOM ចាស់
    injectUI: function() {
        // 1. បញ្ចូល Dashboard Stats ថ្មី
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid && !document.getElementById('stat-delivered')) {
            statsGrid.style.gridTemplateColumns = 'repeat(5, 1fr)';
            statsGrid.insertAdjacentHTML('beforeend', `
                <div class="stat-card"><h3>ចែកបាន (Delivered)</h3><p id="stat-delivered" style="color: #16a34a;">0</p></div>
                <div class="stat-card"><h3>នៅសល់ (Pending)</h3><p id="stat-pending" style="color: #ea580c;">0</p></div>
                <div class="stat-card"><h3>ភាគរយ (Progress)</h3><p id="stat-progress" style="color: #7c3aed;">0%</p></div>
            `);
        }

        // 2. បញ្ចូលប៊ូតុង Archive & Backup
        const actionBar = document.getElementById('block-actions');
        if (actionBar && !document.getElementById('btn-close-month')) {
            actionBar.insertAdjacentHTML('beforeend', `
                <div style="width: 100%; height: 1px; background: #e2e8f0; margin: 10px 0;"></div>
                <button class="btn" id="btn-close-month" style="background-color: #475569;">📁 បិទបញ្ជីខែនេះ (Close Month)</button>
                <button class="btn" id="btn-backup" style="background-color: #0d9488;">💾 Backup ទិន្នន័យ (Export)</button>
                <button class="btn" id="btn-restore" style="background-color: #0f766e;">🔄 Restore ទិន្នន័យ (Import)</button>
                <input type="file" id="restore-file-input" accept=".json" style="display:none;" />
            `);

            document.getElementById('btn-close-month').addEventListener('click', () => this.closeMonth());
            document.getElementById('btn-backup').addEventListener('click', () => this.exportBackup());
            
            const restoreInput = document.getElementById('restore-file-input');
            document.getElementById('btn-restore').addEventListener('click', () => restoreInput.click());
            restoreInput.addEventListener('change', (e) => this.importBackup(e));
        }
    },

    // ---- MODIFIED: Count only active customers ----
    updateDashboard: function() {
        if (!window.masterData) return;

        // Get active customers only (exclude ឈប់ប្រើ and បានលុប)
        const activeCustomers = window.Utils.getActiveCustomers(window.masterData);
        const total = activeCustomers.length;

        let delivered = 0;
        activeCustomers.forEach(row => {
            if (row.status === 'បានចែករួចរាល់' || row.status === 'បានចែករួច') {
                delivered++;
            }
        });

        const pending = total - delivered;
        const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;

        const elTotal = document.getElementById('stat-records');
        const elDelivered = document.getElementById('stat-delivered');
        const elPending = document.getElementById('stat-pending');
        const elProgress = document.getElementById('stat-progress');

        if (elTotal) elTotal.innerText = total;
        if (elDelivered) elDelivered.innerText = delivered;
        if (elPending) elPending.innerText = pending;
        if (elProgress) elProgress.innerText = `${progress}%`;
    },

    closeMonth: async function() {
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់បិទបញ្ជីទេ!');
            return;
        }

        const monthName = prompt("សូមបញ្ចូលឈ្មោះខែសម្រាប់ទុកជាឯកសារ (ឧទាហរណ៍៖ កក្កដា ២០២៦) / Enter Month Name:");
        if (!monthName) return;

        if (!confirm(`⚠️ តើអ្នកពិតជាចង់បិទបញ្ជីខែ "${monthName}" មែនទេ?\n\n- ទិន្នន័យចាស់នឹងត្រូវរក្សាទុក\n- ផ្ទះដែលចែករួចនឹងត្រូវលុបចេញ\n- ផ្ទះដែលនៅសល់នឹងត្រូវលើកទៅខែថ្មី (Carry Forward)`)) return;

        // 1. បង្កើត Archive Snapshot
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

        // 2. Carry Forward (លើកផ្ទះនៅសល់ទៅខែថ្មី)
        const pendingRecords = window.masterData.filter(row => row.status !== 'បានចែករួចរាល់' && row.status !== 'បានចែករួច');
        window.masterData = pendingRecords;
        window.currentExportData = [];
        window.Utils.rebuildMasterIndex();

        // 3. សម្អាត Cache ចាស់ ហើយ Save ទិន្នន័យថ្មី
        window.StorageEngine.clearWorkingCache(); 
        await window.StorageEngine.saveMasterCache();
        
        // លុបប្រវត្តិ History ដើម្បីចាប់ផ្តើមខែថ្មីស្អាត
        localStorage.removeItem(window.StorageEngine.HISTORY_STORAGE_KEY);
        window.StorageEngine._cache.history = [];
        window.StorageEngine.loadHistoryList ? window.StorageEngine.loadHistoryList() : null;

        this.updateDashboard();
        window.Utils.showAlert(`✅ បិទបញ្ជីខែ "${monthName}" រួចរាល់!\nផ្ទះនៅសល់ ${pendingRecords.length} ត្រូវបានលើកទៅខែថ្មី។`);
    },

    // 🛠️ មុខងារ Backup ទិន្នន័យ ( Export ជួសជុលកូដថ្មី ដើរលឿន និងមិនគាំង )
    exportBackup: function() {
        try {
            console.log('📤 Starting safe backup export...');

            // ១. បង្កើតកញ្ចប់ទិន្នន័យរួមមួយ ចាប់យកទិន្នន័យទាំងអស់ពី LocalStorage ភ្លាមៗ
            const backupData = {
                version: 2,
                appName: 'EDC_MANAGEMENT_SYSTEM',
                timestamp: new Date().toISOString(),
                localStorage: {}
            };

            // ប្រមូលរាល់ទិន្នន័យទាំងអស់ដែលមានពាក្យគន្លឹះ EDC_ រួមទាំងប្រព័ន្ធទិន្នន័យចាស់-ថ្មី
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('EDC_') || key.includes('COMPANIES') || key.includes('REGULAR'))) {
                    backupData.localStorage[key] = localStorage.getItem(key);
                }
            }

            // ២. បំប្លែងទិន្នន័យទៅជា JSON Text format
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

            // ៣. បង្កើតឈ្មោះហ្វាយល៍ Backup តាមថ្ងៃខែឆ្នាំជាក់ស្តែង
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
            const filename = `EDC_FullBackup_${dateStr}.json`;

            // ៤. ដំណើរការទាញយកហ្វាយល៍ (Download File)
            if (typeof saveAs === 'function') {
                console.log('💾 Saving via FileSaver library');
                saveAs(blob, filename);
            } else {
                // វិធីសាស្ត្រដោនឡូតស្តង់ដារ (Anchor Fallback) បង្កើតប៊ូតុងចុចអូតូ
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

            window.Utils.showAlert('✅ Backup រួចរាល់! ទិន្នន័យទាំងអស់ត្រូវបានរក្សាទុកក្នុងហ្វាយល៍សុវត្ថិភាព។');
        } catch (err) {
            console.error('❌ Export backup error:', err);
            window.Utils.showAlert('❌ ការបង្កើត Backup បរាជ័យ: ' + err.message);
        }
    },

    // 🔄 មុខងារស្តារទិន្នន័យឡើងវិញ (Restore / Import)
    importBackup: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('⚠️ ការ Restore នឹងលុបទិន្នន័យបច្ចុប្បន្នទាំងអស់ ហើយជំនួសដោយទិន្នន័យពី Backup។ តើអ្នកចង់បន្តទេ?')) {
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (!backup.localStorage || Object.keys(backup.localStorage).length === 0) {
                    window.Utils.showAlert('❌ ហ្វាល់ Backup មិនត្រឹមត្រូវ ឬគ្មានទិន្នន័យឡើយ!');
                    return;
                }

                // សម្អាតទិន្នន័យចាស់ចោល រួចចាក់ទិន្នន័យពីក្នុងហ្វាយល៍ Backup ចូលទៅវិញ
                localStorage.clear();
                for (const [key, value] of Object.entries(backup.localStorage)) {
                    localStorage.setItem(key, value);
                }

                window.Utils.showAlert('✅ Restore ទិន្នន័យជោគជ័យ! កម្មវិធីនឹងរៀបចំដំណើរការឡើងវិញ...');
                setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
                console.error('❌ Restore error:', err);
                window.Utils.showAlert('❌ ហ្វាល់ Backup ខូច ឬមិនអាចអានបានទេ!');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    }
};