// ==========================================================================
// 📊 Regular Module – Complete Management (Import, CRUD, Status, Export)
// --------------------------------------------------------------------------
// Uses StorageEngine.loadRegularData() / saveRegularData().
// Fully self-contained. Does not modify other modules.
// Optimized for mobile with card layout.
// Includes "លាក់ផ្ទះដែលចែករួច" toggle.
// Fixed "Insert After" logic – using Array Splice for exact placement.
// ==========================================================================

window.RegularEngine = {
    _data: [],
    _initialized: false,
    _currentPage: 1,
    _pageSize: 50,

    // ---- PHASE 4: Virtual Scrolling properties ----
    _vFilteredRows: null,
    _vScrollHandler: null,
    _vContainer: null,
    VIRTUALIZE_THRESHOLD: 150,
    ROW_HEIGHT_ESTIMATE: 64,
    BUFFER_ROWS: 12,

    // ---- Init ----
    init: function() {
        if (this._initialized) return;
        console.log('📊 Regular Engine initializing...');
        this.loadData();
        this.injectUI();
        this.bindEvents();
        this.renderAll();
        this._initialized = true;
        console.log('📊 Regular Engine ready.');
    },

    renderNextUpCards: function() {
        console.log('📊 renderNextUpCards() called – no action needed.');
    },

    // ---- Data Persistence ----
    loadData: function() {
        try {
            const raw = window.StorageEngine.loadRegularData();
            this._data = Array.isArray(raw) ? raw.map(r => this._normalizeRecord(r)) : [];
            console.log('📊 Loaded Regular data:', this._data.length);
        } catch (e) {
            console.error('❌ Load Regular data error:', e);
            this._data = [];
        }
    },

    saveData: function() {
        try {
            window.StorageEngine.saveRegularData(this._data);
            console.log('📊 Saved Regular data:', this._data.length);
        } catch (e) {
            console.error('❌ Save Regular data error:', e);
            window.Utils.showAlert('⚠️ មិនអាចរក្សាទុកទិន្នន័យ Regular!');
        }
    },

    // ---- Normalize Record ----
    _normalizeRecord: function(record) {
        return {
            id: record.id || Date.now() + Math.random(),
            houseNumber: record.houseNumber || record.invoice || record._id || '',
            customerName: record.customerName || record.name || '',
            boxNumber: record.boxNumber || record.box || record.meter || '',
            phone: record.phone || '',
            address: record.address || '',
            remark: record.remark || '',
            status: record.status || 'Pending',
            method: record.method || '',
            deliveredAt: record.deliveredAt || '',
            noteId: record.noteId || '',
            createdAt: record.createdAt || new Date().toISOString(),
            updatedAt: record.updatedAt || new Date().toISOString()
        };
    },

    // ---- UI Injection ----
    injectUI: function() {
        const container = document.getElementById('area-regular');
        if (!container) return;

        this._injectStyles();

        container.innerHTML = `
            <div class="regular-toolbar">
                <div class="regular-import-bar">
                    <input type="file" id="regular-file-input" accept=".xlsx,.xls,.csv" style="display:none;" />
                    <button class="btn btn-primary" id="btn-regular-import">📥 នាំចូល</button>
                    <button class="btn btn-success" id="btn-regular-add">➕ បន្ថែម</button>
                    <button class="btn btn-danger" id="btn-regular-clear-all">🗑️ លុបទាំងអស់</button>
                </div>
                <div class="regular-search-filter">
                    <input type="text" id="regular-search" placeholder="🔍 ស្វែងរក (IN, ឈ្មោះ, ប.ត)..." />
                    <select id="regular-filter-status">
                        <option value="all">ទាំងអស់</option>
                        <option value="ticked">បានចែក</option>
                        <option value="unticked">មិនទាន់ចែក</option>
                    </select>
                    <select id="regular-filter-method">
                        <option value="all">ទាំងអស់</option>
                        <option value="ប្រអប់">ប្រអប់</option>
                        <option value="សន្តិសុខ">សន្តិសុខ</option>
                        <option value="បុគ្គលិក">បុគ្គលិក</option>
                        <option value="ម្ចាស់ទីតាំង">ម្ចាស់ទីតាំង</option>
                    </select>
                    <div style="display:flex; align-items:center; gap:6px; margin-left:4px; white-space:nowrap;">
                        <input type="checkbox" id="regular-hide-delivered" style="width:16px; height:16px; cursor:pointer;" />
                        <label for="regular-hide-delivered" style="font-weight:600; font-size:13px; color:var(--text); cursor:pointer;">👁️ លាក់ផ្ទះដែលចែករួច</label>
                    </div>
                </div>
                <div class="regular-export-bar">
                    <button class="btn btn-warning" id="btn-regular-export-excel">📤 Excel</button>
                    <button class="btn btn-slate" id="btn-regular-export-csv">📤 CSV</button>
                </div>
            </div>

            <div class="regular-stats" id="regular-stats">
                <div class="stat-card"><h3>សរុប</h3><p id="rstat-total">0</p></div>
                <div class="stat-card"><h3>បានចែក</h3><p id="rstat-completed" style="color:#16a34a;">0</p></div>
                <div class="stat-card"><h3>មិនទាន់ចែក</h3><p id="rstat-pending" style="color:#ea580c;">0</p></div>
                <div class="stat-card"><h3>ជម្រើសចែក</h3><p id="rstat-methods" style="font-size:12px;">-</p></div>
            </div>

            <!-- Desktop Table -->
            <div class="table-responsive regular-desktop-table">
                <table>
                    <thead id="regular-thead">
                        <tr>
                            <th style="width: 45px; text-align:center;">ល.រ</th>
                            <th style="min-width: 100px; text-align:center;">លេខIN</th>
                            <th style="min-width: 150px; text-align:left;">ឈ្មោះ</th>
                            <th style="min-width: 120px; text-align:center;">ប.ត</th>
                            <th style="min-width: 120px; text-align:center;">ជម្រើសចែក</th>
                            <th style="min-width: 120px; text-align:center;">ឈ្មោះអ្នកទទួល ID</th>
                            <th style="min-width: 150px; text-align:center;">ម៉ោងចែក</th>
                            <th style="width: 80px; text-align:center;">សកម្មភាព</th>
                        </tr>
                    </thead>
                    <tbody id="regular-tbody"></tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div id="regular-mobile-container" class="regular-mobile-cards" style="display:none;"></div>

            <div class="regular-pagination" id="regular-pagination"></div>
        `;

        this._buildModals();
    },

    // ---- Inject Clean Styles ----
    _injectStyles: function() {
        if (document.getElementById('regular-mobile-styles')) return;

        const style = document.createElement('style');
        style.id = 'regular-mobile-styles';
        style.textContent = `
            /* --- Common styles --- */
            .regular-toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; align-items: center; }
            .regular-import-bar, .regular-search-filter, .regular-export-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
            .regular-import-bar .btn, .regular-export-bar .btn { font-size: 13px; padding: 8px 14px; min-height: 36px; }
            #regular-search { min-width: 180px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 14px; }
            .regular-search-filter select { padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-input); color: var(--text); font-size: 13px; min-height: 38px; }
            .regular-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
            .regular-stats .stat-card p { font-size: 20px; }
            .regular-desktop-table table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .regular-desktop-table th { background: var(--bg); color: var(--text-secondary); font-weight: 700; padding: 10px 8px; border-bottom: 2px solid var(--border); white-space: nowrap; }
            .regular-desktop-table td { padding: 8px 6px; border-bottom: 1px solid var(--border); vertical-align: middle; }
            .regular-desktop-table tr:hover td { background: rgba(26,86,219,0.03); }
            .r-note-input { width: 100%; padding: 4px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-input); color: var(--text); font-size: 12px; text-align: center; min-width: 80px; }
            .r-method-buttons { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
            .r-method-btn { padding: 2px 8px; font-size: 16px; min-height: 30px; min-width: 36px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); cursor: pointer; transition: 0.15s ease; display: inline-flex; align-items: center; justify-content: center; }
            .r-method-btn.method-active { background: #2563eb; color: #fff; border-color: #2563eb; }
            .r-method-btn:hover { background: var(--border); }
            .r-method-btn.method-active:hover { background: #1d4ed8; }
            .r-time-display { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
            .r-btn-edit, .r-btn-delete { padding: 2px 6px; font-size: 12px; min-height: 28px; }

            /* --- Mobile Cards --- */
            @media (max-width: 768px) {
                .regular-desktop-table { display: none !important; }
                .regular-mobile-cards { display: block !important; }
                .regular-mobile-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 12px; box-shadow: var(--shadow); }
                .regular-mobile-card .r-card-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
                .regular-mobile-card .r-card-row:last-child { border-bottom: none; }
                .regular-mobile-card .r-card-label { font-weight: 600; color: var(--text-secondary); font-size: 13px; flex-shrink: 0; min-width: 80px; }
                .regular-mobile-card .r-card-value { color: var(--text); text-align: right; word-break: break-word; margin-left: 10px; }
                .regular-mobile-card .r-card-actions { display: flex; gap: 10px; margin-top: 10px; justify-content: flex-end; }
                .regular-mobile-card .r-card-actions button { min-height: 36px; padding: 6px 14px; font-size: 13px; }
                .regular-mobile-card .r-note-input { max-width: 150px; font-size: 13px; }
                .regular-mobile-card .r-method-buttons { justify-content: flex-end; }
                .regular-mobile-card .r-method-btn { font-size: 20px; min-height: 36px; min-width: 44px; padding: 4px 10px; }
                .regular-stats { grid-template-columns: 1fr 1fr !important; }
                .regular-import-bar .btn, .regular-export-bar .btn { font-size: 12px; padding: 6px 12px; min-height: 36px; width: auto; }
                #regular-search { min-width: 140px; font-size: 13px; }
                .regular-search-filter select { font-size: 12px; padding: 6px 10px; min-height: 36px; }
            }
            @media (min-width: 769px) { .regular-mobile-cards { display: none !important; } .regular-desktop-table { display: block !important; } }
        `;
        document.head.appendChild(style);
    },

    // ---- Modals ----
    _buildModals: function() {
        if (document.getElementById('regular-modal-overlay')) return;

        const modalHtml = `
            <div class="method-picker-overlay" id="regular-modal-overlay">
                <div class="method-picker-sheet" style="max-width:500px;">
                    <div class="method-picker-handle"></div>
                    <div class="method-picker-header">
                        <span id="regular-modal-title">➕ បន្ថែមថ្មី</span>
                        <button type="button" class="method-picker-close" id="regular-modal-close">✕</button>
                    </div>
                    <div style="padding:4px 0 12px;">
                        <input type="hidden" id="regular-modal-id" />
                        <div id="r-insert-after-container" style="margin-bottom:12px; padding:10px; background:rgba(37,99,235,0.08); border:1px dashed var(--border); border-radius:6px;">
                            <label style="font-weight:700;font-size:12px;color:var(--text);">📍 បញ្ចូលបន្ទាប់ពីលេខIN (ទទេ = បន្ថែមលើគេបង្អស់)</label>
                            <input type="text" id="r-insertAfterHouse" placeholder="ឧ. 123456" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:14px;margin-top:4px;">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div>
                                <label style="font-weight:700;font-size:12px;color:var(--text);">លេខIN *</label>
                                <input type="text" id="r-houseNumber" placeholder="ឧ. 123456" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:14px;">
                            </div>
                            <div>
                                <label style="font-weight:700;font-size:12px;color:var(--text);">ឈ្មោះអតិថិជន *</label>
                                <input type="text" id="r-customerName" placeholder="ឈ្មោះ..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:14px;">
                            </div>
                        </div>
                        <div style="margin-top:8px;">
                            <label style="font-weight:700;font-size:12px;color:var(--text);">ប.ត</label>
                            <input type="text" id="r-boxNumber" placeholder="ឧ. P1204" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:14px;">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
                            <div>
                                <label style="font-weight:700;font-size:12px;color:var(--text);">ID ចំណាំ</label>
                                <input type="text" id="r-noteId" placeholder="វាយ ID..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:14px;">
                            </div>
                            <div>
                                <label style="font-weight:700;font-size:12px;color:var(--text);">កំណត់ចំណាំ</label>
                                <input type="text" id="r-remark" placeholder="កំណត់ចំណាំ..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-input);color:var(--text);font-size:14px;">
                            </div>
                        </div>
                        <div style="display:flex;gap:10px;margin-top:12px;">
                            <button type="button" class="btn btn-success" id="regular-modal-save" style="flex:1;">💾 រក្សាទុក</button>
                            <button type="button" class="btn btn-slate" id="regular-modal-cancel" style="flex:1;">បោះបង់</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // ---- Event Binding ----
    bindEvents: function() {
        document.getElementById('btn-regular-import')?.addEventListener('click', () => {
            document.getElementById('regular-file-input')?.click();
        });
        document.getElementById('regular-file-input')?.addEventListener('change', (e) => this.importExcel(e));
        document.getElementById('btn-regular-add')?.addEventListener('click', () => this.openModal());

        document.getElementById('btn-regular-clear-all')?.addEventListener('click', () => {
            if (this._data.length === 0) return;
            if (!confirm(`⚠️ លុបទិន្នន័យ Regular ទាំង ${this._data.length} ជួរ ជាអចិន្ត្រៃយ៍?`)) return;
            this._data = [];
            this.saveData();
            this.renderAll();
            window.Utils.showAlert('🗑️ លុបទិន្នន័យទាំងអស់រួច!');
        });

        document.getElementById('regular-modal-close')?.addEventListener('click', () => this.closeModal());
        document.getElementById('regular-modal-cancel')?.addEventListener('click', () => this.closeModal());
        document.getElementById('regular-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'regular-modal-overlay') this.closeModal();
        });
        document.getElementById('regular-modal-save')?.addEventListener('click', () => this._saveModal());

        document.getElementById('regular-search')?.addEventListener('input', () => this.renderAll());
        document.getElementById('regular-filter-status')?.addEventListener('change', () => this.renderAll());
        document.getElementById('regular-filter-method')?.addEventListener('change', () => this.renderAll());
        document.getElementById('regular-hide-delivered')?.addEventListener('change', () => this.renderAll());

        document.getElementById('btn-regular-export-excel')?.addEventListener('click', () => this.exportExcel());
        document.getElementById('btn-regular-export-csv')?.addEventListener('click', () => this.exportCSV());

        const tbody = document.getElementById('regular-tbody');
        const mobileContainer = document.getElementById('regular-mobile-container');

        const handleInteraction = (e) => {
            const target = e.target;
            const row = target.closest('[data-id]');
            if (!row) return;
            const id = row.dataset.id;
            if (!id) return;

            const record = this._data.find(r => r.id == id);
            if (!record) return;

            if (target.classList.contains('r-method-btn')) {
                const method = target.dataset.method;
                if (record.method === method) {
                    record.method = '';
                    record.status = 'Pending';
                    record.deliveredAt = '';
                } else {
                    record.method = method;
                    record.status = 'បានចែករួច';
                    record.deliveredAt = new Date().toISOString();
                }
                record.updatedAt = new Date().toISOString();
                this.saveData();
                this.renderAll();
                return;
            }

            if (target.classList.contains('r-note-input') && e.type === 'change') {
                const newNoteId = target.value.trim();
                if (record.noteId !== newNoteId) {
                    record.noteId = newNoteId;
                    record.updatedAt = new Date().toISOString();
                    this.saveData();
                }
                return;
            }

            if (target.classList.contains('r-btn-edit')) {
                this.openModal(id);
                return;
            }

            if (target.classList.contains('r-btn-delete')) {
                this.deleteHouse(id);
                return;
            }
        };

        if (tbody) {
            tbody.addEventListener('click', handleInteraction);
            tbody.addEventListener('change', handleInteraction);
        }
        if (mobileContainer) {
            mobileContainer.addEventListener('click', handleInteraction);
            mobileContainer.addEventListener('change', handleInteraction);
        }

        document.getElementById('regular-pagination')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const page = parseInt(btn.dataset.page);
            if (!isNaN(page)) {
                this._currentPage = page;
                this.renderTable();
            }
        });
    },

    // ---- Modal Logic ----
    openModal: function(id = null) {
        const overlay = document.getElementById('regular-modal-overlay');
        if (!overlay) return;
        const title = document.getElementById('regular-modal-title');
        const idField = document.getElementById('regular-modal-id');
        const insertContainer = document.getElementById('r-insert-after-container');

        document.getElementById('r-insertAfterHouse').value = '';
        document.getElementById('r-houseNumber').value = '';
        document.getElementById('r-customerName').value = '';
        document.getElementById('r-boxNumber').value = '';
        document.getElementById('r-noteId').value = '';
        document.getElementById('r-remark').value = '';

        if (id) {
            if (insertContainer) insertContainer.style.display = 'none';
            const record = this._data.find(r => r.id == id);
            if (!record) return;
            title.textContent = '✏️ កែប្រែ';
            idField.value = id;
            document.getElementById('r-houseNumber').value = record.houseNumber || '';
            document.getElementById('r-customerName').value = record.customerName || '';
            document.getElementById('r-boxNumber').value = record.boxNumber || '';
            document.getElementById('r-noteId').value = record.noteId || '';
            document.getElementById('r-remark').value = record.remark || '';
        } else {
            if (insertContainer) insertContainer.style.display = 'block';
            title.textContent = '➕ បន្ថែមថ្មី';
            idField.value = '';
        }
        overlay.classList.add('active');
        document.getElementById('r-houseNumber').focus();
    },

    closeModal: function() {
        document.getElementById('regular-modal-overlay')?.classList.remove('active');
    },

    // ---- 🆕 Save Modal (ជួសជុល Logic Insert After ចាក់ចូលចំ Index 100%) ----
    _saveModal: function() {
        const id = document.getElementById('regular-modal-id').value;
        const houseNumber = document.getElementById('r-houseNumber').value.trim();
        const customerName = document.getElementById('r-customerName').value.trim();
        const boxNumber = document.getElementById('r-boxNumber').value.trim();
        const noteId = document.getElementById('r-noteId').value.trim();
        const remark = document.getElementById('r-remark').value.trim();
        const insertAfterHouse = document.getElementById('r-insertAfterHouse')?.value.trim();

        if (!houseNumber || !customerName) {
            window.Utils.showAlert('⚠️ សូមបំពេញ "លេខIN" និង "ឈ្មោះអតិថិជន"!');
            return;
        }

        if (id) {
            // ---- Edit ----
            const record = this._data.find(r => r.id == id);
            if (!record) return;
            record.houseNumber = houseNumber;
            record.customerName = customerName;
            record.boxNumber = boxNumber;
            record.noteId = noteId;
            record.remark = remark;
            record.updatedAt = new Date().toISOString();
            this.saveData();
            this.renderAll();
            this.closeModal();
            window.Utils.showAlert('✅ បានកែប្រែរួចរាល់!');
            return;
        }

        // ---- Add New ----
        const newRecord = {
            id: Date.now() + Math.random(),
            houseNumber: houseNumber,
            customerName: customerName,
            boxNumber: boxNumber,
            phone: '',
            address: '',
            remark: remark,
            noteId: noteId,
            status: 'Pending',
            method: '',
            deliveredAt: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (insertAfterHouse) {
            // ស្វែងរក Index របស់ផ្ទះគោលដៅនៅក្នុង Array ទិន្នន័យផ្ទាល់តែម្តង
            const targetIdx = this._data.findIndex(r => String(r.houseNumber).toLowerCase() === insertAfterHouse.toLowerCase());
            
            if (targetIdx !== -1) {
                // ប្រើប្រាស់ Splice ដើម្បីញាត់បញ្ចូលទៅចន្លោះ "បន្ទាប់ពី" ផ្ទះនោះភ្លាមៗ
                this._data.splice(targetIdx + 1, 0, newRecord);
                window.Utils.showAlert(`✅ បានបញ្ចូលលេខIN ${houseNumber} ទៅបន្ទាប់ពីលេខ ${insertAfterHouse}!`);
            } else {
                // បើអត់រកឃើញ គឺដាក់ចូលខាងលើគេបង្អស់ (Index 0)
                this._data.unshift(newRecord);
                window.Utils.showAlert(`⚠️ មិនរកឃើញលេខIN "${insertAfterHouse}" ទេ! ទិន្នន័យត្រូវបានបន្ថែមលើគេបង្អស់។`);
            }
        } else {
            // បើទុកប្រអប់ទទេ គឺបន្ថែមទៅលើគេបង្អស់ (Index 0)
            this._data.unshift(newRecord);
            window.Utils.showAlert(`✅ បានបន្ថែមលេខIN ${houseNumber} រួចរាល់!`);
        }

        this.saveData();
        this.renderAll();
        this.closeModal();
    },

    // ---- CRUD ----
    deleteHouse: function(id) {
        const record = this._data.find(r => r.id == id);
        if (!record) return;
        if (!confirm(`⚠️ លុបលេខIN "${record.houseNumber}" (${record.customerName}) ជាអចិន្ត្រៃយ៍?`)) return;
        this._data = this._data.filter(r => r.id != id);
        this.saveData();
        this.renderAll();
        window.Utils.showAlert(`🗑️ បានលុបលេខIN ${record.houseNumber} រួច!`);
    },

    // ---- Import ----
    importExcel: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (typeof XLSX === 'undefined') {
            window.Utils.showAlert('❌ Library XLSX មិនត្រូវបានផ្ទុក!');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                let headerRow = -1;
                let headers = [];
                for (let r = 0; r < Math.min(aoa.length, 20); r++) {
                    const row = aoa[r];
                    if (!row || !Array.isArray(row)) continue;
                    const rowStr = row.map(c => String(c || "").toLowerCase().trim());
                    if (rowStr.some(c => c.includes('លេខ') || c.includes('ឈ្មោះ') || c.includes('ប.ត') || c.includes('ប្រអប់') || c.includes('box') || c.includes('meter') || c.includes('name'))) {
                        headerRow = r;
                        headers = rowStr;
                        break;
                    }
                }

                if (headerRow === -1) {
                    for (let i = 0; i < aoa.length; i++) {
                        const row = aoa[i];
                        if (row && row.length > 0 && String(row[0]).trim()) {
                            const record = this._normalizeRecord({
                                houseNumber: String(row[0] || '').trim(),
                                customerName: String(row[1] || '').trim(),
                                boxNumber: String(row[2] || '').trim(),
                                remark: String(row[3] || '').trim(),
                                noteId: String(row[4] || '').trim()
                            });
                            if (record.houseNumber) this._data.push(record);
                        }
                    }
                } else {
                    const map = {
                        houseNumber: ['លេខផ្ទះ', 'house number', 'house', 'លេខ', 'invoice', 'id', 'លេខin', 'លេខ in', 'លេខIN', 'លេខ IN'],
                        customerName: ['ឈ្មោះ', 'ឈ្មោះអតិថិជន', 'name', 'customer'],
                        boxNumber: ['ប.ត', 'ប្រអប់', 'box', 'meter', 'meter number', 'ប.ត.'],
                        noteId: ['idឬឈ្មោះអ្នកទទួល', 'note id', 'note', 'id number'],
                        remark: ['កំណត់ចំណាំ', 'remark', 'note']
                    };

                    const fieldMap = {};
                    for (const [field, keywords] of Object.entries(map)) {
                        const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
                        if (idx !== -1) fieldMap[field] = idx;
                    }

                    const startRow = headerRow + 1;
                    for (let r = startRow; r < aoa.length; r++) {
                        const row = aoa[r];
                        if (!row || row.length === 0) continue;
                        const record = this._normalizeRecord({
                            houseNumber: String(row[fieldMap.houseNumber] || '').trim(),
                            customerName: String(row[fieldMap.customerName] || '').trim(),
                            boxNumber: String(row[fieldMap.boxNumber] || '').trim(),
                            noteId: String(row[fieldMap.noteId] || '').trim(),
                            remark: String(row[fieldMap.remark] || '').trim()
                        });
                        if (record.houseNumber) this._data.push(record);
                    }
                }

                this.saveData();
                this.renderAll();
                window.Utils.showAlert(`✅ បាននាំចូល ${this._data.length} ផ្ទះ!`);
            } catch (err) {
                console.error('❌ Import error:', err);
                window.Utils.showAlert('❌ ការអានហ្វាល់បរាជ័យ!');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    },

    // ---- Render ----
    renderAll: function() {
        this.renderStats();
        this.renderTable();
    },

    renderStats: function() {
        const data = this._data;
        const total = data.length;
        const completed = data.filter(r => r.deliveredAt !== '').length;
        const pending = total - completed;

        const methodCounts = {};
        data.forEach(r => { if (r.method) methodCounts[r.method] = (methodCounts[r.method] || 0) + 1; });
        const methodSummary = Object.entries(methodCounts)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ') || '-';

        document.getElementById('rstat-total').textContent = total;
        document.getElementById('rstat-completed').textContent = completed;
        document.getElementById('rstat-pending').textContent = pending;
        document.getElementById('rstat-methods').textContent = methodSummary;
    },

    // ---- PHASE 4: renderTable with Virtual Scrolling ----
    renderTable: function() {
        const tbody = document.getElementById('regular-tbody');
        const mobileContainer = document.getElementById('regular-mobile-container');
        if (!tbody || !mobileContainer) return;

        const search = document.getElementById('regular-search')?.value.trim().toLowerCase() || '';
        const statusFilter = document.getElementById('regular-filter-status')?.value || 'all';
        const methodFilter = document.getElementById('regular-filter-method')?.value || 'all';
        const hideDelivered = document.getElementById('regular-hide-delivered')?.checked || false;

        let filtered = this._data.filter(record => {
            if (search) {
                const text = `${record.houseNumber} ${record.customerName} ${record.boxNumber} ${record.noteId} ${record.phone}`.toLowerCase();
                if (!text.includes(search)) return false;
            }
            if (statusFilter === 'ticked' && !record.deliveredAt) return false;
            if (statusFilter === 'unticked' && record.deliveredAt) return false;
            if (methodFilter !== 'all' && record.method !== methodFilter) return false;
            if (hideDelivered && record.deliveredAt) return false;
            return true;
        });

        // 💡 ចំណុចគន្លឹះ៖ លុបបន្ទាត់ filtered.sort(...) ចោល ដើម្បីរក្សាលំដាប់លំដោយ Array ដើមពីការ Splice

        const total = filtered.length;
        const totalPages = Math.ceil(total / this._pageSize) || 1;
        if (this._currentPage > totalPages) this._currentPage = totalPages;
        if (this._currentPage < 1) this._currentPage = 1;
        const start = (this._currentPage - 1) * this._pageSize;
        const end = Math.min(start + this._pageSize, total);
        const pageData = filtered.slice(start, end);

        const methodIcons = {
            'ប្រអប់': '📦',
            'សន្តិសុខ': '👮',
            'បុគ្គលិក': '🧑‍🏫',
            'ម្ចាស់ទីតាំង': '🏠'
        };
        const methodOptions = Object.keys(methodIcons);

        // ---- Desktop Table ----
        // PHASE 4: Use virtual scrolling if pageData is large and not searching
        const isVirtual = pageData.length > this.VIRTUALIZE_THRESHOLD && !search;
        if (isVirtual) {
            this._vFilteredRows = pageData;
            this._setupVirtualRenderRegular();
        } else {
            this._teardownVirtualRenderRegular();
            if (pageData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="empty-state">📭 គ្មានទិន្នន័យ</td></tr>`;
            } else {
                const esc = window.Utils.escapeHtml.bind(window.Utils);
                tbody.innerHTML = pageData.map((r, idx) => {
                    const deliveredAtDisplay = r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '';

                    const methodButtons = methodOptions.map(m => {
                        const active = r.method === m ? 'method-active' : '';
                        const icon = methodIcons[m] || m;
                        return `<button type="button" class="r-method-btn ${active}" data-method="${esc(m)}" title="${esc(m)}">${icon}</button>`;
                    }).join('');

                    const noteInput = `<input type="text" class="r-note-input" value="${esc(r.noteId)}" placeholder="ID" />`;

                    return `
                        <tr data-id="${esc(r.id)}">
                            <td style="text-align:center;">${start + idx + 1}</td>
                            <td style="text-align:center;"><strong>${esc(r.houseNumber)}</strong></td>
                            <td style="text-align:left;">${esc(r.customerName)}</td>
                            <td style="text-align:center;">${esc(r.boxNumber)}</td>
                            <td style="text-align:center;"><div class="r-method-buttons">${methodButtons}</div></td>
                            <td style="text-align:center;">${noteInput}</td>
                            <td class="r-time-display" style="text-align:center;font-size:11px;color:var(--text-secondary);font-weight:bold;">${deliveredAtDisplay}</td>
                            <td style="text-align:center;white-space:nowrap;">
                                <button type="button" class="btn btn-sm btn-primary r-btn-edit" style="padding:2px 6px; font-size:11px; min-height:28px;">✏️</button>
                                <button type="button" class="btn btn-sm btn-danger r-btn-delete" style="padding:2px 6px; font-size:11px; min-height:28px;">🗑️</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // ---- Mobile Cards (always full render, no virtual) ----
        if (pageData.length === 0) {
            mobileContainer.innerHTML = `<div class="empty-state">📭 គ្មានទិន្នន័យ</div>`;
        } else {
            const esc = window.Utils.escapeHtml.bind(window.Utils);
            mobileContainer.innerHTML = pageData.map((r, idx) => {
                const deliveredAtDisplay = r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '';

                const methodButtons = methodOptions.map(m => {
                    const active = r.method === m ? 'method-active' : '';
                    const icon = methodIcons[m] || m;
                    return `<button type="button" class="r-method-btn ${active}" data-method="${esc(m)}" title="${esc(m)}">${icon}</button>`;
                }).join('');

                const noteInput = `<input type="text" class="r-note-input" value="${esc(r.noteId)}" placeholder="ID" />`;

                return `
                    <div class="regular-mobile-card" data-id="${esc(r.id)}">
                        <div class="r-card-row">
                            <span class="r-card-label">ល.រ</span>
                            <span class="r-card-value">${start + idx + 1}</span>
                        </div>
                        <div class="r-card-row">
                            <span class="r-card-label">លេខIN</span>
                            <span class="r-card-value"><strong>${esc(r.houseNumber)}</strong></span>
                        </div>
                        <div class="r-card-row">
                            <span class="r-card-label">ឈ្មោះ</span>
                            <span class="r-card-value">${esc(r.customerName)}</span>
                        </div>
                        <div class="r-card-row">
                            <span class="r-card-label">ប.ត</span>
                            <span class="r-card-value">${esc(r.boxNumber)}</span>
                        </div>
                        <div class="r-card-row">
                            <span class="r-card-label">ជម្រើសចែក</span>
                            <span class="r-card-value"><div class="r-method-buttons">${methodButtons}</div></span>
                        </div>
                        <div class="r-card-row">
                            <span class="r-card-label">ID ចំណាំ</span>
                            <span class="r-card-value">${noteInput}</span>
                        </div>
                        <div class="r-card-row">
                            <span class="r-card-label">ម៉ោងចែក</span>
                            <span class="r-card-value r-time-display">${deliveredAtDisplay}</span>
                        </div>
                        <div class="r-card-actions">
                            <button type="button" class="btn btn-sm btn-primary r-btn-edit">✏️</button>
                            <button type="button" class="btn btn-sm btn-danger r-btn-delete">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Pagination
        const paginationContainer = document.getElementById('regular-pagination');
        if (paginationContainer) {
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
            } else {
                let pHtml = `<div class="jobs-pagination"><button class="btn btn-sm page-btn" data-page="${this._currentPage - 1}" ${this._currentPage === 1 ? 'disabled' : ''}>⬅️</button>`;
                pHtml += `<span>${this._currentPage} / ${totalPages}</span>`;
                pHtml += `<button class="btn btn-sm page-btn" data-page="${this._currentPage + 1}" ${this._currentPage === totalPages ? 'disabled' : ''}>➡️</button></div>`;
                paginationContainer.innerHTML = pHtml;
            }
        }
    },

    // ---- PHASE 4: Virtual Scrolling methods for Regular ----
    _setupVirtualRenderRegular: function() {
        const container = document.querySelector('.regular-desktop-table');
        if (!container) {
            // Fallback: render all
            this._teardownVirtualRenderRegular();
            const tbody = document.getElementById('regular-tbody');
            if (tbody && this._vFilteredRows) {
                const esc = window.Utils.escapeHtml.bind(window.Utils);
                const methodIcons = {
                    'ប្រអប់': '📦',
                    'សន្តិសុខ': '👮',
                    'បុគ្គលិក': '🧑‍🏫',
                    'ម្ចាស់ទីតាំង': '🏠'
                };
                const methodOptions = Object.keys(methodIcons);
                tbody.innerHTML = this._vFilteredRows.map((r, idx) => {
                    const deliveredAtDisplay = r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '';
                    const methodButtons = methodOptions.map(m => {
                        const active = r.method === m ? 'method-active' : '';
                        const icon = methodIcons[m] || m;
                        return `<button type="button" class="r-method-btn ${active}" data-method="${esc(m)}" title="${esc(m)}">${icon}</button>`;
                    }).join('');
                    const noteInput = `<input type="text" class="r-note-input" value="${esc(r.noteId)}" placeholder="ID" />`;
                    return `
                        <tr data-id="${esc(r.id)}">
                            <td style="text-align:center;">${idx + 1}</td>
                            <td style="text-align:center;"><strong>${esc(r.houseNumber)}</strong></td>
                            <td style="text-align:left;">${esc(r.customerName)}</td>
                            <td style="text-align:center;">${esc(r.boxNumber)}</td>
                            <td style="text-align:center;"><div class="r-method-buttons">${methodButtons}</div></td>
                            <td style="text-align:center;">${noteInput}</td>
                            <td class="r-time-display" style="text-align:center;font-size:11px;color:var(--text-secondary);font-weight:bold;">${deliveredAtDisplay}</td>
                            <td style="text-align:center;white-space:nowrap;">
                                <button type="button" class="btn btn-sm btn-primary r-btn-edit" style="padding:2px 6px; font-size:11px; min-height:28px;">✏️</button>
                                <button type="button" class="btn btn-sm btn-danger r-btn-delete" style="padding:2px 6px; font-size:11px; min-height:28px;">🗑️</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
            return;
        }
        this._vContainer = container;
        this._renderVirtualWindowRegular(container);
        if (this._vScrollHandler) {
            container.removeEventListener('scroll', this._vScrollHandler);
            this._vScrollHandler = null;
        }
        let ticking = false;
        this._vScrollHandler = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                this._renderVirtualWindowRegular(container);
                ticking = false;
            });
        };
        container.addEventListener('scroll', this._vScrollHandler, { passive: true });
    },

    _teardownVirtualRenderRegular: function() {
        if (this._vScrollHandler && this._vContainer) {
            this._vContainer.removeEventListener('scroll', this._vScrollHandler);
            this._vScrollHandler = null;
        }
        this._vContainer = null;
        this._vFilteredRows = null;
    },

    _renderVirtualWindowRegular: function(container) {
        const tbody = document.getElementById('regular-tbody');
        const rows = this._vFilteredRows;
        if (!tbody || !rows || rows.length === 0) return;
        
        const n = rows.length;
        const rh = this.ROW_HEIGHT_ESTIMATE;
        const scrollTop = container ? container.scrollTop : 0;
        const containerHeight = container ? container.clientHeight : window.innerHeight;
        
        let start = Math.floor(scrollTop / rh) - this.BUFFER_ROWS;
        let end = Math.ceil((scrollTop + containerHeight) / rh) + this.BUFFER_ROWS;
        start = Math.max(0, Math.min(start, n - 1));
        end = Math.max(start, Math.min(end, n - 1));
        
        const esc = window.Utils.escapeHtml.bind(window.Utils);
        const methodIcons = {
            'ប្រអប់': '📦',
            'សន្តិសុខ': '👮',
            'បុគ្គលិក': '🧑‍🏫',
            'ម្ចាស់ទីតាំង': '🏠'
        };
        const methodOptions = Object.keys(methodIcons);
        
        let html = `<tr class="v-spacer" style="height:${start * rh}px;padding:0;border:0;"><td colspan="8" style="padding:0;border:0;"></td></tr>`;
        for (let i = start; i <= end; i++) {
            const r = rows[i];
            const deliveredAtDisplay = r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '';
            const methodButtons = methodOptions.map(m => {
                const active = r.method === m ? 'method-active' : '';
                const icon = methodIcons[m] || m;
                return `<button type="button" class="r-method-btn ${active}" data-method="${esc(m)}" title="${esc(m)}">${icon}</button>`;
            }).join('');
            const noteInput = `<input type="text" class="r-note-input" value="${esc(r.noteId)}" placeholder="ID" />`;
            
            html += `
                <tr data-id="${esc(r.id)}">
                    <td style="text-align:center;">${start + i + 1}</td>
                    <td style="text-align:center;"><strong>${esc(r.houseNumber)}</strong></td>
                    <td style="text-align:left;">${esc(r.customerName)}</td>
                    <td style="text-align:center;">${esc(r.boxNumber)}</td>
                    <td style="text-align:center;"><div class="r-method-buttons">${methodButtons}</div></td>
                    <td style="text-align:center;">${noteInput}</td>
                    <td class="r-time-display" style="text-align:center;font-size:11px;color:var(--text-secondary);font-weight:bold;">${deliveredAtDisplay}</td>
                    <td style="text-align:center;white-space:nowrap;">
                        <button type="button" class="btn btn-sm btn-primary r-btn-edit" style="padding:2px 6px; font-size:11px; min-height:28px;">✏️</button>
                        <button type="button" class="btn btn-sm btn-danger r-btn-delete" style="padding:2px 6px; font-size:11px; min-height:28px;">🗑️</button>
                    </td>
                </tr>
            `;
        }
        html += `<tr class="v-spacer" style="height:${(n - 1 - end) * rh}px;padding:0;border:0;"><td colspan="8" style="padding:0;border:0;"></td></tr>`;
        tbody.innerHTML = html;
    },

    // ---- Export ----
    exportExcel: function() {
        if (this._data.length === 0) {
            window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export!');
            return;
        }
        if (typeof ExcelJS === 'undefined') {
            window.Utils.showAlert('❌ Library ExcelJS មិនត្រូវបានផ្ទុក!');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Regular');

            const headers = ['ល.រ', 'លេខIN', 'ឈ្មោះ', 'ប.ត', 'ជម្រើសនៃការចែក', 'IDឬឈ្មោះអ្នកទទួល', 'ម៉ោងចែក', 'កំណត់ចំណាំ'];
            const headerRow = worksheet.getRow(1);
            headerRow.height = 25;
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { bold: true, name: 'Khmer OS Battambang' };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            this._data.forEach((r, idx) => {
                const row = worksheet.getRow(idx + 2);
                const cells = [
                    idx + 1,
                    r.houseNumber || '',
                    r.customerName || '',
                    r.boxNumber || '',
                    r.method || '',
                    r.noteId || '',
                    r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '',
                    r.remark || ''
                ];
                cells.forEach((val, ci) => {
                    const cell = row.getCell(ci + 1);
                    cell.value = val;
                    cell.font = { name: 'Khmer OS Battambang', size: 10 };
                    cell.alignment = { horizontal: ci === 2 || ci === 3 ? 'left' : 'center', vertical: 'middle', wrapText: true };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            worksheet.getColumn(1).width = 8;
            worksheet.getColumn(2).width = 16;
            worksheet.getColumn(3).width = 28;
            worksheet.getColumn(4).width = 18;
            worksheet.getColumn(5).width = 20;
            worksheet.getColumn(6).width = 16;
            worksheet.getColumn(7).width = 24;
            worksheet.getColumn(8).width = 20;

            workbook.xlsx.writeBuffer().then((buffer) => {
                const dateStr = new Date().toISOString().slice(0,10);
                saveAs(new Blob([buffer]), `Regular_${dateStr}.xlsx`);
                window.Utils.showAlert('✅ Export Excel រួចរាល់!');
            });
        } catch (err) {
            console.error('❌ Export error:', err);
            window.Utils.showAlert('❌ Export បរាជ័យ!');
        }
    },

    exportCSV: function() {
        if (this._data.length === 0) {
            window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export!');
            return;
        }
        try {
            const headers = ['លេខIN', 'ឈ្មោះ', 'ប.ត', 'ជម្រើសនៃការចែក', 'IDឬឈ្មោះអ្នកទទួល', 'ម៉ោងចែក', 'កំណត់ចំណាំ'];
            let csv = headers.join(',') + '\n';
            this._data.forEach(r => {
                const row = [
                    r.houseNumber || '',
                    r.customerName || '',
                    r.boxNumber || '',
                    r.method || '',
                    r.noteId || '',
                    r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : '',
                    r.remark || ''
                ];
                csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
            });

            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Regular_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            window.Utils.showAlert('✅ Export CSV រួចរាល់!');
        } catch (err) {
            console.error('❌ CSV Export error:', err);
            window.Utils.showAlert('❌ Export CSV បរាជ័យ!');
        }
    }
};

// ---- Auto-init ----
document.addEventListener('DOMContentLoaded', function() {
    const areaRegular = document.getElementById('area-regular');
    if (areaRegular && areaRegular.style.display !== 'none') {
        if (window.RegularEngine && typeof window.RegularEngine.init === 'function') {
            window.RegularEngine.init();
        }
    }
});

if (typeof window.openRegularTab === 'function') {
    const originalOpenRegularTab = window.openRegularTab;
    window.openRegularTab = function() {
        if (window.RegularEngine && typeof window.RegularEngine.init === 'function') {
            window.RegularEngine.init();
        }
        originalOpenRegularTab();
    };
} else {
    window.openRegularTab = function() {
        document.getElementById('area-setup').style.display = 'none';
        document.getElementById('block-history').style.display = 'none';
        document.getElementById('block-stats').style.display = 'none';
        document.getElementById('block-actions').style.display = 'none';
        document.getElementById('area-field').style.display = 'none';
        document.getElementById('area-jobs').style.display = 'none';
        document.getElementById('area-companies').style.display = 'none';
        document.getElementById('area-regular').style.display = 'block';
        document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('tab-active'));
        document.getElementById('tab-regular').classList.add('tab-active');

        if (window.RegularEngine && typeof window.RegularEngine.init === 'function') {
            window.RegularEngine.init();
        }
        if (window.StorageEngine && typeof window.StorageEngine.saveSessionCache === 'function') {
            window.StorageEngine.saveSessionCache();
        }
    };
}