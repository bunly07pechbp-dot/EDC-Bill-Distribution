// ==========================================================================
// 🗄️ IndexedDB Engine – Full data store for EDC_ROUTE_DB
// --------------------------------------------------------------------------
// This module manages all object stores with proper indexes.
// All methods are asynchronous and use transactions.
// ==========================================================================

window.DBEngine = {
    DB_NAME: 'EDC_ROUTE_DB',
    DB_VERSION: 2,
    STORES: {
        masterData: 'masterData',
        history: 'history',
        jobs: 'jobs',
        routeOrder: 'routeOrder',
        deletedHouses: 'deletedHouses',
        settings: 'settings',
        reports: 'reports'
    },
    _dbPromise: null,

    isSupported: function() {
        return typeof window.indexedDB !== 'undefined' && window.indexedDB !== null;
    },

    // --- Open / get database connection ---
    _openDB: function() {
        if (this._dbPromise) return this._dbPromise;
        if (!this.isSupported()) {
            return Promise.reject(new Error('IndexedDB is not supported in this browser'));
        }
        this._dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const stores = this.STORES;
                if (!db.objectStoreNames.contains(stores.masterData)) {
                    const store = db.createObjectStore(stores.masterData, { keyPath: 'invoice' });
                    store.createIndex('cabin', 'cabin', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                }
                if (!db.objectStoreNames.contains(stores.history)) {
                    const store = db.createObjectStore(stores.history, { keyPath: 'id' });
                    store.createIndex('cabin', 'cabin', { unique: false });
                    store.createIndex('billingMonth', 'billingMonth', { unique: false });
                }
                if (!db.objectStoreNames.contains(stores.jobs)) {
                    const store = db.createObjectStore(stores.jobs, { keyPath: 'id' });
                    store.createIndex('createdDate', 'createdDate', { unique: false });
                }
                if (!db.objectStoreNames.contains(stores.routeOrder)) {
                    db.createObjectStore(stores.routeOrder, { keyPath: 'cabin' });
                }
                if (!db.objectStoreNames.contains(stores.deletedHouses)) {
                    const store = db.createObjectStore(stores.deletedHouses, { keyPath: 'invoice' });
                    store.createIndex('cabin', 'cabin', { unique: false });
                }
                if (!db.objectStoreNames.contains(stores.settings)) {
                    db.createObjectStore(stores.settings, { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains(stores.reports)) {
                    const store = db.createObjectStore(stores.reports, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('generatedAt', 'generatedAt', { unique: false });
                }
            };

            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error || new Error('IndexedDB open failed'));
        });
        return this._dbPromise;
    },

    // ---- Generic CRUD helpers ----
    put: function(storeName, record) {
        return this._openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(record);
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error || new Error(`Put failed on ${storeName}`));
        }));
    },

    get: function(storeName, key) {
        return this._openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = (e) => reject(e.target.error || new Error(`Get failed on ${storeName}`));
        }));
    },

    getAll: function(storeName) {
        return this._openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e.target.error || new Error(`GetAll failed on ${storeName}`));
        }));
    },

    delete: function(storeName, key) {
        return this._openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error || new Error(`Delete failed on ${storeName}`));
        }));
    },

    clear: function(storeName) {
        return this._openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error || new Error(`Clear failed on ${storeName}`));
        }));
    },

    // ---- Batch operations ----
    putMany: function(storeName, records) {
        return this._openDB().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            let completed = 0;
            const total = records.length;
            if (total === 0) return resolve(true);
            for (const rec of records) {
                const req = store.put(rec);
                req.onsuccess = () => {
                    completed++;
                    if (completed === total) resolve(true);
                };
                req.onerror = (e) => {
                    reject(e.target.error || new Error('Batch put failed'));
                };
            }
            tx.onerror = (e) => reject(e.target.error || new Error('Transaction error'));
            tx.onabort = (e) => reject(e.target.error || new Error('Transaction aborted'));
        }));
    },

    // ---- PHASE 5: Retry logic for iOS IndexedDB stability ----
    _retryOperation: async function(operation, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (e) {
                lastError = e;
                console.warn(`⚠️ IndexedDB operation failed (attempt ${attempt}/${maxRetries}):`, e);
                if (attempt < maxRetries) {
                    // Exponential backoff: 100ms, 200ms, 400ms
                    await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
                }
            }
        }
        throw lastError;
    },

    // ---- Store-specific convenience methods (with retry) ----
    saveMasterData: function(rows) {
        return this._retryOperation(() => {
            return this.clear('masterData').then(() => this.putMany('masterData', rows));
        });
    },

    loadMasterData: function() {
        return this.getAll('masterData');
    },

    saveHistorySession: function(session) {
        return this.put('history', session);
    },

    saveHistorySessions: function(sessions) {
        return this._retryOperation(() => {
            return this.clear('history').then(() => this.putMany('history', sessions));
        });
    },

    loadHistorySessions: function() {
        return this.getAll('history');
    },

    saveJob: function(job) { return this.put('jobs', job); },
    saveJobs: function(jobs) { return this.clear('jobs').then(() => this.putMany('jobs', jobs)); },
    loadJobs: function() { return this.getAll('jobs'); },
    deleteJob: function(jobId) { return this.delete('jobs', jobId); },

    saveSetting: function(key, value) {
        return this.put('settings', { key, value });
    },
    loadSetting: function(key) {
        return this.get('settings', key).then(record => record ? record.value : null);
    },

    saveRouteOrder: function(cabin, orderArray) {
        return this.put('routeOrder', { cabin, order: orderArray });
    },
    loadRouteOrder: function(cabin) {
        return this.get('routeOrder', cabin).then(record => record ? record.order : null);
    },

    addDeletedHouse: function(house) {
        return this.put('deletedHouses', house);
    },
    removeDeletedHouse: function(invoice) {
        return this.delete('deletedHouses', invoice);
    },
    loadDeletedHouses: function() {
        return this.getAll('deletedHouses');
    },

    saveReport: function(report) {
        return this.put('reports', report);
    },
    loadReports: function() {
        return this.getAll('reports');
    },

    // ---- Full backup/restore ----
    exportAllData: function() {
        const stores = Object.values(this.STORES);
        const results = {};
        const promises = stores.map(storeName => {
            return this.getAll(storeName).then(data => { results[storeName] = data; });
        });
        return Promise.all(promises).then(() => results);
    },

    importAllData: function(dataMap) {
        const promises = [];
        for (const [storeName, records] of Object.entries(dataMap)) {
            if (Array.isArray(records) && records.length) {
                promises.push(this.clear(storeName).then(() => this.putMany(storeName, records)));
            } else {
                promises.push(this.clear(storeName));
            }
        }
        return Promise.all(promises);
    }
};