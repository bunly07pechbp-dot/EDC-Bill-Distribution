// ================================================================
// 📑 SORTING MODE - តម្រៀបវិក្កយបត្រ (កំណែទម្រង់ពេញលេញ - Refactored 2026)
// ================================================================

window.SortingMode = {
    _sortedSet: new Set(),
    _inactiveSet: new Set(),
    _newHousesArray: [],
    _deletedHouses: [],
    _isOpen: false,

    // ============================================================
    // 📂 OPEN / CLOSE
    // ============================================================
    open: function() {
        const data = window.currentExportData || [];
        if (!data || data.length === 0) {
            window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់តម្រៀប! សូមបង្កើតផ្លូវចែកជាមុនសិន។');
            return;
        }
        
        this._sortedSet = new Set();
        // --- FIX: Use StorageEngine for inactive list ---
        this._inactiveSet = this._loadInactiveList();
        this._newHousesArray = [];
        this._deletedHouses = [];
        this._isOpen = true;
        
        this._injectUI();
        this._render();
        this._updateInactiveCounter();
        
        const overlay = document.getElementById('sorting-mode-overlay');
        if (overlay) overlay.classList.add('active');
        
        console.log('📑 Sorting Mode opened with', data.length, 'records');
    },

    close: function() {
        const overlay = document.getElementById('sorting-mode-overlay');
        if (overlay) overlay.classList.remove('active');
        this._isOpen = false;
        this._saveInactiveList();
        this._syncWithMainUI();
    },

    // ============================================================
    // 🔄 SYNC WITH MAIN UI (កុំសរសេរជាន់ទិន្នន័យ)
    // ============================================================
    _syncWithMainUI: function() {
        console.log('🔄 Syncing Sorting Mode changes with main UI...');
        try {
            if (window.UI && typeof window.UI.renderTable === 'function') {
                window.UI.renderTable(window.currentExportData);
            }
            if (window.UI && typeof window.UI.renderNextUpPanel === 'function') {
                window.UI.renderNextUpPanel();
            }
            if (window.Utils && typeof window.Utils.updateProgressCounter === 'function') {
                window.Utils.updateProgressCounter();
            }
            if (window.UI && typeof window.UI.updateProgressBar === 'function') {
                window.UI.updateProgressBar();
            }
            
            this._syncWithJobs();
            
            if (window.StorageEngine && typeof window.StorageEngine.saveSessionCache === 'function') {
                window.StorageEngine.saveSessionCache();
            }
            if (window.StorageEngine && typeof window.StorageEngine.saveMasterCache === 'function') {
                window.StorageEngine.saveMasterCache();
            }
            
            console.log('✅ Sync completed');
        } catch (err) {
            console.warn('⚠️ Sync warning (non-critical):', err.message);
        }
    },

    _syncWithJobs: function() {
        try {
            if (!window.activeJobId || !window.distributionJobs || !Array.isArray(window.distributionJobs)) return;
            
            const job = window.distributionJobs.find(j => j.id === window.activeJobId);
            if (!job) return;
            
            if (!window.currentExportData || !Array.isArray(window.currentExportData)) {
                window.currentExportData = [];
            }
            
            job.inNumbers = window.currentExportData.map(r => r.invoice).filter(Boolean);
            
            if (window.JobsEngine && typeof window.JobsEngine.saveJobs === 'function') {
                window.JobsEngine.saveJobs();
            }
            if (window.JobsEngine && typeof window.JobsEngine.renderJobsList === 'function') {
                window.JobsEngine.renderJobsList();
            }
        } catch (err) {
            console.warn('⚠️ Sync with jobs warning:', err.message);
        }
    },

    refresh: function() {
        if (!this._isOpen) return;
        this._render();
        this._updateInactiveCounter();
    },

    // ============================================================
    // 💾 INACTIVE LIST (Using StorageEngine)
    // ============================================================
    _saveInactiveList: function() {
        try {
            // --- FIX: Use StorageEngine ---
            window.StorageEngine.saveInactiveList(Array.from(this._inactiveSet));
        } catch (e) {
            console.error('❌ មិនអាចរក្សាទុក Inactive List:', e);
        }
    },

    _loadInactiveList: function() {
        try {
            // --- FIX: Use StorageEngine ---
            const list = window.StorageEngine.loadInactiveList();
            return new Set(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error('❌ មិនអាចផ្ទុក Inactive List:', e);
        }
        return new Set();
    },

    _updateInactiveCounter: function() {
        const btn = document.getElementById('sorting-mode-show-inactive');
        if (btn) btn.textContent = `👁️ មើលផ្ទះដែលលុប (${this._inactiveSet.size})`;
    },

    // ============================================================
    // 🖥️ INJECT UI
    // ============================================================
    _injectUI: function() {
        if (document.getElementById('sorting-mode-overlay')) return;

        document.body.insertAdjacentHTML('beforeend', `
            <div id="sorting-mode-overlay">
                <div id="sorting-mode-topbar">
                    <strong>📑 តម្រៀបវិក្កយបត្រ</strong>
                    <button type="button" id="sorting-mode-close" aria-label="បិទ">✕</button>
                </div>
                
                <div id="sorting-mode-tools">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="checkbox" id="sorting-mode-hide-checkbox" checked style="width:16px; height:16px;">
                        <span>លាក់ផ្ទះដែលបានតម្រៀបរួច</span>
                    </label>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" id="sorting-mode-add-btn" style="background:#16a34a; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:500; cursor:pointer;">➕ បន្ថែមផ្ទះ</button>
                        <button type="button" id="sorting-mode-show-inactive" style="background:#ef4444; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">👁️ មើលផ្ទះដែលលុប (0)</button>
                    </div>
                </div>

                <div id="sorting-mode-list"></div>

                <div id="sorting-mode-footer">
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <button type="button" id="sorting-mode-undo-btn" style="flex:1; background:#f59e0b; color:#fff; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer;">↩️ ស្ដារចុងក្រោយ (Undo)</button>
                        <button type="button" id="sorting-mode-reset-btn" style="flex:1; background:#64748b; color:#fff; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer;">🔄 កំណត់ឡើងវិញ</button>
                    </div>
                    <button type="button" id="sorting-mode-submit-btn" style="width:100%; background:#1e3a8a; color:#fff; border:none; padding:12px; border-radius:8px; font-size:15px; font-weight:bold; cursor:pointer;">📤 ផ្ញើរបាយការណ៍ទៅ Admin</button>
                </div>

                <!-- Modal បន្ថែមផ្ទះថ្មី -->
                <div id="sorting-house-modal">
                    <div id="sorting-house-modal-content">
                        <h3 style="margin-top:0; margin-bottom:12px;">➕ បន្ថែមផ្ទះថ្មី</h3>
                        <div style="margin-bottom: 10px;">
                            <label style="font-size:12px; font-weight:bold; color:#475569;">ស្វែងរកលេខ IN ដែលមានស្រាប់ (IN ចាស់)</label>
                            <div style="display:flex; gap:8px; margin-top:4px;">
                                <input type="text" id="new-house-in-search" placeholder="វាយលេខ IN ចាស់..." style="margin-bottom:0; flex:1;">
                                <button type="button" id="new-house-search-btn" style="background:#1e3a8a; color:#fff; border:none; padding:0 14px; border-radius:6px; font-size:13px; cursor:pointer;">🔍 ស្វែងរក</button>
                            </div>
                            <div id="search-status-message" style="font-size:11.5px; margin-top:4px; min-height:16px;"></div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="font-size:12px; font-weight:bold; color:#475569;">ទីតាំងបញ្ចូល (បន្ទាប់ពីលេខ IN ណា) *</label>
                            <input type="text" id="new-house-after-in" placeholder="វាយលេខ IN ដែលចង់បញ្ចូលបន្ទាប់..." style="margin-top:4px; margin-bottom:0; width:100%;">
                        </div>
                        <hr style="border:0; border-top:1px dashed #cbd5e1; margin:14px 0;">
                        <div>
                            <label style="font-size:12px; font-weight:bold; color:#475569;">ឈ្មោះអតិថិជន *</label>
                            <input type="text" id="new-house-name" placeholder="ឈ្មោះអតិថិជន...">
                            <div style="display:flex; gap:8px;">
                                <div style="flex:1;">
                                    <label style="font-size:12px; font-weight:bold; color:#475569;">លេខប្រអប់</label>
                                    <input type="text" id="new-house-box" placeholder="លេខប្រអប់...">
                                </div>
                                <div style="flex:1;">
                                    <label style="font-size:12px; font-weight:bold; color:#475569;">លេខកាប៊ីន</label>
                                    <input type="text" id="new-house-cabin" placeholder="លេខកាប៊ីន...">
                                </div>
                            </div>
                            <label style="font-size:12px; font-weight:bold; color:#475569;">អាសយដ្ឋាន / លេខផ្ទះ</label>
                            <input type="text" id="new-house-address" placeholder="អាសយដ្ឋាន ឬ លេខផ្ទះ...">
                            <label style="font-size:12px; font-weight:bold; color:#475569;">លេខ IN ថ្មី *</label>
                            <input type="text" id="new-house-invoice" placeholder="លេខ IN ថ្មី...">
                        </div>
                        <div style="display:flex; justify-content: flex-end; gap:8px; margin-top:8px;">
                            <button type="button" id="new-house-cancel" style="background:#64748b; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">បោះបង់</button>
                            <button type="button" id="new-house-save" style="background:#16a34a; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">រក្សាទុក</button>
                        </div>
                    </div>
                </div>
            </div>

            <style id="sorting-mode-style">
                #sorting-mode-overlay { position: fixed; inset: 0; z-index: 2000; background: #f8fafc; display: none; flex-direction: column; }
                #sorting-mode-overlay.active { display: flex; }
                #sorting-mode-topbar { background: var(--edc-blue, #1e3a8a); color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center; padding-top: calc(16px + env(safe-area-inset-top, 0px)); }
                #sorting-mode-close { background: rgba(255,255,255,0.15); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 16px; cursor: pointer; }
                #sorting-mode-tools { padding: 10px 14px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 13px; flex-wrap: wrap; gap: 8px; }
                #sorting-mode-list { flex: 1; overflow-y: auto; padding: 10px; -webkit-overflow-scrolling: touch; }
                .sorting-item { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s ease; }
                .sorting-item:hover { background: #f8fafc; }
                .sorting-item-index { width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: #64748b; flex-shrink: 0; }
                .sorting-item-info { flex: 1; min-width: 0; }
                .sorting-item-name { font-weight: 700; font-size: 14px; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .sorting-item-meta { font-size: 11.5px; color: #64748b; }
                .sorting-item-address { font-size: 11.5px; color: #1e3a8a; font-weight: 600; margin-top: 2px; }
                .sorting-action-box { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
                .sorting-item-check { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 14px; color: transparent; transition: all 0.15s ease; }
                .sorting-item.is-sorted { opacity: 0.55; }
                .sorting-item.is-sorted .sorting-item-check { background: #16a34a; border-color: #16a34a; color: #fff; }
                .sorting-btn-inactive { background: #ef4444; color: #fff; border: none; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: transform 0.12s ease; }
                .sorting-btn-inactive:active { transform: scale(0.95); }
                #sorting-mode-footer { padding: 12px; background: #fff; border-top: 1px solid #e2e8f0; padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
                #sorting-house-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 3000; display: none; align-items: center; justify-content: center; padding: 20px; }
                #sorting-house-modal.active { display: flex; }
                #sorting-house-modal-content { background: #fff; width: 100%; max-width: 400px; padding: 20px; border-radius: 12px; max-height: 90vh; overflow-y: auto; }
                #sorting-house-modal-content input { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 10px; font-size: 14px; box-sizing: border-box; display: block; margin-top: 4px; }
                #sorting-house-modal-content input:focus { outline: none; border-color: #1e3a8a; box-shadow: 0 0 0 3px rgba(30,58,138,0.1); }
                .empty-state-sorting { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }
            </style>
        `);

        this._attachEvents();
    },

    // ============================================================
    // 🎯 ATTACH EVENTS
    // ============================================================
    _attachEvents: function() {
        document.getElementById('sorting-mode-close').addEventListener('click', () => this.close());

        document.getElementById('sorting-mode-list').addEventListener('click', (e) => {
            const inactiveBtn = e.target.closest('.sorting-btn-inactive');
            if (inactiveBtn) {
                e.stopPropagation();
                const item = inactiveBtn.closest('.sorting-item');
                if (!item) return;
                const invoice = item.dataset.invoice;
                const row = window.Utils.findByInvoice(invoice);
                const name = row ? row.name : invoice;

                if (confirm(`🗑️ តើអ្នកចង់លុបផ្ទះ "${name}" (IN ${invoice}) ចេញពីផ្លូវនេះទេ?\n\n⚠️ ផ្ទះនេះនឹងត្រូវដកចេញពីបញ្ជីចែកបណ្តោះអាសន្ន។`)) {
                    this._deleteHouse(invoice);
                }
                return;
            }

            const item = e.target.closest('.sorting-item');
            if (!item) return;
            const invoice = item.dataset.invoice;
            
            if (this._sortedSet.has(invoice)) {
                this._sortedSet.delete(invoice);
            } else {
                this._sortedSet.add(invoice);
            }
            
            const isSorted = this._sortedSet.has(invoice);
            item.classList.toggle('is-sorted', isSorted);

            const hideCheckbox = document.getElementById('sorting-mode-hide-checkbox');
            if (hideCheckbox && hideCheckbox.checked && isSorted) {
                setTimeout(() => { 
                    if (this._sortedSet.has(invoice) && hideCheckbox.checked) {
                        item.style.display = 'none';
                        this._scrollToNextUnsorted();
                    }
                }, 200);
            }
        });

        document.getElementById('sorting-mode-hide-checkbox').addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll('.sorting-item').forEach(item => {
                if (item.classList.contains('is-sorted')) {
                    item.style.display = isChecked ? 'none' : 'flex';
                }
            });
            if (isChecked) setTimeout(() => this._scrollToNextUnsorted(), 100);
        });

        document.getElementById('sorting-mode-add-btn').addEventListener('click', () => {
            document.getElementById('sorting-house-modal').classList.add('active');
            document.getElementById('new-house-in-search').focus();
        });

        document.getElementById('sorting-mode-show-inactive').addEventListener('click', () => {
            this._showInactiveList();
        });

        document.getElementById('sorting-mode-undo-btn').addEventListener('click', () => {
            if (this._deletedHouses.length === 0) {
                window.Utils.showAlert('ℹ️ មិនមានសកម្មភាពណាដែលអាចស្ដារបានទេ។');
                return;
            }
            const lastDeleted = this._deletedHouses.pop();
            this._restoreHouse(lastDeleted.invoice);
        });

        document.getElementById('sorting-mode-reset-btn').addEventListener('click', () => {
            if (this._inactiveSet.size === 0 && this._sortedSet.size === 0 && this._newHousesArray.length === 0) {
                window.Utils.showAlert('ℹ️ មិនមានការផ្លាស់ប្តូរអ្វីដែលត្រូវកំណត់ឡើងវិញទេ។');
                return;
            }
            if (confirm('🔄 តើអ្នកចង់កំណត់ឡើងវិញនូវរាល់ការផ្លាស់ប្តូរទាំងអស់មែនទេ?')) {
                const inactiveList = Array.from(this._inactiveSet);
                inactiveList.forEach(invoice => this._restoreHouse(invoice));
                
                this._newHousesArray.forEach(newHouse => {
                    const idx = window.currentExportData.findIndex(r => r.invoice === newHouse.invoice);
                    if (idx !== -1) window.currentExportData.splice(idx, 1);
                });

                this._sortedSet.clear();
                this._newHousesArray = [];
                this._deletedHouses = [];
                this._render();
                this._updateInactiveCounter();
                this._syncWithMainUI();
                window.Utils.showAlert(`✅ បានកំណត់ឡើងវិញទាំងស្រុង!`);
            }
        });

        document.getElementById('sorting-mode-submit-btn').addEventListener('click', () => {
            const reportData = {
                inactive_invoices: Array.from(this._inactiveSet),
                new_houses: this._newHousesArray,
                sorted_invoices: Array.from(this._sortedSet)
            };

            const totalChanges = reportData.inactive_invoices.length + reportData.new_houses.length;
            if (totalChanges === 0 && reportData.sorted_invoices.length === 0) {
                window.Utils.showAlert('ℹ️ មិនមានការផ្លាស់ប្តូរអ្វីដែលត្រូវផ្ញើទេ!');
                return;
            }

            const msg = `📤 តើអ្នកចង់ផ្ញើរបាយការណ៍ទៅ Admin មែនទេ?\n\n` +
                `🗑️ ផ្ទះលុបចេញ: ${reportData.inactive_invoices.length}\n` +
                `➕ ផ្ទះថ្មីបន្ថែម: ${reportData.new_houses.length}\n` +
                `📑 ផ្ទះតម្រៀប: ${reportData.sorted_invoices.length}`;

            if (confirm(msg)) {
                console.log("📤 Sending data to Server:", JSON.stringify(reportData, null, 2));
                window.Utils.showAlert(`📬 បានផ្ញើរបាយការណ៍ទៅ Admin រួចរាល់!`);
                
                this._inactiveSet.clear();
                this._newHousesArray = [];
                this._deletedHouses = [];
                this._saveInactiveList();
                this._render();
                this._updateInactiveCounter();
                this.close();
            }
        });

        document.getElementById('new-house-search-btn').addEventListener('click', () => this._searchHouse());
        document.getElementById('new-house-in-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._searchHouse();
        });

        document.getElementById('new-house-cancel').addEventListener('click', () => {
            this._clearModalForm();
            document.getElementById('sorting-house-modal').classList.remove('active');
        });

        document.getElementById('new-house-save').addEventListener('click', () => this._saveNewHouse());

        document.getElementById('sorting-house-modal').addEventListener('click', (e) => {
            if (e.target.id === 'sorting-house-modal') {
                this._clearModalForm();
                document.getElementById('sorting-house-modal').classList.remove('active');
            }
        });
    },

    // ============================================================
    // 🔍 SEARCH HOUSE
    // ============================================================
    _searchHouse: function() {
        const searchIn = document.getElementById('new-house-in-search').value.trim();
        const msgEl = document.getElementById('search-status-message');
        
        if (!searchIn) {
            msgEl.style.color = '#ef4444';
            msgEl.textContent = '⚠️ សូមបញ្ចូលលេខ IN ដែលចង់ស្វែងរក!';
            return;
        }

        const foundData = window.Utils.findByInvoice(searchIn);

        if (foundData) {
            document.getElementById('new-house-name').value = foundData.name || '';
            document.getElementById('new-house-box').value = foundData.box || '';
            document.getElementById('new-house-cabin').value = foundData.cabin || '';
            document.getElementById('new-house-address').value = foundData.address || '';
            document.getElementById('new-house-invoice').value = '';
            
            msgEl.style.color = '#16a34a';
            msgEl.textContent = '✅ រកឃើញទិន្នន័យ! សូមបំពេញលេខ IN ថ្មី និងទីតាំងបញ្ចូល។';
            document.getElementById('new-house-after-in').focus();
        } else {
            this._clearModalForm(false);
            msgEl.style.color = '#eab308';
            msgEl.textContent = 'ℹ️ រកមិនឃើញក្នុង Master Data សូមបំពេញព័ត៌មានដោយដៃ។';
        }
    },

    // ============================================================
    // 💾 SAVE NEW HOUSE (រក្សាទុកស្ថានភាព "មិនទាន់ចែក" តាមតម្រូវការ)
    // ============================================================
    _saveNewHouse: function() {
        const invoice = document.getElementById('new-house-invoice').value.trim();
        const afterIn = document.getElementById('new-house-after-in').value.trim();
        const name = document.getElementById('new-house-name').value.trim();
        const box = document.getElementById('new-house-box').value.trim();
        const cabin = document.getElementById('new-house-cabin').value.trim();
        const address = document.getElementById('new-house-address').value.trim();

        if (!invoice || !afterIn || !name) {
            window.Utils.showAlert('⚠️ សូមបំពេញព័ត៌មានចាំបាច់ (IN ថ្មី, ទីតាំងបញ្ចូល, ឈ្មោះ)!');
            return;
        }

        if (!window.currentExportData || !Array.isArray(window.currentExportData)) {
            window.currentExportData = [];
        }

        if (window.currentExportData.some(r => r.invoice === invoice)) {
            window.Utils.showAlert(`⚠️ លេខ IN "${invoice}" មានរួចហើយក្នុងផ្លូវនេះ!`);
            return;
        }

        const refIndex = window.currentExportData.findIndex(r => r.invoice === afterIn);
        if (refIndex === -1) {
            window.Utils.showAlert(`⚠️ រកមិនឃើញលេខ IN "${afterIn}" ក្នុងផ្លូវបច្ចុប្បន្ន!`);
            return;
        }

        // 🛠️ រក្សាស្ថានភាព "មិនទាន់ចែក" ព្រោះរៀបចំទិន្នន័យតាំងពីនៅផ្ទះ
        const newHouseData = {
            id: (window.masterData ? window.masterData.length : 0) + 1,
            invoice: invoice,
            name: name,
            box: box || 'N/A',
            cabin: cabin || window.currentCabinGlobal || 'N/A',
            address: address || 'N/A',
            status: 'មិនទាន់ចែក',
            method: '',
            deliveredAt: '',
            source: 'manual_insert'
        };

        // 1. បន្ថែមទៅ Master Data
        if (!window.masterData) window.masterData = [];
        if (!window.Utils.findByInvoice(invoice)) {
            window.masterData.push(newHouseData);
            window.Utils.rebuildMasterIndex();
        }

        // 2. បន្ថែមទៅ currentExportData តាមលំដាប់លំដោយ
        window.currentExportData.splice(refIndex + 1, 0, newHouseData);

        // 3. បន្ថែមទៅ route-sequence
        const routeBox = document.getElementById('route-sequence');
        if (routeBox) {
            let origText = routeBox.value;
            const regex = new RegExp(`(^|[\\r\\n\\s,;])(${afterIn})([\\r\\n\\s,;]|$)`);
            if (regex.test(origText)) {
                routeBox.value = origText.replace(regex, `$1$2\n${invoice}$3`);
            } else {
                routeBox.value += `\n${invoice}`;
            }
        }

        // 4. រក្សាទុកក្នុង Local Array សម្រាប់ផ្ញើរបាយការណ៍
        this._newHousesArray.push(newHouseData);

        // 🛠️ ធ្វើការ Sync ទៅកាន់ UI ធំ និងរុញចូល Database (IndexedDB) ភ្លាមៗ ការពារការបាត់បង់ទិន្នន័យ
        this._syncWithMainUI();
        this._render();

        this._clearModalForm();
        document.getElementById('sorting-house-modal').classList.remove('active');
        window.Utils.showAlert(`✅ បានបញ្ចូលផ្ទះថ្មី (IN ${invoice}) ទៅក្នុងខ្សែផ្លូវរួចរាល់!`);
        
        setTimeout(() => {
            const newItem = document.querySelector(`.sorting-item[data-invoice="${invoice}"]`);
            if (newItem) {
                newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newItem.style.border = '2px solid #16a34a';
                setTimeout(() => { newItem.style.border = ''; }, 1500);
            }
        }, 300);
    },

    // ============================================================
    // 🗑️ DELETE HOUSE
    // ============================================================
    _deleteHouse: function(invoice) {
        if (!window.currentExportData || !Array.isArray(window.currentExportData)) return;
        
        const idx = window.currentExportData.findIndex(r => r.invoice === invoice);
        if (idx === -1) return;

        const row = window.currentExportData[idx];
        this._deletedHouses.push({ invoice: invoice, row: { ...row } });
        this._inactiveSet.add(invoice);

        window.currentExportData.splice(idx, 1);

        const routeBox = document.getElementById('route-sequence');
        if (routeBox) {
            const regex = new RegExp(`(^|[\\r\\n\\s,;])(${invoice})([\\r\\n\\s,;]|$)`, 'g');
            routeBox.value = routeBox.value.replace(regex, '$1$3').trim();
        }

        if (this._sortedSet.has(invoice)) this._sortedSet.delete(invoice);

        this._saveInactiveList();
        this._render();
        this._updateInactiveCounter();
        this._syncWithMainUI();

        window.Utils.showAlert(`✅ បានលុបផ្ទះ "${row.name}" ជោគជ័យ!`);
        setTimeout(() => this._scrollToNextUnsorted(), 300);
    },

    // ============================================================
    // ↩️ RESTORE HOUSE
    // ============================================================
    _restoreHouse: function(invoice) {
        if (!window.currentExportData || !Array.isArray(window.currentExportData)) return;
        
        const row = window.Utils.findByInvoice(invoice);
        if (!row) return;

        this._inactiveSet.delete(invoice);

        if (!window.currentExportData.some(r => r.invoice === invoice)) {
            window.currentExportData.push(row);
        }

        const routeBox = document.getElementById('route-sequence');
        if (routeBox && !routeBox.value.includes(invoice)) {
            routeBox.value = (routeBox.value.trim() + `\n${invoice}`).trim();
        }

        this._saveInactiveList();
        this._render();
        this._updateInactiveCounter();
        this._syncWithMainUI();
    },

    _showInactiveList: function() {
        const inactiveList = Array.from(this._inactiveSet);
        if (inactiveList.length === 0) {
            window.Utils.showAlert('ℹ️ មិនមានផ្ទះណាដែលត្រូវបានលុបទេ។');
            return;
        }

        let msg = `📋 ផ្ទះដែលត្រូវបានលុបចេញ (${inactiveList.length}):\n\n`;
        inactiveList.forEach(invoice => {
            const row = window.Utils.findByInvoice(invoice);
            msg += row ? `• IN ${invoice} - ${row.name}\n` : `• IN ${invoice} (ក្រៅទិន្នន័យ)\n`;
        });
        msg += `\nចុច OK ដើម្បីស្ដារផ្ទះទាំងអស់មកវិញ`;

        if (confirm(msg)) {
            inactiveList.forEach(invoice => this._restoreHouse(invoice));
            this._deletedHouses = [];
            window.Utils.showAlert(`✅ បានស្ដារផ្ទះទាំងអស់មកវិញ!`);
        }
    },

    _clearModalForm: function(clearSearchInput = true) {
        if (clearSearchInput) document.getElementById('new-house-in-search').value = '';
        document.getElementById('new-house-after-in').value = '';
        document.getElementById('new-house-name').value = '';
        document.getElementById('new-house-box').value = '';
        document.getElementById('new-house-cabin').value = '';
        document.getElementById('new-house-address').value = '';
        document.getElementById('new-house-invoice').value = '';
        document.getElementById('search-status-message').textContent = '';
    },

    // ============================================================
    // 🖥️ RENDER
    // ============================================================
    _render: function() {
        const container = document.getElementById('sorting-mode-list');
        if (!container) return;

        const data = window.currentExportData || [];
        if (data.length === 0) {
            container.innerHTML = `<div class="empty-state-sorting">គ្មានទិន្នន័យផ្លូវទេ</div>`;
            return;
        }

        const esc = (window.Utils && typeof window.Utils.escapeHtml === 'function') 
            ? window.Utils.escapeHtml.bind(window.Utils) 
            : (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const hideCheckbox = document.getElementById('sorting-mode-hide-checkbox');
        const isHideChecked = hideCheckbox ? hideCheckbox.checked : false;

        let html = '';
        data.forEach((row, i) => {
            const isSorted = this._sortedSet.has(row.invoice);
            if (isHideChecked && isSorted) return;

            const isNew = row.source === 'manual_insert' ? 'style="border: 1px dashed #16a34a; background: #f0fdf4;"' : '';
            const indexBg = row.source === 'manual_insert' ? 'style="background:#16a34a; color:#fff;"' : '';
            const labelNew = row.source === 'manual_insert' ? '<span style="color:#16a34a; font-weight:bold; font-size:11px;">[ផ្ទះថ្មី]</span>' : '';

            html += `
                <div class="sorting-item ${isSorted ? 'is-sorted' : ''}" data-invoice="${esc(row.invoice)}" ${isNew}>
                    <div class="sorting-item-index" ${indexBg}>${row.source === 'manual_insert' ? '+' : i + 1}</div>
                    <div class="sorting-item-info">
                        <div class="sorting-item-name">${esc(row.name)} ${labelNew}</div>
                        <div class="sorting-item-meta">ប្រអប់ ${esc(row.box)} • IN ${esc(row.invoice)}</div>
                        <div class="sorting-item-address">📍 ${esc(row.address)}</div>
                    </div>
                    <div class="sorting-action-box">
                        <button type="button" class="sorting-btn-inactive">🗑️ លុប</button>
                        <div class="sorting-item-check">✓</div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || `<div class="empty-state-sorting" style="color:#16a34a;">🎉 ផ្ទះទាំងអស់ត្រូវបានតម្រៀបរួចរាល់!</div>`;
        this._updateInactiveCounter();
    },

    _scrollToNextUnsorted: function() {
        const container = document.getElementById('sorting-mode-list');
        if (!container) return;
        
        const nextItem = container.querySelector('.sorting-item:not(.is-sorted)');
        if (nextItem && nextItem.style.display !== 'none') {
            nextItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nextItem.style.border = '2px solid #f59e0b';
            setTimeout(() => { nextItem.style.border = ''; }, 1000);
        }
    }
};

// ============================================================
// 🚀 EMERGENCY ATTACH SYSTEM (Safe & Clean Solution)
// ============================================================
(function initSortingModeModule() {
    function launchSortingMode() {
        console.log('📑 Sorting Mode button clicked');
        if (!window.currentExportData || !Array.isArray(window.currentExportData)) {
            window.currentExportData = [];
        }
        if (window.currentExportData.length === 0) {
            window.Utils.showAlert('⚠️ សូមបង្កើតផ្លូវចែកជាមុនសិន (ចុច "រៀបចំតារាងចែក" ឬបើក Job)!');
            return;
        }
        if (window.SortingMode && typeof window.SortingMode.open === 'function') {
            window.SortingMode.open();
        } else {
            window.Utils.showAlert('⚠️ ប្រព័ន្ធ Sorting Mode មិនទាន់ផ្ទុក!');
        }
    }

    function syncButtonState() {
        const actionBar = document.getElementById('block-actions');
        if (!actionBar) return;

        let btn = document.getElementById('btn-sorting-mode');
        if (!btn) {
            actionBar.insertAdjacentHTML('beforeend', `
                <button type="button" class="btn" id="btn-sorting-mode" style="background:#7c3aed; color:#fff;">📑 តម្រៀបវិក្កយបត្រ</button>
            `);
            btn = document.getElementById('btn-sorting-mode');
        }

        if (btn && !btn._hasSortingAttached) {
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', launchSortingMode);
            clone._hasSortingAttached = true;
            console.log('✅ Sorting Mode button safely attached');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncButtonState);
    } else {
        syncButtonState();
    }

    if (window.MutationObserver) {
        const observer = new MutationObserver(() => syncButtonState());
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();

console.log('✅ Sorting Mode module fully loaded');