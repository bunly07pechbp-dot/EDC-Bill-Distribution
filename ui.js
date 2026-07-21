// ================================================================
// 🖥️ UI MODULE - Premium Mobile-First Overhaul (Perfect Fixed 2026)
// ================================================================

window.UI = {
    nextUpAnchorIndex: 0,
    _cardQueue: [],
    _queueCursor: 0,
    _stats: null,
    CARD_QUEUE_SIZE: 3,

    VIRTUALIZE_THRESHOLD: 150,
    ROW_HEIGHT_ESTIMATE: 64,
    BUFFER_ROWS: 12,
    _searchActive: false,
    _vFilteredRows: null,
    _vScrollHandler: null,
    _vContainer: null, // PHASE 4: container reference for virtual scrolling
    // PHASE 1: Removed _debouncedPersist - now handled centrally in StorageEngine

    _addHouseState: { refIndex: -1, refInvoice: null, newInvoice: null, foundRecord: null },

    // ---- Theme Management ----
    _getStoredTheme: function() {
        try {
            return localStorage.getItem('edc_theme_preference') || 'light';
        } catch (e) {
            return 'light';
        }
    },

    _setStoredTheme: function(theme) {
        try {
            localStorage.setItem('edc_theme_preference', theme);
        } catch (e) {
            // ignore
        }
    },

    _applyTheme: function(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-theme', isDark);
        const btn = document.getElementById('btn-theme-toggle');
        if (btn) {
            if (isDark) {
                btn.innerHTML = '<i data-lucide="sun" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> <span style="margin-left: 4px; vertical-align: middle; font-size: 13px;">Light Mode</span>';
            } else {
                btn.innerHTML = '<i data-lucide="moon" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> <span style="margin-left: 4px; vertical-align: middle; font-size: 13px;">Dark Mode</span>';
            }
            if (window.lucide) { lucide.createIcons(); }
        }
        this._setStoredTheme(theme);
    },

    _toggleTheme: function() {
        const current = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this._applyTheme(next);
    },

    _getSystemFormattedDate: function() {
        const options = { month: 'long', year: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    },

    // ============================================================
    // 1. INIT
    // ============================================================
    init: function() {
        console.log('🖥️ UI.init() called');
        
        // --- Apply saved theme on load ---
        const savedTheme = this._getStoredTheme();
        this._applyTheme(savedTheme);
        
        // --- Display current month ---
        const jobMonthElement = document.getElementById('current-billing-month');
        if (jobMonthElement) {
            jobMonthElement.innerText = this._getSystemFormattedDate();
        }
        
        // --- Clean Data Button (New Job) ---
        const cleanBtn = document.getElementById('btn-clean-data');
        if (cleanBtn) {
            cleanBtn.addEventListener('click', () => window.UI.cleanData());
        }

        // --- Process Route Button ---
        const processBtn = document.getElementById('btn-process-route');
        if (processBtn) {
            const newBtn = processBtn.cloneNode(true);
            processBtn.parentNode.replaceChild(newBtn, processBtn);
            
            newBtn.addEventListener('click', function(e) {
                console.log('🚀 "រៀបចំតារាងចែក" button clicked');
                
                if (!window.RouteEngine) {
                    window.Utils.showAlert('❌ ប្រព័ន្ធ Route Engine មិនទាន់ផ្ទុក!');
                    return;
                }
                
                if (!window.masterData || window.masterData.length === 0) {
                    window.Utils.showAlert('⚠️ សូមបញ្ចូលហ្វាល់ Excel ជាមុនសិន!');
                    return;
                }
                
                const inputText = document.getElementById('route-sequence').value.trim();
                if (!inputText) {
                    window.Utils.showAlert('⚠️ សូមបញ្ចូលបញ្ជីលេខ IN តាមលំដាប់ផ្លូវដើរសិន!');
                    return;
                }
                
                try {
                    const result = window.RouteEngine.processSequence();
                    if (result) {
                        if (window.UI && typeof window.UI.enterFieldMode === 'function') {
                            window.UI.enterFieldMode(true);
                        }
                    }
                } catch (err) {
                    console.error('❌ Route processing error:', err);
                    window.Utils.showAlert('❌ កំហុស: ' + err.message);
                }
            });
        }

        // --- Back to Setup ---
        const backSetupBtn = document.getElementById('btn-back-setup');
        if (backSetupBtn) {
            backSetupBtn.addEventListener('click', this.switchToSetupMode.bind(this));
        }

        // --- Load History ---
        const loadHistoryBtn = document.getElementById('btn-load-history');
        if (loadHistoryBtn) {
            loadHistoryBtn.addEventListener('click', () => window.StorageEngine.loadSelectedHistory());
        }

        // --- Clear Master Data ---
        const clearMasterBtn = document.getElementById('btn-clear-master-data');
        if (clearMasterBtn) {
            clearMasterBtn.addEventListener('click', () => window.UI.clearAllMasterData());
        }

        // --- Hide Done Checkbox ---
        const chkHideDone = document.getElementById('chk-hide-done');
        if (chkHideDone) {
            chkHideDone.addEventListener('change', () => this.renderTable(window.currentExportData));
        }

        // --- Global Search Bar ---
        const searchBox = document.getElementById('search-invoice');
        if (searchBox) {
            const runSearch = window.Utils.debounce((term) => {
                document.querySelectorAll('#table-body tr[data-invoice]').forEach(row => {
                    row.style.display = (row.dataset.search || '').includes(term) ? '' : 'none';
                });
            }, 80);
            searchBox.addEventListener('input', (e) => {
                const term = e.target.value.trim().toLowerCase();
                const wasActive = this._searchActive;
                this._searchActive = term.length > 0;
                if (this._searchActive !== wasActive) this.renderTable(window.currentExportData);
                runSearch(term);
            });
        }

        // --- Jump to IN ---
        const jumpBtn = document.getElementById('btn-jump-to-in');
        const jumpInput = document.getElementById('jump-to-in-input');
        if (jumpBtn && jumpInput) {
            const doJump = () => {
                const target = jumpInput.value.trim();
                if (!target) return;
                const idx = (window.currentExportData || []).findIndex(r => r.invoice === target);
                if (idx === -1) { window.Utils.showAlert(`⚠️ រកមិនឃើញ IN "${target}"`); return; }
                this.nextUpAnchorIndex = idx;
                this._rebuildQueueFromAnchor();
                const tryHighlight = (attempts) => {
                    const row = document.getElementById(`row_${target}`);
                    if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('jump-highlight'); setTimeout(() => row.classList.remove('jump-highlight'), 1200); } 
                    else if (attempts > 0) requestAnimationFrame(() => tryHighlight(attempts - 1));
                };
                tryHighlight(5);
                jumpInput.value = '';
            };
            jumpBtn.addEventListener('click', doJump);
            jumpInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doJump(); });
        }

        // --- Table Body Click (Method Picker) --- PHASE 5: Add touchstart for iOS
        // Keep click for desktop
        document.getElementById('table-body').addEventListener('click', (e) => {
            if (e.target.closest('input, .regular-receiver-input, .regular-signature-input')) {
                return;
            }
            const row = e.target.closest('tr[data-invoice]');
            if (row) {
                const invoice = row.dataset.invoice;
                const idx = (window.currentExportData || []).findIndex(r => r.invoice === invoice);
                if (idx !== -1) { this.nextUpAnchorIndex = idx; this._rebuildQueueFromAnchor(); }
                this.openMethodPicker(invoice, row.dataset.currentMethod);
            }
        });

        // Add touchstart for faster mobile response
        document.getElementById('table-body').addEventListener('touchstart', (e) => {
            if (e.target.closest('input, .regular-receiver-input, .regular-signature-input')) {
                return;
            }
            const row = e.target.closest('tr[data-invoice]');
            if (row) {
                const invoice = row.dataset.invoice;
                const idx = (window.currentExportData || []).findIndex(r => r.invoice === invoice);
                if (idx !== -1) { this.nextUpAnchorIndex = idx; this._rebuildQueueFromAnchor(); }
                this.openMethodPicker(invoice, row.dataset.currentMethod);
            }
        }, { passive: true });

        // --- Method Picker Modal ---
        const modal = document.getElementById('method-picker-modal');
        if (modal) {
            modal.addEventListener('click', (e) => { if (e.target === modal) this.closeMethodPicker(); });
            modal.querySelectorAll('.method-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const invoice = modal.dataset.activeInvoice;
                    const method = opt.dataset.method;
                    if (invoice) { this.commitSelection(invoice, method); this.updateRowMethodButton(invoice); }
                    this.closeMethodPicker();
                });
            });
        }
        document.getElementById('method-picker-close')?.addEventListener('click', () => this.closeMethodPicker());

        // --- Next Up Cards --- PHASE 5: Add touchstart for iOS
        document.getElementById('next-up-cards')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-method-btn');
            if (btn) { this.commitSelection(btn.dataset.invoice, btn.dataset.method); this.updateRowMethodButton(btn.dataset.invoice); }
        });

        document.getElementById('next-up-cards')?.addEventListener('touchstart', (e) => {
            const btn = e.target.closest('.quick-method-btn');
            if (btn) { 
                e.preventDefault(); // Prevent double-firing
                this.commitSelection(btn.dataset.invoice, btn.dataset.method); 
                this.updateRowMethodButton(btn.dataset.invoice); 
            }
        }, { passive: false });

        // --- Back Top Button ---
        document.getElementById('btn-back-top')?.addEventListener('click', () => {
            if (window.activeJobId) window.JobsEngine?.backToJobsScreen?.() || this.switchToSetupMode();
            else this.switchToSetupMode();
        });

        // --- Add House UI ---
        this._initAddHouseUI();

        // --- 🌙 Dark Mode Toggle (FIXED with localStorage) ---
        const themeToggleBtn = document.getElementById('btn-theme-toggle');
        if (themeToggleBtn) {
            // Remove any existing listeners to avoid duplicates
            const newBtn = themeToggleBtn.cloneNode(true);
            themeToggleBtn.parentNode.replaceChild(newBtn, themeToggleBtn);
            newBtn.addEventListener('click', () => this._toggleTheme());
        }

        // --- Import Trigger ---
        const importTrigger = document.getElementById('btn-import-trigger');
        const realInput = document.getElementById('excel-file-input');
        if (importTrigger && realInput) {
            importTrigger.addEventListener('click', () => realInput.click());
        }

        // --- Digital Bill Import Trigger ---
        const digitalTrigger = document.getElementById('btn-digitalbill-import-trigger');
        const realDigitalInput = document.getElementById('digitalbill-file-input');
        if (digitalTrigger && realDigitalInput) {
            digitalTrigger.addEventListener('click', () => realDigitalInput.click());
        }

        // --- Backup/Restore Triggers ---
        const exportJsonBtn = document.getElementById('btn-export-json');
        const importJsonBtn = document.getElementById('btn-import-json');
        const restoreFileInput = document.getElementById('restore-file-input');
        if (importJsonBtn && restoreFileInput) {
            importJsonBtn.addEventListener('click', () => restoreFileInput.click());
        }

        // --- Regular Fields - Save on change ---
        document.addEventListener('change', function(e) {
            const target = e.target;
            if (target.classList.contains('regular-receiver-input') ||
                target.classList.contains('regular-signature-input')) {
                
                const invoice = target.dataset.invoice;
                const field = target.classList.contains('regular-receiver-input') ? 'regularReceiverName' : 'regularSignature';
                const value = target.value;
                
                let row = null;
                if (window.isRegularJob) {
                    row = window.currentExportData?.find(r => r.invoice === invoice);
                } else {
                    row = window.Utils.findByInvoice(invoice);
                }
                
                if (row) {
                    row[field] = value;
                    if (window.isRegularJob && window.activeJobId) {
                        const job = window.distributionJobs?.find(j => j.id === window.activeJobId);
                        if (job && job.regularData) {
                            const idx = job.regularData.findIndex(r => r.invoice === invoice);
                            if (idx !== -1) {
                                job.regularData[idx][field] = value;
                                window.JobsEngine?.saveJobs?.();
                            }
                        }
                    }
                    // PHASE 1: Direct writes removed, use central persist
                    window.StorageEngine.persistAll();
                }
            }
        });

        console.log('✅ UI.init() completed');
    },

    // ============================================================
    // 2. ADD HOUSE UI (Original - Unchanged)
    // ============================================================
    _initAddHouseUI: function() {
        // Add House button & modal logic - unchanged from original
        // This function is preserved exactly as it was.
        const container = document.getElementById('area-field');
        if (!container) return;

        // Check if already injected
        if (document.getElementById('btn-add-house')) return;

        const addBtn = document.createElement('button');
        addBtn.id = 'btn-add-house';
        addBtn.className = 'btn btn-success';
        addBtn.style.marginTop = '10px';
        addBtn.style.width = '100%';
        addBtn.innerHTML = '➕ បន្ថែមផ្ទះថ្មី';
        container.appendChild(addBtn);

        addBtn.addEventListener('click', () => this.openAddHouseModal());

        // Create modal if not exists
        if (!document.getElementById('add-house-modal')) {
            const modalHtml = `
                <div class="method-picker-overlay" id="add-house-modal" style="display:none; z-index: 9999;">
                    <div class="method-picker-sheet" style="max-width: 500px; padding-bottom: 30px;">
                        <div class="method-picker-handle"></div>
                        <div class="method-picker-header">
                            <span id="add-house-title">➕ បន្ថែមផ្ទះថ្មី</span>
                            <button type="button" class="method-picker-close" id="add-house-close">✕</button>
                        </div>
                        <div id="add-house-step1">
                            <p style="margin-bottom:12px; color:var(--text-secondary); font-size:14px;">បញ្ចូលលេខ IN ដែលមានស្រាប់ ដើម្បីស្វែងរកទិន្នន័យពី Master Data</p>
                            <input type="text" id="add-house-search-input" placeholder="លេខ IN..." style="width:100%; padding:12px; border:1px solid var(--border); border-radius:8px; font-size:16px; margin-bottom:12px;">
                            <div style="display:flex; gap:10px;">
                                <button type="button" id="add-house-search-btn" class="btn btn-primary" style="flex:1;">🔍 ស្វែងរក</button>
                                <button type="button" id="add-house-skip-btn" class="btn btn-slate" style="flex:1;">⏭️ រំលង</button>
                            </div>
                            <div id="add-house-search-status" style="margin-top:8px; font-size:13px; min-height:20px;"></div>
                        </div>
                        <div id="add-house-step2" style="display:none;">
                            <p style="margin-bottom:12px; color:var(--text-secondary); font-size:14px;">បំពេញព័ត៌មានផ្ទះថ្មី</p>
                            <div style="margin-bottom:8px;">
                                <label style="font-weight:700; font-size:13px;">លេខ IN *</label>
                                <input type="text" id="add-house-invoice" placeholder="លេខ IN..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:14px;">
                            </div>
                            <div style="margin-bottom:8px;">
                                <label style="font-weight:700; font-size:13px;">ឈ្មោះអតិថិជន *</label>
                                <input type="text" id="add-house-name" placeholder="ឈ្មោះ..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:14px;">
                            </div>
                            <div style="display:flex; gap:10px; margin-bottom:8px;">
                                <div style="flex:1;">
                                    <label style="font-weight:700; font-size:13px;">ប្រអប់</label>
                                    <input type="text" id="add-house-box" placeholder="ប្រអប់..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:14px;">
                                </div>
                                <div style="flex:1;">
                                    <label style="font-weight:700; font-size:13px;">កាប៊ីន</label>
                                    <input type="text" id="add-house-cabin" placeholder="កាប៊ីន..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:14px;">
                                </div>
                            </div>
                            <div style="margin-bottom:8px;">
                                <label style="font-weight:700; font-size:13px;">អាសយដ្ឋាន</label>
                                <input type="text" id="add-house-address" placeholder="អាសយដ្ឋាន..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:14px;">
                            </div>
                            <div style="margin-bottom:12px;">
                                <label style="font-weight:700; font-size:13px;">បញ្ចូលបន្ទាប់ពីលេខ IN *</label>
                                <input type="text" id="add-house-after-in" placeholder="លេខ IN ដែលចង់បញ្ចូលបន្ទាប់..." style="width:100%; padding:10px; border:1px solid var(--border); border-radius:6px; font-size:14px;">
                            </div>
                            <div style="display:flex; gap:10px;">
                                <button type="button" id="add-house-back-btn" class="btn btn-slate" style="flex:1;">⬅️ ត្រឡប់</button>
                                <button type="button" id="add-house-save-btn" class="btn btn-success" style="flex:1;">💾 រក្សាទុក</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Bind events
            document.getElementById('add-house-close').addEventListener('click', () => this.closeAddHouseModal());
            document.getElementById('add-house-skip-btn').addEventListener('click', () => {
                document.getElementById('add-house-step1').style.display = 'none';
                document.getElementById('add-house-step2').style.display = 'block';
                document.getElementById('add-house-title').innerText = '➕ បន្ថែមផ្ទះថ្មី (ដោយដៃ)';
            });
            document.getElementById('add-house-search-btn').addEventListener('click', () => this._addHouseStep1());
            document.getElementById('add-house-search-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this._addHouseStep1();
            });
            document.getElementById('add-house-back-btn').addEventListener('click', () => {
                document.getElementById('add-house-step1').style.display = 'block';
                document.getElementById('add-house-step2').style.display = 'none';
                document.getElementById('add-house-title').innerText = '➕ បន្ថែមផ្ទះថ្មី';
            });
            document.getElementById('add-house-save-btn').addEventListener('click', () => this._addHouseConfirm());

            // Close modal on overlay click
            document.getElementById('add-house-modal').addEventListener('click', (e) => {
                if (e.target.id === 'add-house-modal') this.closeAddHouseModal();
            });
        }
    },

    openAddHouseModal: function() {
        const modal = document.getElementById('add-house-modal');
        if (!modal) return;
        document.getElementById('add-house-step1').style.display = 'block';
        document.getElementById('add-house-step2').style.display = 'none';
        document.getElementById('add-house-title').innerText = '➕ បន្ថែមផ្ទះថ្មី';
        document.getElementById('add-house-search-input').value = '';
        document.getElementById('add-house-search-status').textContent = '';
        document.getElementById('add-house-invoice').value = '';
        document.getElementById('add-house-name').value = '';
        document.getElementById('add-house-box').value = '';
        document.getElementById('add-house-cabin').value = '';
        document.getElementById('add-house-address').value = '';
        document.getElementById('add-house-after-in').value = '';
        this._addHouseState = { refIndex: -1, refInvoice: null, newInvoice: null, foundRecord: null };
        modal.style.display = 'flex';
        modal.classList.add('active');
        setTimeout(() => document.getElementById('add-house-search-input').focus(), 300);
    },

    closeAddHouseModal: function() {
        const modal = document.getElementById('add-house-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    },

    _addHouseStep1: function() {
        const searchIn = document.getElementById('add-house-search-input').value.trim();
        const statusEl = document.getElementById('add-house-search-status');
        if (!searchIn) {
            statusEl.style.color = '#ef4444';
            statusEl.textContent = '⚠️ សូមបញ្ចូលលេខ IN!';
            return;
        }

        const found = window.Utils.findByInvoice(searchIn);
        if (found) {
            this._addHouseState.foundRecord = found;
            statusEl.style.color = '#16a34a';
            statusEl.textContent = `✅ រកឃើញ៖ ${found.name} (${found.box})`;
            document.getElementById('add-house-invoice').value = '';
            document.getElementById('add-house-name').value = found.name || '';
            document.getElementById('add-house-box').value = found.box || '';
            document.getElementById('add-house-cabin').value = found.cabin || '';
            document.getElementById('add-house-address').value = found.address || '';
            document.getElementById('add-house-after-in').value = '';
            document.getElementById('add-house-step1').style.display = 'none';
            document.getElementById('add-house-step2').style.display = 'block';
            document.getElementById('add-house-title').innerText = '➕ បន្ថែមផ្ទះថ្មី (ចម្លងពី IN ចាស់)';
            setTimeout(() => document.getElementById('add-house-invoice').focus(), 300);
        } else {
            statusEl.style.color = '#f59e0b';
            statusEl.textContent = 'ℹ️ រកមិនឃើញ IN នេះ! សូមបំពេញដោយដៃ។';
            document.getElementById('add-house-step1').style.display = 'none';
            document.getElementById('add-house-step2').style.display = 'block';
            document.getElementById('add-house-title').innerText = '➕ បន្ថែមផ្ទះថ្មី (ដោយដៃ)';
            setTimeout(() => document.getElementById('add-house-invoice').focus(), 300);
        }
    },

    _addHouseConfirm: function() {
        const invoice = document.getElementById('add-house-invoice').value.trim();
        const name = document.getElementById('add-house-name').value.trim();
        const box = document.getElementById('add-house-box').value.trim();
        const cabin = document.getElementById('add-house-cabin').value.trim();
        const address = document.getElementById('add-house-address').value.trim();
        const afterIn = document.getElementById('add-house-after-in').value.trim();

        if (!invoice || !name || !afterIn) {
            window.Utils.showAlert('⚠️ សូមបំពេញលេខ IN, ឈ្មោះ និងទីតាំងបញ្ចូល!');
            return;
        }

        // Check duplicate in current export
        if (window.currentExportData.some(r => r.invoice === invoice)) {
            window.Utils.showAlert(`⚠️ លេខ IN "${invoice}" មានរួចហើយក្នុងផ្លូវនេះ!`);
            return;
        }

        // Check duplicate in master data
        if (window.Utils.findByInvoice(invoice)) {
            window.Utils.showAlert(`⚠️ លេខ IN "${invoice}" មានរួចហើយក្នុង Master Data!`);
            return;
        }

        const refIndex = window.currentExportData.findIndex(r => r.invoice === afterIn);
        if (refIndex === -1) {
            window.Utils.showAlert(`⚠️ រកមិនឃើញលេខ IN "${afterIn}" ក្នុងផ្លូវបច្ចុប្បន្ន!`);
            return;
        }

        // Create new house
        const newHouse = {
            id: (window.masterData ? window.masterData.length : 0) + 1,
            invoice: invoice,
            name: name || 'មិនមានឈ្មោះ',
            box: box || 'N/A',
            cabin: cabin || window.currentCabinGlobal || 'N/A',
            address: address || 'មិនមានអាសយដ្ឋាន',
            status: 'មិនទាន់ចែក',
            method: '',
            deliveredAt: '',
            source: 'manual_insert'
        };

        // Add to master data
        window.masterData.push(newHouse);
        window.Utils.rebuildMasterIndex();

        // Add to current export data
        window.currentExportData.splice(refIndex + 1, 0, newHouse);

        // Add to route sequence
        const routeBox = document.getElementById('route-sequence');
        if (routeBox) {
            const lines = routeBox.value.split('\n').filter(l => l.trim());
            const idx = lines.indexOf(afterIn);
            if (idx !== -1) {
                lines.splice(idx + 1, 0, invoice);
                routeBox.value = lines.join('\n');
            }
        }

        // Persist
        window.StorageEngine.persistAll();
        this.closeAddHouseModal();
        window.Utils.showAlert(`✅ បានបន្ថែមផ្ទះថ្មី (IN ${invoice}) រួចរាល់!`);
        
        // Re-render
        this.renderTable(window.currentExportData);
        this.renderNextUpPanel();
        this.updateProgressBar();
    },

    // ============================================================
    // 3. CLEAR / PROGRESS (Unchanged)
    // ============================================================
    clearAllData: function() {
        window.currentExportData = [];
        if (window.masterDataIndex instanceof Map) { window.masterDataIndex.clear(); window.masterDataIndex = null; }
        const tbody = document.getElementById('table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-state">📭 គ្មានទិន្នន័យ</td></tr>`;
        this._teardownVirtualRender();
        document.getElementById('next-up-cards').innerHTML = '';
        this._cardQueue = []; this._queueCursor = 0; this._stats = null; this.nextUpAnchorIndex = 0;
        document.getElementById('next-up-panel').style.display = 'none';
        document.getElementById('lbl-counter-progress').innerText = 'ចែកបាន៖ 0/0';
        
        const mainBar = document.getElementById('main-progress-fill');
        if(mainBar) mainBar.style.width = '0%';
        const mainPercentage = document.getElementById('progress-percentage');
        if(mainPercentage) mainPercentage.innerText = '0%';

        document.getElementById('progress-bar-fill').style.width = '0%';
        document.getElementById('btn-back-top').style.display = 'none';
        window.Utils.updateSystemStatus('🔄 ត្រឡប់ទៅផ្ទាំងដើម', window.masterData?.length || 0);
    },

    clearFieldMode: function() {
        console.log('🧹 Clearing field mode UI (keeping data)...');
        const tbody = document.getElementById('table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-state">📭 គ្មានទិន្នន័យ</td></tr>`;
        document.getElementById('next-up-cards').innerHTML = '';
        this._cardQueue = []; this._queueCursor = 0; this._stats = null; this.nextUpAnchorIndex = 0;
        document.getElementById('next-up-panel').style.display = 'none';
        document.getElementById('lbl-counter-progress').innerText = 'ចែកបាន៖ 0/0';
        document.getElementById('progress-bar-fill').style.width = '0%';
        document.getElementById('btn-back-top').style.display = 'none';
        this._teardownVirtualRender();
        if (window.SortingMode && typeof window.SortingMode.close === 'function') {
            window.SortingMode.close();
        }
        window.Utils.updateSystemStatus('🔄 ត្រឡប់ទៅផ្ទាំងដើម', window.masterData?.length || 0);
    },

    updateProgressBar: function() {
        const bar = document.getElementById('progress-bar-fill');
        const mainBar = document.getElementById('main-progress-fill');
        const mainPercentage = document.getElementById('progress-percentage');
        
        const data = window.currentExportData || [];
        if (data.length === 0) {
            if(bar) bar.style.width = '0%';
            if(mainBar) mainBar.style.width = '0%';
            if(mainPercentage) mainPercentage.innerText = '0%';
            return;
        }
        
        const done = data.filter(r => r.status === 'បានចែករួចរាល់' || r.status === 'ផ្អាកប្រើ').length;
        const percentString = `${Math.min(Math.round((done/data.length)*100), 100)}%`;
        
        if(bar) bar.style.width = percentString;
        if(mainBar) mainBar.style.width = percentString;
        if(mainPercentage) mainPercentage.innerText = percentString;
    },

    // ============================================================
    // 4. SWITCH MODES (Unchanged)
    // ============================================================
    switchToSetupMode: function() {
        if (window.SortingMode && typeof window.SortingMode.close === 'function') {
            window.SortingMode.close();
        }
        this.clearAllData();
        window.isHistoryView = false; window.activeJobId = null;
        document.getElementById('btn-back-top').style.display = 'none';
        document.getElementById('next-up-panel').style.display = 'none';
        document.getElementById('area-setup').style.display = 'block';
        document.getElementById('block-history').style.display = 'flex';
        document.getElementById('block-stats').style.display = 'block';
        document.getElementById('block-actions').style.display = 'flex';
        document.getElementById('area-field').style.display = 'none';
        document.getElementById('lbl-current-cabin').innerText = '📋 ផ្លូវជាក់ស្តែង';
        
        const jobMonthElement = document.getElementById('current-billing-month');
        if (jobMonthElement) {
            jobMonthElement.innerText = this._getSystemFormattedDate();
        }

        window.StorageEngine.loadHistoryList();
        window.StorageEngine.saveSessionCache();
    },

    enterFieldMode: function(skipSelector) {
        if (window.activeJobId) {
            const btn = document.getElementById('btn-back-top');
            if (btn) { btn.style.display = 'flex'; btn.innerHTML = '⬅️ ត្រឡប់ទៅបញ្ជី Jobs'; }
        }
        document.getElementById('next-up-panel').style.display = 'block';
        if (skipSelector) {
            if (!window.currentExportData || window.currentExportData.length === 0) {
                window.Utils.showAlert('⚠️ គ្មានទិន្នន័យផ្លូវចែក!');
                return;
            }
            this._enterFieldModeReal();
        } else {
            this._showModeSelector();
        }
    },

    _enterFieldModeReal: function() {
        window.isHistoryView = false; this.nextUpAnchorIndex = 0; this._searchActive = false;
        document.getElementById('area-setup').style.display = 'none';
        document.getElementById('block-history').style.display = 'none';
        document.getElementById('block-stats').style.display = 'none';
        document.getElementById('block-actions').style.display = 'none';
        document.getElementById('area-field').style.display = 'block';
        document.getElementById('next-up-panel').style.display = 'block';
        
        let cabin = window.currentCabinGlobal;
        if (window.currentExportData.length > 0 && window.currentExportData[0].cabin) cabin = window.currentExportData[0].cabin;
        document.getElementById('lbl-current-cabin').innerText = `📋 ផ្លូវជាក់ស្តែងកាប៊ីន៖ ${cabin}`;
        
        const jobMonthElement = document.getElementById('current-billing-month');
        if (jobMonthElement) {
            jobMonthElement.innerText = this._getSystemFormattedDate();
        }

        const sBox = document.getElementById('search-invoice');
        if(sBox) sBox.value = '';
        document.getElementById('chk-hide-done').checked = false;
        this.renderTable(window.currentExportData);
        window.Utils.updateProgressCounter();
        this.renderNextUpPanel();
        this.updateProgressBar();
        window.StorageEngine.saveSessionCache();
    },

    _showModeSelector: function() { this._injectModeSelectorUI(); document.getElementById('mode-selector-overlay')?.classList.add('active'); },
    _closeModeSelector: function() { document.getElementById('mode-selector-overlay')?.classList.remove('active'); },
    _injectModeSelectorUI: function() {
        if (document.getElementById('mode-selector-overlay')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="mode-selector-overlay" class="method-picker-overlay">
                <div class="method-picker-sheet">
                    <div class="method-picker-handle"></div>
                    <div class="method-picker-header"><span>📋 ជ្រើសរើសរបៀប</span><button type="button" id="mode-selector-close" class="method-picker-close">✕</button></div>
                    <p class="method-picker-name">តើអ្នកចង់បន្តការចែកជុំមុន ឬចាប់ផ្តើមជុំថ្មី?</p>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button type="button" id="mode-selector-continue" class="btn btn-primary" style="width:100%;">🔄 បន្តការចែកជុំមុន</button>
                        <button type="button" id="mode-selector-reset" class="btn btn-warning" style="width:100%;">🆕 ចាប់ផ្តើមជុំថ្មី (Reset)</button>
                        <button type="button" id="mode-selector-cancel" class="btn btn-slate" style="width:100%;">បោះបង់</button>
                    </div>
                </div>
            </div>
        `);
        document.getElementById('mode-selector-close').addEventListener('click', () => this._closeModeSelector());
        document.getElementById('mode-selector-cancel').addEventListener('click', () => this._closeModeSelector());
        document.getElementById('mode-selector-continue').addEventListener('click', () => {
            this._closeModeSelector();
            this._enterFieldModeReal();
        });
        document.getElementById('mode-selector-reset').addEventListener('click', () => {
            if (confirm('🔄 តើអ្នកចង់កំណត់ស្ថានភាពទាំងអស់ក្នុងផ្លូវនេះទៅ "មិនទាន់ចែក" វិញ?')) {
                (window.currentExportData || []).forEach(r => {
                    r.status = 'មិនទាន់ចែក';
                    r.method = '';
                    delete r.deliveredAt;
                });
                window.StorageEngine.saveMasterCache();
                this._closeModeSelector();
                this._enterFieldModeReal();
                window.Utils.showAlert('✅ បានកំណត់ស្ថានភាពឡើងវិញទាំងអស់!');
            }
        });
    },

    // ============================================================
    // 5. METHOD PICKER (Unchanged)
    // ============================================================
    methodLabel: function(method) { return window.Utils.methodLabel(method); },

    openMethodPicker: function(invoice, currentMethod) {
        const modal = document.getElementById('method-picker-modal');
        if (!modal) return;
        
        let rec = null;
        if (window.isRegularJob) {
            rec = window.currentExportData?.find(r => r.invoice === invoice);
        } else {
            rec = window.Utils.findByInvoice(invoice);
        }
        
        modal.dataset.activeInvoice = invoice;
        document.getElementById('method-picker-name').innerText = rec ? `${rec.name} • ប្រអប់ ${rec.box} • IN ${rec.invoice}` : `IN ${invoice}`;
        modal.querySelectorAll('.method-option').forEach(btn => {
            btn.classList.toggle('active', window.Utils.hasMethod(currentMethod, btn.dataset.method));
        });
        modal.classList.add('active');
    },

    closeMethodPicker: function() { document.getElementById('method-picker-modal')?.classList.remove('active'); },

    updateRowMethodButton: function(invoice) {
        let rec = null;
        if (window.isRegularJob) {
            rec = window.currentExportData?.find(r => r.invoice === invoice);
        } else {
            rec = window.Utils.findByInvoice(invoice);
        }
        
        const method = rec ? rec.method : '';
        const btn = document.getElementById(`method-btn-${invoice}`);
        if (btn) {
            const primary = window.Utils.primaryMethod(method);
            const cls = primary === 'suspended' ? 'method-suspended' : `method-${primary}`;
            btn.className = `method-select-btn method-selected ${cls}`;
            btn.innerText = `✓ ${window.Utils.methodLabel(method)}`;
            btn.dataset.currentMethod = method;
        }
        const row = document.getElementById(`row_${invoice}`);
        if (row) row.dataset.currentMethod = method;
    },

    // ============================================================
    // 6. COMMIT SELECTION (PHASE 1: Centralized write throttling)
    // ============================================================
    commitSelection: function(invoice, method) {
        if (window.isHistoryView) return;
        
        let rec = null;
        if (window.isRegularJob) {
            rec = window.currentExportData?.find(r => r.invoice === invoice);
        } else {
            rec = window.Utils.findByInvoice(invoice);
        }
        
        if (!rec) return;
        const wasDone = rec.status === "បានចែករួចរាល់";
        
        if (method === 'suspended') {
            rec.status = "ផ្អាកប្រើ";
        } else {
            rec.status = "បានចែករួចរាល់";
        }
        rec.method = window.Utils.mergeMethod(rec.method, method);
        rec.deliveredAt = window.Utils.formatDateTime(new Date());
        
        if (window.isRegularJob) {
            const now = new Date();
            rec.regularReceivedTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        }
        
        // PHASE 1: Replaced multiple separate writes with a single debounced persist call.
        window.StorageEngine.persistAll();

        if (!wasDone && this._stats) {
            this._stats.delivered++;
            this._stats.remaining--;
            this._stats.pending--;
        }
        if (!wasDone) this._onCardCompleted(invoice);

        const badge = document.getElementById(`badge_${invoice}`);
        if (badge) {
            badge.className = rec.status === "ផ្អាកប្រើ" ? "status-badge status-suspended" : "status-badge status-done";
            badge.innerText = rec.status === "ផ្អាកប្រើ" ? "⏸️ ផ្អាកប្រើ" : "បានចែករួចរាល់";
        }
        const dateEl = document.getElementById(`date_${invoice}`);
        if (dateEl) dateEl.innerText = rec.deliveredAt;
        
        window.Utils.updateProgressCounter();
        this.updateProgressBar();
        this.updateRowMethodButton(invoice);

        if (document.getElementById('chk-hide-done')?.checked) {
            setTimeout(() => this.renderTable(window.currentExportData), 300);
        }
    },

    // ============================================================
    // 7. RENDER NEXT UP (Unchanged except _cardHtml)
    // ============================================================
    renderNextUpPanel: function() {
        this._cardQueue = [];
        this._queueCursor = this.nextUpAnchorIndex;
        this._computeStatsOnce();
        this._fillQueue();
        this._renderCardQueueFull();
    },

    _computeStatsOnce: function() {
        const data = window.currentExportData || [];
        let delivered = 0, digital = 0;
        for (const r of data) {
            if (r.status === 'បានចែករួចរាល់' || r.status === 'ផ្អាកប្រើ') delivered++;
            if (window.Utils.hasMethod(r.method, 'digital')) digital++;
        }
        this._stats = { total: data.length, delivered, remaining: data.length - delivered, digital, pending: data.length - delivered };
        
        const totalEl = document.getElementById('qstat-total');
        const deliveredEl = document.getElementById('qstat-delivered');
        const remainingEl = document.getElementById('qstat-remaining');
        const digitalEl = document.getElementById('qstat-digital');
        const pendingEl = document.getElementById('qstat-pending');
        if (totalEl) totalEl.textContent = this._stats.total;
        if (deliveredEl) deliveredEl.textContent = this._stats.delivered;
        if (remainingEl) remainingEl.textContent = this._stats.remaining;
        if (digitalEl) digitalEl.textContent = this._stats.digital;
        if (pendingEl) pendingEl.textContent = this._stats.pending;
    },

    _fillQueue: function() {
        const data = window.currentExportData || [];
        const n = data.length; if (n === 0) return;
        const inQueue = new Set(this._cardQueue.map(r => r.invoice));
        let scanned = 0, idx = this._queueCursor;
        while (this._cardQueue.length < this.CARD_QUEUE_SIZE && scanned < n) {
            const row = data[idx % n];
            if (row.status !== 'បានចែករួចរាល់' && row.status !== 'ផ្អាកប្រើ' && !inQueue.has(row.invoice)) {
                this._cardQueue.push(row);
                inQueue.add(row.invoice);
            }
            idx++; scanned++;
        }
        this._queueCursor = idx % n;
    },

    _rebuildQueueFromAnchor: function() {
        this._cardQueue = []; this._queueCursor = this.nextUpAnchorIndex;
        this._fillQueue(); this._renderCardQueueFull();
    },

    // PHASE 1 + UI: Added address to card
    _cardHtml: function(row) {
        const esc = window.Utils.escapeHtml; 
        const invId = esc(row.invoice);
        return `
            <div class="next-up-card" data-invoice="${invId}">
                <div class="next-up-card-info">
                    <strong>${esc(row.name)}</strong>
                    <span class="next-up-card-meta">ប្រអប់ ${esc(row.box)} • IN ${invId}</span>
                    <div class="next-up-card-address">📍 ${esc(row.address)}</div>
                </div>
                <div class="next-up-card-actions">
                    <button type="button" class="quick-method-btn quick-digital" data-invoice="${invId}" data-method="digital">📱</button>
                    <button type="button" class="quick-method-btn quick-box" data-invoice="${invId}" data-method="box">📦</button>
                    <button type="button" class="quick-method-btn quick-door" data-invoice="${invId}" data-method="door">🚪</button>
                    <button type="button" class="quick-method-btn quick-owner" data-invoice="${invId}" data-method="owner">🤝</button>
                    <button type="button" class="quick-method-btn quick-neighbor" data-invoice="${invId}" data-method="neighbor">👥</button>
                    <button type="button" class="quick-method-btn quick-suspended" data-invoice="${invId}" data-method="suspended">⏸️</button>
                </div>
            </div>`;
    },

    _renderCardQueueFull: function() {
        const panel = document.getElementById('next-up-panel'); const container = document.getElementById('next-up-cards');
        if (!panel || !container) return; if (window.isHistoryView) { panel.style.display = 'none'; return; }
        if (this._cardQueue.length === 0) { container.innerHTML = `<div class="next-up-empty">🎉 ចែកចប់ទាំងអស់ហើយ!</div>`; return; }
        container.innerHTML = this._cardQueue.map(r => this._cardHtml(r)).join('');
    },

    _onCardCompleted: function(invoice) {
        const idx = this._cardQueue.findIndex(r => r.invoice === invoice); if (idx === -1) return;
        this._cardQueue.splice(idx, 1); this._fillQueue(); this._renderCardQueueFull();
    },

    // ============================================================
    // 8. TABLE RENDER (PHASE 4: Virtual Scrolling)
    // ============================================================
    _buildRowHtml: function(row, idx) {
        const esc = window.Utils.escapeHtml; const invId = esc(row.invoice);
        const isDone = row.status === 'បានចែករួចរាល់'; const isSuspended = row.status === 'ផ្អាកប្រើ';
        let badgeClass = 'status-badge status-pending'; let badgeText = esc(row.status);
        if (isDone) { badgeClass = 'status-badge status-done'; badgeText = 'បានចែក'; }
        else if (isSuspended) { badgeClass = 'status-badge status-suspended'; badgeText = '⏸️ ផ្អាកប្រើ'; }
        
        const searchBlob = esc(`${row.invoice} ${row.name} ${row.box} ${row.address} ${row.cabin}`.toLowerCase());
        let boxDisplay = esc(row.box);
        if (row.door && row.boxNumber) boxDisplay = `${esc(row.door)}-${esc(row.boxNumber)}`;

        const isRegular = window.isRegularJob || false;
        const regularFields = isRegular ? `
            <td style="min-width:100px;"><span class="regular-time-display" data-invoice="${invId}">${esc(row.regularReceivedTime || '')}</span></td>
            <td style="min-width:160px;"><input type="text" class="regular-receiver-input" data-invoice="${invId}" value="${esc(row.regularReceiverName || '')}" placeholder="ឈ្មោះអ្នកទទួល / ID..." style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:4px; font-size:13px; background:var(--bg-input); color:var(--text); font-family:inherit;"></td>
            <td style="min-width:140px;"><input type="text" class="regular-signature-input" data-invoice="${invId}" value="${esc(row.regularSignature || '')}" placeholder="ហត្ថលេខា / ID..." style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:4px; font-size:13px; background:var(--bg-input); color:var(--text); font-family:inherit;"></td>
        ` : '';

        if (isRegular) {
            return `<tr id="row_${invId}" class="clickable-row" data-invoice="${invId}" data-current-method="${row.method||''}" data-search="${searchBlob}">
                <td class="col-sticky col-sticky-num">${idx}</td>
                <td style="font-family:monospace;font-weight:bold;">${invId}</td>
                <td class="col-sticky col-sticky-name" style="text-align:left;"><strong>${esc(row.name)}</strong></td>
                <td style="color:#ea580c;font-weight:bold;" title="ប.ត: ${boxDisplay}">${boxDisplay}</td>
                <td style="text-align:left;color:var(--text-secondary);font-size:12px;">${esc(row.address)}</td>
                <td><button type="button" class="method-select-btn ${row.method ? 'method-selected method-' + window.Utils.primaryMethod(row.method) : ''}" id="method-btn-${invId}" data-invoice="${invId}" data-current-method="${row.method||''}">${row.method ? '✓ ' + this.methodLabel(row.method) : '👆 ជ្រើសរើស'}</button></td>
                ${regularFields}
                <td class="col-sticky col-sticky-status"><div class="status-cell"><span id="badge_${invId}" class="${badgeClass}">${badgeText}</span><span id="date_${invId}" class="status-date">${row.deliveredAt ? esc(row.deliveredAt) : ''}</span></div></td>
            </tr>`;
        }

        return `<tr id="row_${invId}" class="clickable-row" data-invoice="${invId}" data-current-method="${row.method||''}" data-search="${searchBlob}">
            <td class="col-sticky col-sticky-num">${idx}</td>
            <td style="color:#2563eb;font-weight:bold;">${esc(row.cabin)}</td>
            <td style="color:#ea580c;font-weight:bold;" title="ទ្វារ: ${esc(row.door||'N/A')} | លេខប្រអប់: ${esc(row.boxNumber||'N/A')}">${boxDisplay}</td>
            <td style="font-family:monospace;font-weight:bold;">${invId}</td>
            <td class="col-sticky col-sticky-name" style="text-align:left;"><strong>${esc(row.name)}</strong></td>
            <td style="text-align:left;color:var(--text-secondary);font-size:12px;">${esc(row.address)}</td>
            <td><button type="button" class="method-select-btn ${row.method ? 'method-selected method-' + window.Utils.primaryMethod(row.method) : ''}" id="method-btn-${invId}" data-invoice="${invId}" data-current-method="${row.method||''}">${row.method ? '✓ ' + this.methodLabel(row.method) : '👆 ជ្រើសរើស'}</button></td>
            <td class="col-sticky col-sticky-status"><div class="status-cell"><span id="badge_${invId}" class="${badgeClass}">${badgeText}</span><span id="date_${invId}" class="status-date">${row.deliveredAt ? esc(row.deliveredAt) : ''}</span></div></td>
        </tr>`;
    },

    renderTable: function(data) {
        const tbody = document.getElementById('table-body'); const thead = document.getElementById('table-thead');
        if (!tbody || !thead) return;
        
        const isRegular = window.isRegularJob || false;
        let theadHTML = `<tr><th class="col-sticky col-sticky-num">ល.រ</th>`;
        if (isRegular) {
            theadHTML += `
                <th>លេខ IN</th>
                <th class="col-sticky col-sticky-name" style="text-align:left;">ឈ្មោះ</th>
                <th>ប.ត</th>
                <th style="text-align:left; min-width:200px;">អាសយដ្ឋាន</th>
                <th>វិធីចែក</th>
                <th style="min-width:100px;">ម៉ោងទទួល</th>
                <th style="min-width:160px;">ឈ្មោះអ្នកទទួល / ID</th>
                <th style="min-width:140px;">ហត្ថលេខា / ID</th>
                <th class="col-sticky col-sticky-status">ស្ថានភាព</th>
            `;
        } else {
            theadHTML += `
                <th>កាប៊ីន</th>
                <th>ប្រអប់</th>
                <th>លេខ IN</th>
                <th class="col-sticky col-sticky-name" style="text-align:left;">ឈ្មោះ</th>
                <th style="text-align:left; min-width:200px;">អាសយដ្ឋាន</th>
                <th>វិធីចែក</th>
                <th class="col-sticky col-sticky-status">ស្ថានភាព</th>
            `;
        }
        theadHTML += `</tr>`;
        thead.innerHTML = theadHTML;

        if (!data || data.length === 0) { this._teardownVirtualRender(); tbody.innerHTML = `<tr><td colspan="${isRegular ? 10 : 8}" class="empty-state">📭 គ្មានទិន្នន័យ</td></tr>`; return; }
        const hideDone = document.getElementById('chk-hide-done')?.checked || false;
        const isHistory = window.isHistoryView === true;
        const filtered = data.filter(r => {
            if (hideDone && (r.status === 'បានចែករួចរាល់' || r.status === 'ផ្អាកប្រើ')) return false;
            if (isHistory && r.status !== 'បានចែករួចរាល់' && r.status !== 'ផ្អាកប្រើ') return false;
            return true;
        });
        if (filtered.length === 0) { this._teardownVirtualRender(); tbody.innerHTML = `<tr><td colspan="${isRegular ? 10 : 8}" class="empty-state" style="color:#16a34a;">🎉 គ្មានទិន្នន័យបង្ហាញ</td></tr>`; return; }
        // PHASE 4: Use virtual scrolling if many rows and not in search
        if (filtered.length > this.VIRTUALIZE_THRESHOLD && !this._searchActive) {
            this._setupVirtualRender(filtered);
        } else {
            this._teardownVirtualRender();
            tbody.innerHTML = filtered.map((r, i) => this._buildRowHtml(r, i+1)).join('');
        }
    },

    // PHASE 4: Virtual scrolling implementation
    _teardownVirtualRender: function() {
        if (this._vScrollHandler && this._vContainer) {
            this._vContainer.removeEventListener('scroll', this._vScrollHandler);
            this._vScrollHandler = null;
        }
        this._vContainer = null;
        this._vFilteredRows = null;
    },

    _setupVirtualRender: function(rows) {
        this._vFilteredRows = rows;
        // Find the scrollable container
        const container = document.querySelector('.table-responsive');
        if (!container) {
            // Fallback: render all rows if container not found
            this._teardownVirtualRender();
            const tbody = document.getElementById('table-body');
            if (tbody) {
                tbody.innerHTML = rows.map((r, i) => this._buildRowHtml(r, i+1)).join('');
            }
            return;
        }
        this._vContainer = container;
        // Initial render
        this._renderVirtualWindow(container);
        // Remove old handler
        if (this._vScrollHandler) {
            container.removeEventListener('scroll', this._vScrollHandler);
            this._vScrollHandler = null;
        }
        // Add new handler
        let ticking = false;
        this._vScrollHandler = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                this._renderVirtualWindow(container);
                ticking = false;
            });
        };
        container.addEventListener('scroll', this._vScrollHandler, { passive: true });
    },

    _renderVirtualWindow: function(container) {
        const tbody = document.getElementById('table-body');
        const rows = this._vFilteredRows;
        if (!tbody || !rows || rows.length === 0) return;
        
        const isRegular = window.isRegularJob || false;
        const n = rows.length;
        const rh = this.ROW_HEIGHT_ESTIMATE;
        const colspan = isRegular ? 10 : 8;
        
        // Get container scroll position
        const scrollTop = container ? container.scrollTop : 0;
        const containerHeight = container ? container.clientHeight : window.innerHeight;
        
        // Calculate visible range
        let start = Math.floor(scrollTop / rh) - this.BUFFER_ROWS;
        let end = Math.ceil((scrollTop + containerHeight) / rh) + this.BUFFER_ROWS;
        start = Math.max(0, Math.min(start, n - 1));
        end = Math.max(start, Math.min(end, n - 1));
        
        // Build HTML with spacers
        let html = `<tr class="v-spacer" style="height:${start * rh}px;padding:0;border:0;"><td colspan="${colspan}" style="padding:0;border:0;"></td></tr>`;
        for (let i = start; i <= end; i++) {
            html += this._buildRowHtml(rows[i], i + 1);
        }
        html += `<tr class="v-spacer" style="height:${(n - 1 - end) * rh}px;padding:0;border:0;"><td colspan="${colspan}" style="padding:0;border:0;"></td></tr>`;
        
        tbody.innerHTML = html;
    },

    cleanData: function() {
        if (!window.masterData || window.masterData.length === 0) return;
        const seen = new Set(); window.masterData = window.masterData.filter(r => { if (seen.has(r.invoice)) return false; seen.add(r.invoice); return true; });
        window.Utils.rebuildMasterIndex(); window.StorageEngine.saveMasterCache(); window.Utils.showAlert("✨ សម្អាតទិន្នន័យស្ទួនរួច!");
    },

    clearAllMasterData: function() {
        if (!window.masterData || window.masterData.length === 0) return;
        if (!confirm(`⚠️ លុប ${window.masterData.length} ជួរ?`)) return;
        window.masterData = []; window.currentExportData = []; window.Utils.rebuildMasterIndex();
        window.StorageEngine.clearWorkingCache(); document.getElementById('btn-clean-data').disabled = true;
        window.Utils.updateSystemStatus("រង់ចាំការបញ្ចូលហ្វាល់", 0); window.Utils.showAlert("🗑️ លុបទិន្នន័យទាំងអស់រួច!");
    },

    // ============================================================
    // 9. RESTORE VIEW (Unchanged)
    // ============================================================
    restoreView: function() {
        console.log('🖥️ UI.restoreView() called');
        if (!window.masterData || window.masterData.length === 0) {
            if (window.StorageEngine._cache.masterData && window.StorageEngine._cache.masterData.length) {
                window.masterData = window.StorageEngine._cache.masterData;
                window.Utils?.rebuildMasterIndex();
                console.log(`🔄 Reloaded masterData from cache: ${window.masterData.length} records.`);
            }
        }

        const session = window.StorageEngine.loadSessionCache();
        if (!session) {
            console.log('ℹ️ No session cache, showing setup tab.');
            this.showSetupTab();
            return;
        }
        const activeTab = session.activeTab || 'setup';
        console.log('🔄 Restoring active tab:', activeTab);

        ['area-setup', 'area-jobs', 'area-companies', 'area-regular', 'area-field'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const history = document.getElementById('block-history');
        const stats = document.getElementById('block-stats');
        const actions = document.getElementById('block-actions');
        if (history) history.style.display = 'none';
        if (stats) stats.style.display = 'none';
        if (actions) actions.style.display = 'none';

        switch (activeTab) {
            case 'setup':
                document.getElementById('area-setup').style.display = 'block';
                if (history) history.style.display = 'flex';
                if (stats) stats.style.display = 'block';
                if (actions) actions.style.display = 'flex';
                break;
            case 'jobs':
                document.getElementById('area-jobs').style.display = 'block';
                if (window.JobsEngine && typeof window.JobsEngine.renderJobsList === 'function') {
                    window.JobsEngine.renderJobsList();
                }
                break;
            case 'companies':
                document.getElementById('area-companies').style.display = 'block';
                if (window.CompanyReport && typeof window.CompanyReport.renderCompanies === 'function') {
                    window.CompanyReport.renderCompanies();
                    window.CompanyReport.updateStats();
                }
                break;
            case 'regular':
                document.getElementById('area-regular').style.display = 'block';
                if (window.RegularEngine) {
                    if (!window.RegularEngine._initialized) {
                        window.RegularEngine.init();
                    } else {
                        window.RegularEngine.renderTable();
                        window.RegularEngine.updateStats();
                        window.RegularEngine.renderNextUpCards();
                    }
                }
                break;
            case 'field':
                document.getElementById('area-field').style.display = 'block';
                const nextUpPanel = document.getElementById('next-up-panel');
                if (nextUpPanel) nextUpPanel.style.display = 'block';
                if (!window.currentExportData || window.currentExportData.length === 0) {
                    if (session.currentExportData && session.currentExportData.length > 0) {
                        window.currentExportData = session.currentExportData.map(
                            (r) => window.Utils?.findByInvoice(r.invoice) || r
                        );
                        window.currentCabinGlobal = session.currentCabinGlobal;
                        window.isHistoryView = false;
                    }
                }
                if (window.currentExportData && window.currentExportData.length) {
                    this.renderTable(window.currentExportData);
                    window.Utils.updateProgressCounter();
                    this.renderNextUpPanel();
                    this.updateProgressBar();
                    
                    const jobMonthElement = document.getElementById('current-billing-month');
                    if (jobMonthElement) {
                        jobMonthElement.innerText = this._getSystemFormattedDate();
                    }
                } else {
                    const tbody = document.getElementById('table-body');
                    if (tbody) {
                        tbody.innerHTML = `<tr><td colspan="8" class="empty-state">📭 គ្មានទិន្នន័យផ្លូវចែក</td></tr>`;
                    }
                }
                break;
            default:
                this.showSetupTab();
                return;
        }

        document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('tab-active'));
        const tabMap = {
            'setup': 'tab-setup',
            'jobs': 'tab-jobs',
            'companies': 'tab-companies',
            'regular': 'tab-regular'
        };
        if (tabMap[activeTab]) {
            const tab = document.getElementById(tabMap[activeTab]);
            if (tab) tab.classList.add('tab-active');
        }

        if (activeTab === 'field' && window.activeJobId) {
            const backTopBtn = document.getElementById('btn-back-top');
            if (backTopBtn) {
                backTopBtn.style.display = 'flex';
                backTopBtn.innerHTML = '⬅️ ត្រឡប់ទៅបញ្ជី Jobs';
            }
        } else {
            const backTopBtn = document.getElementById('btn-back-top');
            if (backTopBtn) backTopBtn.style.display = 'none';
        }

        console.log('✅ UI.restoreView() completed');
    },

    showSetupTab: function() {
        document.getElementById('area-setup').style.display = 'block';
        document.getElementById('block-history').style.display = 'flex';
        document.getElementById('block-stats').style.display = 'block';
        document.getElementById('block-actions').style.display = 'flex';
        document.getElementById('area-jobs').style.display = 'none';
        document.getElementById('area-companies').style.display = 'none';
        document.getElementById('area-regular').style.display = 'none';
        document.getElementById('area-field').style.display = 'none';
        document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('tab-active'));
        const tab = document.getElementById('tab-setup');
        if (tab) tab.classList.add('tab-active');
    }
};

// ============================================================
// 🚀 INITIALIZE
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🖥️ DOM ready, initializing UI module...');
    window.UI.init();
    window.ExcelEngine.init();
    
    const routeBox = document.getElementById('route-sequence');
    if (routeBox) {
        let timer = null;
        routeBox.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => window.StorageEngine.saveSessionCache(), 500); });
    }
    console.log('✅ UI module loaded & ready');
});
console.log('✅ UI module loaded');