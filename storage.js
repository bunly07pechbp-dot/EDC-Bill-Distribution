// ==========================================================================
// 🗄️ Storage Engine – Unified storage façade with IndexedDB + localStorage fallback
// --------------------------------------------------------------------------
// All public methods maintain the same signatures as before.
// Internal caching ensures synchronous reads (for backward compatibility).
// Migration on first launch automatically moves data from localStorage.
// 
// CRITICAL SAFETY GUARDS & F5 RELOAD RECOVERY:
// - _isInitialized flag prevents saves before data is loaded.
// - Empty data guard blocks saveMasterCache() when masterData is empty (unless force=true).
// - IMMUTABLE WRITING FRAME: Protects states against abrupt F5 refreshes on Mobile Safaris.
// ==========================================================================

window.StorageEngine = {
    // --- Constants ---
    HISTORY_STORAGE_KEY: 'EDC_HISTORY_SESSIONS',
    LEGACY_HISTORY_PREFIX: 'EDC_HIST_',
    MIGRATION_FLAG: 'EDC_MIGRATION_DONE',

    // --- In-memory caches (for synchronous reads) ---
    _cache: {
        masterData: null,
        history: null,
        jobs: null,
        session: null,
        archive: null,
        inactiveList: null,
        companies: null,
        regular: null
    },
    _historyCache: null,

    // --- Safe Writing Queue ---
    _isInitialized: false,
    _saveQueue: Promise.resolve(),
    _isWriting: false,

    // --- PHASE 1: Debounced write throttling ---
    _flushTimer: null,

    // --- Utility: Estimate size in bytes ---
    _getSize: function(obj) {
        try {
            return new Blob([JSON.stringify(obj)]).size;
        } catch (e) {
            return 0;
        }
    },

    // --- Initialization & Migration ---
    init: async function() {
        console.log('🗄️ StorageEngine initializing...');
        // 1. Check if migration is needed
        if (!localStorage.getItem(this.MIGRATION_FLAG)) {
            console.log('🔄 First launch – starting migration from localStorage to IndexedDB...');
            try {
                await this._migrateFromLocalStorage();
                localStorage.setItem(this.MIGRATION_FLAG, 'true');
                console.log('✅ Migration completed successfully.');
            } catch (e) {
                console.error('❌ Migration failed:', e);
                window.Utils?.showAlert('⚠️ Data migration encountered an issue. Your data is still safe in localStorage.');
            }
        }

        // 2. Load all data into caches (prefer IndexedDB, fallback to localStorage)
        await this._loadAllCaches();

        // 3. Mark as initialized ONLY after data is loaded
        this._isInitialized = true;
        console.log('🗄️ StorageEngine initialized.');

        // 4. Bind Global Visibility & Unload Handlers to prevent F5 data loss on Mobile Safari/PWA
        this._bindEmergencyF5Handlers();

        // --- PHASE 1 FIX: Force flush on page unload with synchronous wait ---
        const boundFlush = () => {
            if (this._flushTimer) {
                clearTimeout(this._flushTimer);
                this._flushTimer = null;
            }
            // Force immediate flush (synchronous as much as possible)
            this._flushImmediate();
        };

        // Use both beforeunload and pagehide for maximum coverage
        window.addEventListener('beforeunload', boundFlush);
        window.addEventListener('pagehide', boundFlush);
        
        // Also flush on visibility change to hidden (iOS PWA)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                boundFlush();
            }
        });

        // 5. Reload Jobs from cache (ensures jobs are restored after refresh)
        setTimeout(() => {
            if (window.JobsEngine && typeof window.JobsEngine.reload === 'function') {
                console.log('🔄 Calling JobsEngine.reload() after StorageEngine init...');
                window.JobsEngine.reload();
            } else {
                console.warn('⚠️ JobsEngine not ready – will retry in 1 second.');
                setTimeout(() => {
                    if (window.JobsEngine && typeof window.JobsEngine.reload === 'function') {
                        window.JobsEngine.reload();
                    } else {
                        console.error('❌ JobsEngine still not available.');
                    }
                }, 1000);
            }
        }, 100);

        // 6. Restore session data & UI View
        await this.restoreSession();
        if (window.UI && typeof window.UI.restoreView === 'function') {
            window.UI.restoreView();
        } else {
            setTimeout(() => {
                if (window.UI && typeof window.UI.restoreView === 'function') {
                    window.UI.restoreView();
                }
            }, 100);
        }
    },

    // ---- Fix for Mobile F5 LifeCycle System ----
    _bindEmergencyF5Handlers: function() {
        const emergencySave = () => {
            if (this._isInitialized) {
                // បង្ខំឱ្យសរសេរទិន្នន័យ Session ចូល LocalStorage ភ្លាមៗជាបង្អែកមុនពេល Browser បិទប៊ូតុងរត់
                if (window.currentExportData && window.currentExportData.length > 0) {
                    const activeTab = document.getElementById('area-field')?.style.display === 'block' ? 'field' : 'setup';
                    const sessionState = {
                        currentExportData: window.currentExportData || [],
                        currentCabinGlobal: window.currentCabinGlobal || 'Unknown',
                        isFieldMode: document.getElementById('area-field')?.style.display === 'block',
                        routeSequenceText: document.getElementById('route-sequence')?.value || '',
                        activeTab: activeTab
                    };
                    // This is small data, safe to store in localStorage
                    try {
                        localStorage.setItem('EDC_SESSION_CACHE', JSON.stringify(sessionState));
                    } catch (e) {
                        console.warn('⚠️ Could not save emergency session cache:', e);
                    }
                }
            }
        };
        window.addEventListener('beforeunload', emergencySave);
        window.addEventListener('pagehide', emergencySave);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') emergencySave(); });
    },

    // ---- Migration ----
    _migrateFromLocalStorage: async function() {
        const db = window.DBEngine;
        if (!db || !db.isSupported()) {
            throw new Error('IndexedDB not available, cannot migrate.');
        }

        const getJSON = (key) => {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : null;
            } catch (e) { return null; }
        };

        const masterData = getJSON('EDC_MASTER_CACHE');
        if (masterData && Array.isArray(masterData)) {
            await db.saveMasterData(masterData);
        }

        const historySessions = getJSON(this.HISTORY_STORAGE_KEY);
        if (historySessions && Array.isArray(historySessions)) {
            await db.saveHistorySessions(historySessions);
        }

        const jobs = getJSON('EDC_JOBS_V1');
        if (jobs && Array.isArray(jobs)) {
            await db.saveJobs(jobs);
        }

        const session = getJSON('EDC_SESSION_CACHE');
        if (session) {
            await db.saveSetting('session', session);
        }

        const archives = getJSON('EDC_MONTHLY_ARCHIVES');
        if (archives && Array.isArray(archives)) {
            for (const arch of archives) {
                await db.saveReport({ ...arch, type: 'archive' });
            }
        }

        const inactive = getJSON('EDC_SORTING_INACTIVE');
        if (inactive && Array.isArray(inactive)) {
            await db.saveSetting('inactiveList', inactive);
        }

        const companies = getJSON('EDC_COMPANIES_DATA');
        if (companies && Array.isArray(companies)) {
            await db.saveSetting('companies', companies);
        }

        const regular = getJSON('EDC_REGULAR_DATA');
        if (regular && Array.isArray(regular)) {
            await db.saveSetting('regular', regular);
        }

        console.log('✅ All data migrated to IndexedDB.');
    },

    // ---- Load all caches from IndexedDB (with localStorage fallback) ----
    _loadAllCaches: async function() {
        console.log('📥 _loadAllCaches() started...');
        const db = window.DBEngine;
        const isDB = db && db.isSupported();

        const loadWithFallback = async (dbPromise, fallbackKey) => {
            try {
                if (isDB) {
                    const result = await dbPromise;
                    if (result !== null && result !== undefined && (Array.isArray(result) ? result.length > 0 : true)) {
                        console.log(`✅ Loaded ${fallbackKey} from IndexedDB:`, Array.isArray(result) ? result.length : 'non-array');
                        return result;
                    }
                }
            } catch (e) {
                console.warn(`⚠️ IndexedDB read failed for ${fallbackKey}, falling back to localStorage.`, e);
            }
            try {
                const raw = localStorage.getItem(fallbackKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    console.log(`✅ Loaded ${fallbackKey} from localStorage fallback:`, Array.isArray(parsed) ? parsed.length : 'non-array');
                    return parsed;
                }
            } catch (e) {
                console.warn(`⚠️ Failed to parse ${fallbackKey} from localStorage.`);
            }
            return null;
        };

        // --- PHASE 1 FIX: Retry loading master data if IndexedDB returns empty ---
        let masterData = await loadWithFallback(db.loadMasterData(), 'EDC_MASTER_CACHE');
        if (!masterData || masterData.length === 0) {
            console.log('🔄 Master data not found in IndexedDB or localStorage, retrying in 500ms...');
            await new Promise(resolve => setTimeout(resolve, 500));
            masterData = await loadWithFallback(db.loadMasterData(), 'EDC_MASTER_CACHE');
        }
        this._cache.masterData = masterData || [];

        this._cache.history = await loadWithFallback(db.loadHistorySessions(), this.HISTORY_STORAGE_KEY) || [];
        this._cache.jobs = await loadWithFallback(db.loadJobs(), 'EDC_JOBS_V1') || [];

        const session = await loadWithFallback(db.loadSetting('session'), 'EDC_SESSION_CACHE');
        this._cache.session = session || null;

        let archives = [];
        if (isDB) {
            try {
                const reports = await db.loadReports();
                archives = reports.filter(r => r.type === 'archive');
            } catch (e) {}
        }
        if (archives.length === 0) {
            try {
                const raw = localStorage.getItem('EDC_MONTHLY_ARCHIVES');
                archives = raw ? JSON.parse(raw) : [];
            } catch (e) {}
        }
        this._cache.archive = archives;

        const inactive = await loadWithFallback(db.loadSetting('inactiveList'), 'EDC_SORTING_INACTIVE');
        this._cache.inactiveList = inactive || [];

        const companies = await loadWithFallback(db.loadSetting('companies'), 'EDC_COMPANIES_DATA');
        this._cache.companies = companies || [];

        const regular = await loadWithFallback(db.loadSetting('regular'), 'EDC_REGULAR_DATA');
        this._cache.regular = regular || [];

        // Populate window.masterData for backward compatibility
        if (this._cache.masterData && this._cache.masterData.length) {
            window.masterData = this._cache.masterData;
            window.Utils?.rebuildMasterIndex();
            console.log(`📊 masterData loaded: ${window.masterData.length} records.`);
            if (window.Utils && typeof window.Utils.updateSystemStatus === 'function') {
                window.Utils.updateSystemStatus('📥 ទិន្នន័យពីមុនត្រូវបានផ្ទុកឡើងវិញ', window.masterData.length);
            }
        } else {
            window.masterData = [];
            window.Utils?.rebuildMasterIndex();
            console.log('📊 masterData is empty.');
            if (window.Utils && typeof window.Utils.updateSystemStatus === 'function') {
                window.Utils.updateSystemStatus('គ្មានទិន្នន័យ', 0);
            }
        }

        this._historyCache = this._cache.history;
        this.loadHistoryList();
        console.log('✅ Caches loaded.');
    },

    // ====================================================================
    // MASTER DATA
    // ====================================================================
    saveMasterCache: function(force = false) {
        if (!this._isInitialized) {
            console.warn('⚠️ saveMasterCache() called before initialization – aborting to prevent data loss.');
            return Promise.resolve();
        }

        if (!window.masterData || !Array.isArray(window.masterData) || window.masterData.length === 0) {
            if (!force) {
                console.warn('⚠️ saveMasterCache() called with empty masterData – aborting.');
                return Promise.resolve();
            }
        }

        this._cache.masterData = window.masterData;

        // --- PHASE 1 FIX: Conditional localStorage write ---
        // If data fits in ~4 MB, write to localStorage as a quick F5 recovery fallback.
        // If too large, skip localStorage to avoid QuotaExceededError.
        try {
            const serialized = JSON.stringify(window.masterData);
            const sizeInBytes = this._getSize(window.masterData);
            const sizeInMB = sizeInBytes / (1024 * 1024);
            
            if (sizeInMB < 4) {
                localStorage.setItem('EDC_MASTER_CACHE', serialized);
                console.log(`💾 Master data (${sizeInMB.toFixed(2)} MB) saved to localStorage (fallback).`);
            } else {
                // Too large for localStorage – remove any stale entry to free space
                localStorage.removeItem('EDC_MASTER_CACHE');
                console.log(`⚠️ Master data (${sizeInMB.toFixed(2)} MB) exceeds 4 MB – localStorage fallback skipped.`);
            }
        } catch (e) {
            // If quota exceeded, just remove the key to prevent future errors
            try { localStorage.removeItem('EDC_MASTER_CACHE'); } catch (ex) {}
            console.warn('⚠️ Skipping localStorage master write (quota error or serialization issue).');
        }

        // Always write to IndexedDB (primary storage)
        this._saveQueue = this._saveQueue.then(async () => {
            try {
                if (window.DBEngine && window.DBEngine.isSupported()) {
                    await window.DBEngine.saveMasterData(window.masterData);
                    console.log('✅ Master data saved to IndexedDB.');
                }
            } catch (e) {
                console.error('❌ IndexedDB master save failed:', e);
            }
        });
        return this._saveQueue;
    },

    loadMasterCache: async function() {
        if (this._cache.masterData && this._cache.masterData.length) {
            window.masterData = this._cache.masterData;
            window.Utils?.rebuildMasterIndex();
            if (window.Utils && typeof window.Utils.updateSystemStatus === 'function') {
                window.Utils.updateSystemStatus('📥 ទិន្នន័យបានផ្ទុក', window.masterData.length);
            }
            return true;
        }
        try {
            let data = [];
            if (window.DBEngine && window.DBEngine.isSupported()) {
                data = await window.DBEngine.loadMasterData();
            }
            if (!data || data.length === 0) {
                const raw = localStorage.getItem('EDC_MASTER_CACHE');
                data = raw ? JSON.parse(raw) : [];
            }
            if (data && data.length) {
                this._cache.masterData = data;
                window.masterData = data;
                window.Utils?.rebuildMasterIndex();
                if (window.Utils && typeof window.Utils.updateSystemStatus === 'function') {
                    window.Utils.updateSystemStatus('📥 ទិន្នន័យបានផ្ទុក', window.masterData.length);
                }
                return true;
            }
        } catch (e) {}
        return false;
    },

    // ====================================================================
    // SESSION CACHE
    // ====================================================================
    saveSessionCache: function() {
        if (!this._isInitialized) {
            console.warn('⚠️ saveSessionCache() called before initialization – aborting.');
            return;
        }

        const areaField = document.getElementById('area-field');
        const routeBox = document.getElementById('route-sequence');

        let activeTab = 'setup';
        const areaJobs = document.getElementById('area-jobs');
        const areaCompanies = document.getElementById('area-companies');
        const areaRegular = document.getElementById('area-regular');
        if (areaJobs && areaJobs.style.display !== 'none') activeTab = 'jobs';
        else if (areaCompanies && areaCompanies.style.display !== 'none') activeTab = 'companies';
        else if (areaRegular && areaRegular.style.display !== 'none') activeTab = 'regular';
        else if (areaField && areaField.style.display === 'block') activeTab = 'field';

        const sessionState = {
            currentExportData: window.currentExportData || [],
            currentCabinGlobal: window.currentCabinGlobal || 'Unknown',
            isFieldMode: areaField ? areaField.style.display === 'block' : false,
            routeSequenceText: routeBox ? routeBox.value : '',
            activeTab: activeTab
        };
        
        this._cache.session = sessionState;
        
        // Small data, safe to store in localStorage
        try {
            localStorage.setItem('EDC_SESSION_CACHE', JSON.stringify(sessionState));
        } catch (e) {
            console.warn('⚠️ Could not save session cache to localStorage:', e);
        }

        this._saveQueue = this._saveQueue.then(async () => {
            try {
                if (window.DBEngine && window.DBEngine.isSupported()) {
                    await window.DBEngine.saveSetting('session', sessionState);
                }
            } catch (e) {}
        });
        return this._saveQueue;
    },

    loadSessionCache: function() {
        if (!this._cache.session) {
            try {
                const raw = localStorage.getItem('EDC_SESSION_CACHE');
                if (raw) this._cache.session = JSON.parse(raw);
            } catch (e) {}
        }
        return this._cache.session || null;
    },

    // ====================================================================
    // RESTORE SESSION
    // ====================================================================
    restoreSession: async function() {
        const hasMaster = await this.loadMasterCache();
        if (hasMaster) {
            const btnCleanData = document.getElementById('btn-clean-data');
            if (btnCleanData) btnCleanData.disabled = false;
        }

        const session = this.loadSessionCache();
        if (!session) return;

        const routeBox = document.getElementById('route-sequence');
        if (routeBox && session.routeSequenceText) routeBox.value = session.routeSequenceText;

        if (session.currentExportData && session.currentExportData.length > 0) {
            window.currentExportData = session.currentExportData.map(
                (r) => window.Utils?.findByInvoice(r.invoice) || r
            );
            window.currentCabinGlobal = session.currentCabinGlobal;
            window.isHistoryView = false;

            const lblCabin = document.getElementById('lbl-current-cabin');
            if (lblCabin) lblCabin.innerText = `📋 ផ្លូវជាក់ស្តែងកាប៊ីន៖ ${window.currentCabinGlobal}`;
        }
    },

    // ====================================================================
    // PHASE 1: Debounced Write Throttling
    // ====================================================================

    /**
     * Schedules a combined flush of all dirty data (master, session, history)
     * after a 150ms quiet period. Multiple rapid calls (e.g., method clicks)
     * are coalesced into a single write batch.
     */
    schedulePersist: function() {
        if (this._flushTimer) {
            clearTimeout(this._flushTimer);
        }
        this._flushTimer = setTimeout(() => {
            this._flushTimer = null;
            this._flushImmediate();
        }, 150);
    },

    /**
     * Immediately flushes all caches to localStorage (sync) and schedules
     * IndexedDB writes via the existing _saveQueue.
     * This is called either by the debounced timer or by the beforeunload handler.
     */
    _flushImmediate: function() {
        // 1. Flush session (small)
        this.saveSessionCache();

        // 2. Flush progress / history (small)
        this.saveProgress();

        // 3. Flush master data (IndexedDB + conditional localStorage fallback)
        if (window.masterData && Array.isArray(window.masterData)) {
            this.saveMasterCache();
        }

        // --- PHASE 1 FIX: Force IndexedDB transaction to commit ---
        // We wait for the saveQueue to resolve, but we don't block the main thread.
        // However, the beforeunload handler will give the browser a chance to complete
        // pending transactions before closing.
        this._saveQueue.then(() => {
            console.log('✅ All pending writes completed.');
        });
    },

    // ====================================================================
    // PERSIST ALL (Public API)
    // ====================================================================

    /**
     * Public API for persisting all state. 
     * Now delegates to the debounced scheduler to prevent excessive writes.
     * Existing callers (UI, sorting mode, imports) continue to work unchanged.
     */
    persistAll: function() {
        this.schedulePersist();
    },

    // ====================================================================
    // HISTORY FUNCTIONS
    // ====================================================================
    _today: function() {
        if (window.Utils && window.Utils.formatDate) return window.Utils.formatDate(new Date());
        const now = new Date();
        return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    },

    _normalizeDateValue: function(value) {
        if (!value) return this._today();
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-');
            return `${day}/${month}/${year}`;
        }
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) return value;
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime()) && window.Utils && window.Utils.formatDate) {
            return window.Utils.formatDate(parsed);
        }
        return this._today();
    },

    _getCurrentBillingMonth: function() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    _deriveBillingMonth: function(referenceDate) {
        if (!referenceDate) return this._getCurrentBillingMonth();
        const normalizedDate = this._normalizeDateValue(referenceDate);
        const match = normalizedDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
            const [, day, month, year] = match;
            return `${year}-${String(month).padStart(2, '0')}`;
        }
        return this._getCurrentBillingMonth();
    },

    _buildHistorySessionId: function(cabin, billingMonth, distributor) {
        const safeCabin = (cabin || 'Unknown').toString().trim().replace(/\s+/g, ' ').toLowerCase();
        const safeMonth = (billingMonth || this._getCurrentBillingMonth()).toString().trim();
        const safeDistributor = (distributor || 'Unknown').toString().trim().replace(/\s+/g, ' ').toLowerCase();
        return `${safeCabin}::${safeMonth}::${safeDistributor}`;
    },

    _resolveDistributionDate: function() {
        const dateInput = document.getElementById('distribution-date');
        if (dateInput && dateInput.value) return this._normalizeDateValue(dateInput.value);
        if (window.currentDistributionDate) return this._normalizeDateValue(window.currentDistributionDate);
        return this._today();
    },

    _resolveDistributor: function() {
        if (window.currentDistributor) return window.currentDistributor;
        return 'Unknown';
    },

    saveProgress: function() {
        if (!window.masterData || window.masterData.length === 0) return;

        const distributedRows = window.masterData.filter((row) => row.status === 'បានចែករួចរាល់');
        if (distributedRows.length === 0) return;

        const groupedByCabin = {};
        distributedRows.forEach((row) => {
            const cabinName = (row.cabin || 'Unknown').toString().trim();
            if (!groupedByCabin[cabinName]) groupedByCabin[cabinName] = [];
            groupedByCabin[cabinName].push(row);
        });

        const selectedDate = this._resolveDistributionDate();
        const billingMonth = this._deriveBillingMonth(selectedDate);
        const distributor = this._resolveDistributor();
        let sessions = this._cache.history || [];
        let changed = false;
        const nowStamp = window.Utils?.formatDateTime ? window.Utils.formatDateTime(new Date()) : new Date().toLocaleString();

        Object.keys(groupedByCabin).forEach((cabinName) => {
            const rowsForCabin = groupedByCabin[cabinName];
            const sessionId = this._buildHistorySessionId(cabinName, billingMonth, distributor);
            let session = sessions.find((item) => item.id === sessionId);

            if (!session) {
                session = {
                    id: sessionId,
                    cabin: cabinName,
                    billingMonth,
                    distributor,
                    distributionDate: selectedDate,
                    createdAt: nowStamp,
                    updatedAt: nowStamp,
                    records: [],
                    logs: []
                };
                sessions.push(session);
                changed = true;
            }

            const recordMap = new Map((session.records || []).map((row) => [String(row.invoice), row]));
            rowsForCabin.forEach((row) => {
                const nextRow = { ...row };
                nextRow.status = row.status || 'បានចែករួចរាល់';
                nextRow.method = row.method || '';
                nextRow.deliveredAt = row.deliveredAt || nowStamp;
                recordMap.set(String(nextRow.invoice), nextRow);
            });

            session.records = Array.from(recordMap.values()).sort((a, b) => {
                if (!a.deliveredAt) return 1;
                if (!b.deliveredAt) return -1;
                return String(a.deliveredAt).localeCompare(String(b.deliveredAt));
            });

            session.billingMonth = session.billingMonth || billingMonth;
            session.distributor = session.distributor || distributor;
            session.updatedAt = nowStamp;
            if (!session.distributionDate) session.distributionDate = selectedDate;

            const completedInvoiceIds = rowsForCabin.map((row) => String(row.invoice)).sort();
            const snapshotSignature = `${selectedDate}::${completedInvoiceIds.join('|')}`;
            const latestLog = session.logs && session.logs.length > 0 ? session.logs[session.logs.length - 1] : null;
            const shouldRecordLog = !latestLog || latestLog.date !== selectedDate || latestLog.signature !== snapshotSignature;

            if (shouldRecordLog) {
                session.logs.push({
                    date: selectedDate,
                    timestamp: nowStamp,
                    summary: {
                        completed: completedInvoiceIds.length,
                        pending: session.records.filter((row) => row.status !== 'បានចែករួចរាល់').length,
                        total: session.records.length
                    },
                    completedInvoices: completedInvoiceIds,
                    signature: snapshotSignature
                });
                changed = true;
            }
        });

        if (changed) {
            this._cache.history = sessions;
            this._historyCache = sessions;
            
            // Sync immediately with LocalStorage as backup for iOS
            try {
                localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(sessions));
            } catch (e) {
                console.warn('⚠️ Could not save history to localStorage:', e);
            }

            this._saveQueue = this._saveQueue.then(async () => {
                try {
                    if (window.DBEngine && window.DBEngine.isSupported()) {
                        await window.DBEngine.saveHistorySessions(sessions);
                    }
                } catch (e) {}
                this.loadHistoryList();
            });
        }
        return this._saveQueue;
    },

    syncWithCache: function() {
        if (!window.masterData) return;
        const historyIndex = new Map();
        (this._cache.history || []).forEach((session) => {
            (session.records || []).forEach((row) => {
                historyIndex.set(String(row.invoice), row);
            });
        });

        window.masterData.forEach((row) => {
            const cachedRow = historyIndex.get(String(row.invoice));
            if (cachedRow) {
                row.status = cachedRow.status;
                row.method = cachedRow.method;
                row.deliveredAt = cachedRow.deliveredAt;
            }
        });
    },

    loadHistoryList: function() {
        const select = document.getElementById('history-select');
        if (!select) return;
        select.innerHTML = '<option value="">-- ជ្រើសរើសកាប៊ីនដែលធ្លាប់ចែក --</option>';

        const sessions = this._cache.history || [];
        let hasHistory = false;
        sessions.forEach((session) => {
            if (!session.records || session.records.length === 0) return;
            const opt = document.createElement('option');
            opt.value = session.id;
            opt.text = `កាប៊ីនៈ ${session.cabin} — ${session.billingMonth || '?'} — ថ្ងៃទី ${session.distributionDate || '?'} (${session.records.length} ផ្ទះ)`;
            select.appendChild(opt);
            hasHistory = true;
        });
        this.renderClearButton(hasHistory);
    },

    loadSelectedHistory: function() {
        const select = document.getElementById('history-select');
        if (!select || !select.value) {
            window.Utils?.showAlert('⚠️ សូមជ្រើសរើសកាប៊ីនពីបញ្ជីសិនបង!');
            return;
        }

        try {
            const session = (this._cache.history || []).find((item) => item.id === select.value);
            if (!session) {
                window.Utils?.showAlert('❌ រកមិនឃើញប្រវត្តិ session នេះទេ');
                return;
            }
            window.currentCabinGlobal = session.cabin;
            window.currentExportData = (session.records || []).slice();
            window.isHistoryView = true;

            if (this._cache.session) {
                this._cache.session.activeTab = 'field';
            } else {
                this._cache.session = { activeTab: 'field' };
            }
            
            // Force safe persistent save to prevent dynamic wipe on refresh
            try {
                localStorage.setItem('EDC_SESSION_CACHE', JSON.stringify(this._cache.session));
            } catch (e) {
                console.warn('⚠️ Could not save session cache:', e);
            }

            if (window.UI && typeof window.UI.restoreView === 'function') {
                window.UI.restoreView();
            }
        } catch (e) {
            window.Utils?.showAlert('❌ ការទាញប្រវត្តិមានបញ្ហា!');
            console.error('loadSelectedHistory error:', e);
        }
    },

    renderClearButton: function(hasHistory) {
        let oldBtn = document.getElementById('btn-clear-all-cache');
        if (oldBtn) oldBtn.remove();
        if (!hasHistory) return;

        const container = document.getElementById('block-history');
        if (container) {
            const clearBtn = document.createElement('button');
            clearBtn.id = 'btn-clear-all-cache';
            clearBtn.className = 'btn';
            clearBtn.style.backgroundColor = '#dc2626';
            clearBtn.style.fontSize = '12px';
            clearBtn.style.padding = '6px 12px';
            clearBtn.style.width = 'auto';
            clearBtn.innerText = '🗑️ លុបប្រវត្តិទាំងអស់';
            clearBtn.onclick = () => {
                if (confirm('⚠️ ចង់លុបប្រវត្តិចាស់ៗចោលទាំងអស់មែនទេ? (Dropdown នឹងទទេស្អាត)')) {
                    this._cache.history = [];
                    this._historyCache = [];
                    localStorage.removeItem(this.HISTORY_STORAGE_KEY);
                    if (window.DBEngine && window.DBEngine.isSupported()) {
                        window.DBEngine.clear('history');
                    }
                    this.loadHistoryList();
                    window.Utils?.showAlert('🗑️ បានលុបប្រវត្តិទាំងអស់រួចរាល់!');
                }
            };
            container.appendChild(clearBtn);
        }
    },

    forceWipeOldInvalidCache: function() {
        const validSessions = (this._cache.history || []).filter((session) => {
            return (session.records || []).some((row) => row.status === 'បានចែករួចរាល់');
        });
        this._cache.history = validSessions;
        this._historyCache = validSessions;
        
        try {
            localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(validSessions));
        } catch (e) {
            console.warn('⚠️ Could not save history:', e);
        }

        this._saveQueue = this._saveQueue.then(async () => {
            try {
                if (window.DBEngine && window.DBEngine.isSupported()) {
                    await window.DBEngine.saveHistorySessions(validSessions);
                }
            } catch (e) {}
        });
    },

    // ====================================================================
    // JOBS STORAGE
    // ====================================================================
    saveJobs: function(jobs, force = false) {
        if (!this._isInitialized && !force) {
            console.warn('⚠️ saveJobs() called before initialization – aborting to prevent data loss.');
            return Promise.resolve();
        }

        if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
            if (!force) {
                console.warn('⚠️ saveJobs() called with empty jobs array – aborting.');
                return Promise.resolve();
            }
        }

        this._cache.jobs = jobs || [];
        
        // Sync immediate backup for safety against F5 reload
        try {
            localStorage.setItem('EDC_JOBS_V1', JSON.stringify(this._cache.jobs));
        } catch (e) {
            console.warn('⚠️ Could not save jobs to localStorage:', e);
        }

        this._saveQueue = this._saveQueue.then(async () => {
            try {
                if (window.DBEngine && window.DBEngine.isSupported()) {
                    await window.DBEngine.saveJobs(this._cache.jobs);
                }
            } catch (e) {
                console.error('❌ IndexedDB jobs save failed:', e);
            }
        });
        return this._saveQueue;
    },

    loadJobs: function() {
        if (this._cache.jobs && this._cache.jobs.length) {
            return this._cache.jobs;
        }

        try {
            const raw = localStorage.getItem('EDC_JOBS_V1');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) {
                    this._cache.jobs = parsed;
                    return parsed;
                }
            }
        } catch (e) {}
        return [];
    },

    // ====================================================================
    // OTHER OBJECT STORES
    // ====================================================================
    saveArchives: function(archives) {
        this._cache.archive = archives || [];
        try {
            localStorage.setItem('EDC_MONTHLY_ARCHIVES', JSON.stringify(this._cache.archive));
        } catch (e) {
            console.warn('⚠️ Could not save archives to localStorage:', e);
        }

        this._saveQueue = this._saveQueue.then(async () => {
            try {
                if (window.DBEngine && window.DBEngine.isSupported()) {
                    const db = window.DBEngine;
                    const allReports = await db.loadReports();
                    const archiveIds = allReports.filter(r => r.type === 'archive').map(r => r.id);
                    await Promise.all(archiveIds.map(id => db.delete('reports', id)));
                    for (const arch of this._cache.archive) {
                        await db.saveReport({ ...arch, type: 'archive' });
                    }
                }
            } catch (e) {}
        });
        return this._saveQueue;
    },
    loadArchives: function() { return this._cache.archive || []; },

    saveInactiveList: function(list) {
        this._cache.inactiveList = list || [];
        try {
            localStorage.setItem('EDC_SORTING_INACTIVE', JSON.stringify(this._cache.inactiveList));
        } catch (e) {
            console.warn('⚠️ Could not save inactive list:', e);
        }

        this._saveQueue = this._saveQueue.then(async () => {
            try {
                if (window.DBEngine && window.DBEngine.isSupported()) {
                    await window.DBEngine.saveSetting('inactiveList', this._cache.inactiveList);
                }
            } catch (e) {}
        });
        return this._saveQueue;
    },
    loadInactiveList: function() { return this._cache.inactiveList || []; },

    saveCompanies: function(companies) {
        this._cache.companies = companies || [];
        try {
            localStorage.setItem('EDC_COMPANIES_DATA', JSON.stringify(this._cache.companies));
        } catch (e) {
            console.warn('⚠️ Could not save companies:', e);
        }

        this._saveQueue = this._saveQueue.then(async () => {
            try {
                if (window.DBEngine && window.DBEngine.isSupported()) {
                    await window.DBEngine.saveSetting('companies', this._cache.companies);
                }
            } catch (e) {}
        });
        return this._saveQueue;
    },
    loadCompanies: function() { return this._cache.companies || []; },

    saveRegularData: function(data) {
        this._cache.regular = data || [];
        try {
            localStorage.setItem('EDC_REGULAR_DATA', JSON.stringify(this._cache.regular));
        } catch (e) {
            console.warn('⚠️ Could not save regular data:', e);
        }

        this._saveQueue = this._saveQueue.then(async () => {
            try {
                if (window.DBEngine && window.DBEngine.isSupported()) {
                    await window.DBEngine.saveSetting('regular', this._cache.regular);
                }
            } catch (e) {}
        });
        return this._saveQueue;
    },
    loadRegularData: function() { return this._cache.regular || []; },

    // ====================================================================
    // BACKUP & RESTORE
    // ====================================================================
    generateFullBackup: async function() {
        const backup = {
            version: 2,
            timestamp: new Date().toISOString(),
            localStorage: {}
        };
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('EDC_')) {
                backup.localStorage[key] = localStorage.getItem(key);
            }
        }
        if (window.DBEngine && window.DBEngine.isSupported()) {
            backup.indexedDB = await window.DBEngine.exportAllData();
        }
        return backup;
    },

    restoreFullBackup: async function(backupData) {
        if (!backupData || !backupData.timestamp) throw new Error("Invalid backup format");
        this.clearWorkingCache();
        
        if (backupData.localStorage) {
            Object.keys(backupData.localStorage).forEach(key => {
                localStorage.setItem(key, backupData.localStorage[key]);
            });
        }
        if (backupData.indexedDB && window.DBEngine && window.DBEngine.isSupported()) {
            await window.DBEngine.importAllData(backupData.indexedDB);
        }
        await this._loadAllCaches();
    },

    // ---- Clear working cache ----
    clearWorkingCache: function() {
        localStorage.removeItem('EDC_MASTER_CACHE');
        localStorage.removeItem('EDC_SESSION_CACHE');
        localStorage.removeItem(this.HISTORY_STORAGE_KEY);
        localStorage.removeItem('EDC_JOBS_V1');
        localStorage.removeItem('EDC_MONTHLY_ARCHIVES');
        localStorage.removeItem('EDC_SORTING_INACTIVE');
        localStorage.removeItem('EDC_COMPANIES_DATA');
        localStorage.removeItem('EDC_REGULAR_DATA');

        if (window.DBEngine && window.DBEngine.isSupported()) {
            const stores = Object.values(window.DBEngine.STORES);
            Promise.all(stores.map(store => window.DBEngine.clear(store))).catch(console.error);
        }
        this._cache = { masterData: [], history: [], jobs: [], session: null, archive: [], inactiveList: [], companies: [], regular: [] };
        this._historyCache = null;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.StorageEngine.init().catch(err => {
        console.error('StorageEngine init error:', err);
    });
});