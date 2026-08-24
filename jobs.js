// ==========================================================================
// 📋 Distribution Jobs Module - Instant Open & Performance Optimized
// ==========================================================================

window.JobsEngine = {
    JOBS_KEY: 'EDC_JOBS_V1',
    PAGE_SIZE: 20,
    currentPage: 1,
    _initialized: false,

    init: function() {
        if (this._initialized) return;
        this.loadJobs();
        this.reconcileAllJobs();
        this.wireImport();
        this._injectEditModal();
        this.renderJobsList();
        this._initialized = true;
    },

    reload: function() {
        this.loadJobs();
        this.reconcileAllJobs();
        this.renderJobsList();
    },

    loadJobs: function() {
        try {
            const raw = window.StorageEngine.loadJobs() || [];
            window.distributionJobs = Array.isArray(raw) ? raw : [];
            window.distributionJobs.forEach(job => {
                if (!job.deliveryState) job.deliveryState = {};
                if (!Array.isArray(job.inNumbers)) job.inNumbers = [];
                delete job._cachedProgress;
            });
        } catch (e) {
            console.error('❌ Load Jobs failed:', e);
            window.distributionJobs = [];
        }
    },

    saveJobs: function() {
        (window.distributionJobs || []).forEach(j => delete j._cachedProgress);
        try {
            window.StorageEngine.saveJobs(window.distributionJobs || []);
        } catch (e) {
            console.error('❌ Save Jobs failed:', e);
        }
    },

    reconcileJob: function(job) {
        if (!job || !Array.isArray(job.inNumbers)) return false;
        const norm = window.Utils?.normalizeIN || (v => String(v || '').trim());
        
        if (!window.masterDataIndex || window.masterDataIndex.size === 0) {
            window.Utils.rebuildMasterIndex();
        }
        const masterMap = window.masterDataIndex;

        const historyMap = new Map();
        (window.StorageEngine?._cache?.history || []).forEach(s => {
            (s.records || []).forEach(r => {
                if (window.Utils?.isCompletedStatus(r.status)) historyMap.set(norm(r.invoice), r);
            });
        });

        if (!job.deliveryState) job.deliveryState = {};
        let modified = false;

        for (let i = 0; i < job.inNumbers.length; i++) {
            const inv = job.inNumbers[i];
            const canonicalInv = norm(inv);
            if (!canonicalInv) continue;

            const existing = job.deliveryState[canonicalInv] || job.deliveryState[String(inv)];
            if (existing && existing.completed) {
                job.deliveryState[canonicalInv] = existing;
                if (canonicalInv !== String(inv)) delete job.deliveryState[String(inv)];
                continue;
            }

            const masterRow = masterMap.get(canonicalInv);
            const historyRow = historyMap.get(canonicalInv);
            const target = (masterRow && window.Utils?.isCompletedStatus(masterRow.status)) ? masterRow 
                         : (historyRow && window.Utils?.isCompletedStatus(historyRow.status)) ? historyRow : null;

            if (target) {
                job.deliveryState[canonicalInv] = {
                    status: target.status,
                    deliveredAt: target.deliveredAt || new Date().toISOString(),
                    method: target.method || '',
                    completed: true
                };
                modified = true;
            }
        }

        delete job._cachedProgress;
        return modified;
    },

    reconcileAllJobs: function() {
        if (!window.distributionJobs?.length) return;
        let anyModified = false;
        window.distributionJobs.forEach(job => {
            if (this.reconcileJob(job)) anyModified = true;
        });
        if (anyModified) this.saveJobs();
    },

    recordDelivery: function(invoice, status, method, deliveredAt) {
        const canonicalInv = window.Utils?.normalizeIN(invoice);
        if (!canonicalInv || !window.activeJobId) return false;

        const job = (window.distributionJobs || []).find(j => j.id === window.activeJobId);
        if (!job) return false;

        if (!job.deliveryState) job.deliveryState = {};

        if (window.Utils?.isCompletedStatus(status)) {
            job.deliveryState[canonicalInv] = {
                status: status,
                method: method || '',
                deliveredAt: deliveredAt || new Date().toISOString(),
                completed: true
            };
        } else if (status === 'មិនទាន់ចែក') {
            delete job.deliveryState[canonicalInv];
        }

        delete job._cachedProgress;
        this.saveJobs();
        return true;
    },

    computeJobProgress: function(job) {
        if (job._cachedProgress && job._cachedProgress.timestamp > Date.now() - 3000) {
            return job._cachedProgress;
        }

        const norm = window.Utils?.normalizeIN || (v => String(v || '').trim());
        const invoiceList = Array.isArray(job.inNumbers) ? job.inNumbers : [];
        const total = invoiceList.length;
        const stateMap = job.deliveryState || {};

        if (!window.masterDataIndex || window.masterDataIndex.size === 0) {
            window.Utils.rebuildMasterIndex();
        }
        const masterMap = window.masterDataIndex;

        let done = 0;
        for (let i = 0; i < total; i++) {
            const canonicalInv = norm(invoiceList[i]);
            const state = stateMap[canonicalInv] || stateMap[String(invoiceList[i])];
            const master = masterMap.get(canonicalInv);

            if ((state && state.completed) || (master && window.Utils?.isCompletedStatus(master.status))) {
                done++;
            }
        }

        const statusLabel = (done === 0) ? 'Pending' : (done >= total && total > 0) ? 'Completed' : 'In Progress';
        const statusClass = (done === 0) ? 'job-status-pending' : (done >= total && total > 0) ? 'job-status-done' : 'job-status-progress';

        job._cachedProgress = { matched: done, done, total, statusLabel, statusClass, timestamp: Date.now() };
        return job._cachedProgress;
    },

    wireImport: function() {
        const trigger = document.getElementById('btn-jobs-import-trigger');
        const fileInput = document.getElementById('jobs-file-input');
        if (trigger && fileInput) {
            trigger.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', this.importWorkbook.bind(this));
        }
        document.getElementById('btn-back-to-jobs')?.addEventListener('click', () => this.backToJobsScreen());
    },

    importWorkbook: function(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                if (!window.distributionJobs) window.distributionJobs = [];

                let createdCount = 0;
                const createdAt = new Date().toLocaleDateString('km-KH');

                workbook.SheetNames.forEach(sheetName => {
                    const aoa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
                    const inNumbers = this.extractInNumbersFromSheet(aoa);
                    if (!inNumbers.length) return;

                    const newJob = {
                        id: 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                        worksheetName: sheetName,
                        inNumbers: inNumbers,
                        deliveryState: {},
                        createdDate: createdAt,
                        type: 'distribution'
                    };
                    this.reconcileJob(newJob);
                    window.distributionJobs.push(newJob);
                    createdCount++;
                });

                this.saveJobs();
                this.renderJobsList();
                this._showAlert(`✅ បានបង្កើត ${createdCount} Job ថ្មី`);
            } catch (err) {
                console.error('❌ Import error:', err);
                this._showAlert('❌ ការអានហ្វាល់បរាជ័យ!');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    },

    extractInNumbersFromSheet: function(aoa) {
        let colInvoice = -1, headerRowIndex = -1;
        for (let r = 0; r < Math.min(aoa.length, 25); r++) {
            if (!Array.isArray(aoa[r])) continue;
            const rowStr = aoa[r].map(c => String(c || "").toLowerCase().trim());
            const invIdx = rowStr.findIndex(c => c === "លេខin" || c === "លេខ in" || c === "invoice");
            if (invIdx !== -1) { headerRowIndex = r; colInvoice = invIdx; break; }
        }
        if (colInvoice === -1) { colInvoice = 1; headerRowIndex = 7; }

        const inNumbers = [], seen = new Set();
        for (let i = headerRowIndex + 1; i < aoa.length; i++) {
            const rawVal = String(aoa[i]?.[colInvoice] || "").trim();
            if (!rawVal || rawVal.includes("លេខ") || rawVal === "-") continue;
            const canonical = window.Utils?.normalizeIN(rawVal);
            if (canonical && !seen.has(canonical)) {
                seen.add(canonical);
                inNumbers.push(canonical);
            }
        }
        return inNumbers;
    },

    renderJobsList: function() {
        const container = document.getElementById('jobs-list');
        if (!container) return;

        const jobs = window.distributionJobs || [];
        if (!jobs.length) {
            container.innerHTML = `<div class="empty-state">មិនទាន់មាន Job ណាមួយទេ។ សូម Import ហ្វាល់ខាងលើដើម្បីបង្កើត Job ។</div>`;
            return;
        }

        const totalPages = Math.ceil(jobs.length / this.PAGE_SIZE) || 1;
        this.currentPage = Math.max(1, Math.min(this.currentPage, totalPages));
        const start = (this.currentPage - 1) * this.PAGE_SIZE;
        const pageJobs = jobs.slice(start, start + this.PAGE_SIZE);
        const esc = str => window.Utils?.escapeHtml(str) || String(str || '');

        let html = pageJobs.map(job => {
            const p = this.computeJobProgress(job);
            const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
            return `
                <div class="job-card" data-job-id="${esc(job.id)}">
                    <div class="job-card-top">
                        <strong>${esc(job.worksheetName)}</strong>
                        <span class="job-status-badge ${p.statusClass}">${p.statusLabel}</span>
                    </div>
                    <div class="job-progress-bar"><div class="job-progress-fill" style="width:${pct}%"></div></div>
                    <div class="job-card-meta">
                        <span>${p.done}/${p.total} ផ្ទះ (${pct}%)</span>
                        <span>បង្កើត៖ ${esc(job.createdDate)}</span>
                    </div>
                    <div class="job-card-actions">
                        <button type="button" class="btn btn-primary job-open-btn" data-job-id="${esc(job.id)}">📂 បើក Job</button>
                        <button type="button" class="btn job-edit-btn" data-job-id="${esc(job.id)}" style="background:#f59e0b !important; color:#fff !important; flex:0 0 auto !important; width:44px;" title="កែប្រែ / បន្ថែម / លុប IN">✏️</button>
                        <button type="button" class="btn job-delete-btn" data-job-id="${esc(job.id)}" title="លុប Job នេះ">🗑️</button>
                    </div>
                </div>`;
        }).join('');

        if (totalPages > 1) {
            html += `
                <div class="jobs-pagination">
                    <button class="btn btn-sm page-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''}>⬅️</button>
                    <span>${this.currentPage} / ${totalPages}</span>
                    <button class="btn btn-sm page-btn" data-page="next" ${this.currentPage === totalPages ? 'disabled' : ''}>➡️</button>
                </div>`;
        }

        container.innerHTML = html;
        container.querySelectorAll('.job-open-btn').forEach(b => b.addEventListener('click', () => this.openJob(b.dataset.jobId)));
        container.querySelectorAll('.job-edit-btn').forEach(b => b.addEventListener('click', () => this.openEditModal(b.dataset.jobId)));
        container.querySelectorAll('.job-delete-btn').forEach(b => b.addEventListener('click', () => this.deleteJob(b.dataset.jobId)));
        container.querySelectorAll('.page-btn').forEach(b => b.addEventListener('click', () => {
            this.currentPage += (b.dataset.page === 'prev' ? -1 : 1);
            this.renderJobsList();
        }));
    },

    _injectEditModal: function() {
        if (document.getElementById('edit-job-modal')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div class="method-picker-overlay" id="edit-job-modal" style="z-index:9999;">
                <div class="method-picker-sheet" style="max-width:520px; padding-bottom:24px;">
                    <div class="method-picker-handle"></div>
                    <div class="method-picker-header">
                        <span>✏️ កែប្រែ Job</span>
                        <button type="button" class="method-picker-close" id="edit-job-close">✕</button>
                    </div>
                    <div style="padding-top:8px;">
                        <input type="hidden" id="edit-job-id" />
                        <div style="margin-bottom:12px;">
                            <label style="font-weight:700; font-size:13px; color:var(--text);">ឈ្មោះ Job / Worksheet *</label>
                            <input type="text" id="edit-job-name" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:6px; font-size:14px; background:var(--bg-input); color:var(--text); margin-top:4px;" />
                        </div>
                        <div style="margin-bottom:12px;">
                            <label style="font-weight:700; font-size:13px; color:var(--text);">បញ្ជីលេខ IN (១ ជួរ = ១ លេខ IN)</label>
                            <textarea id="edit-job-in-list" rows="8" style="width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:6px; font-family:monospace; font-size:14px; background:var(--bg-input); color:var(--text); margin-top:4px; resize:vertical;"></textarea>
                            <span id="edit-job-count-info" style="font-size:12px; color:var(--text-muted); display:block; margin-top:4px;">សរុប៖ 0 ផ្ទះ</span>
                        </div>
                        <div style="display:flex; gap:10px; margin-top:16px;">
                            <button type="button" class="btn btn-slate" id="edit-job-cancel" style="flex:1; min-height:44px;">បោះបង់</button>
                            <button type="button" class="btn btn-success" id="edit-job-save" style="flex:1; min-height:44px;">💾 រក្សាទុក</button>
                        </div>
                    </div>
                </div>
            </div>`);

        document.getElementById('edit-job-close')?.addEventListener('click', () => this.closeEditModal());
        document.getElementById('edit-job-cancel')?.addEventListener('click', () => this.closeEditModal());
        document.getElementById('edit-job-save')?.addEventListener('click', () => this.saveEditedJob());
        document.getElementById('edit-job-in-list')?.addEventListener('input', e => {
            const lines = e.target.value.split('\n').map(l => window.Utils?.normalizeIN(l)).filter(Boolean);
            const count = new Set(lines).size;
            const info = document.getElementById('edit-job-count-info');
            if (info) info.textContent = `សរុប៖ ${count} ផ្ទះ`;
        });
    },

    openEditModal: function(jobId) {
        const job = (window.distributionJobs || []).find(j => j.id === jobId);
        if (!job) return;
        document.getElementById('edit-job-id').value = job.id;
        document.getElementById('edit-job-name').value = job.worksheetName || '';
        document.getElementById('edit-job-in-list').value = (job.inNumbers || []).join('\n');
        const info = document.getElementById('edit-job-count-info');
        if (info) info.textContent = `សរុប៖ ${(job.inNumbers || []).length} ផ្ទះ`;
        document.getElementById('edit-job-modal')?.classList.add('active');
    },

    closeEditModal: function() {
        document.getElementById('edit-job-modal')?.classList.remove('active');
    },

    saveEditedJob: function() {
        const jobId = document.getElementById('edit-job-id')?.value;
        const newName = document.getElementById('edit-job-name')?.value.trim();
        const rawText = document.getElementById('edit-job-in-list')?.value.trim();

        if (!newName) return this._showAlert('⚠️ សូមបំពេញឈ្មោះ Job!');
        const job = (window.distributionJobs || []).find(j => j.id === jobId);
        if (!job) return this._showAlert('❌ រកមិនឃើញ Job!');

        const lines = rawText ? rawText.split('\n').map(l => window.Utils?.normalizeIN(l)).filter(Boolean) : [];
        const uniqueINs = Array.from(new Set(lines));
        if (!uniqueINs.length) return this._showAlert('⚠️ បញ្ជីលេខ IN មិនអាចទទេបានទេ!');

        const oldDeliveryState = job.deliveryState || {};
        const newDeliveryState = {};

        // Preserve deliveryState ONLY for unchanged INs
        uniqueINs.forEach(inv => {
            const state = oldDeliveryState[inv];
            if (state && state.completed) newDeliveryState[inv] = { ...state };
        });

        job.worksheetName = newName;
        job.inNumbers = uniqueINs;
        job.deliveryState = newDeliveryState;
        delete job._cachedProgress;

        this.reconcileJob(job);
        this.saveJobs();
        this.renderJobsList();
        this.closeEditModal();
        this._showAlert(`✅ បានកែប្រែ Job "${newName}" (${uniqueINs.length} ផ្ទះ) រួចរាល់!`);
    },

    deleteJob: function(jobId) {
        const job = (window.distributionJobs || []).find(j => j.id === jobId);
        if (!job || !confirm(`⚠️ លុប Job "${job.worksheetName}" ចោល?`)) return;
        window.distributionJobs = (window.distributionJobs || []).filter(j => j.id !== jobId);
        this.saveJobs();
        this.renderJobsList();
        this._showAlert(`🗑️ បានលុប Job "${job.worksheetName}" រួចរាល់!`);
    },

    // ⚡ ដំណើរការបើក Job ភ្លាមៗ (Instant Fast Open)
    openJob: function(jobId) {
        const job = (window.distributionJobs || []).find(j => j.id === jobId);
        if (!job) return this._showAlert('⚠️ រកមិនឃើញ Job នេះទេ!');
        if (!window.masterData?.length) return this._showAlert('⚠️ សូម Import ទិន្នន័យ Master Database ជាមុនសិន!');

        window.activeJobId = jobId;
        window.isRegularJob = false;

        const ok = window.RouteEngine.buildExportData(job.inNumbers, job.deliveryState);
        if (!ok || !window.currentExportData?.length) return this._showAlert('⚠️ គ្មានទិន្នន័យដែលត្រូវគ្នានឹង Job នេះ!');

        const areaJobs = document.getElementById('area-jobs');
        if (areaJobs) areaJobs.style.display = 'none';

        const backTopBtn = document.getElementById('btn-back-top');
        if (backTopBtn) { backTopBtn.style.display = 'flex'; backTopBtn.innerHTML = '⬅️ ត្រឡប់ទៅបញ្ជី Jobs'; }

        const nextUpPanel = document.getElementById('next-up-panel');
        if (nextUpPanel) nextUpPanel.style.display = 'block';

        const lbl = document.getElementById('lbl-current-cabin');
        if (lbl) lbl.innerText = `📂 Job: ${job.worksheetName}`;

        if (window.UI?.enterFieldMode) {
            window.UI.enterFieldMode(false);
        }
    },

    backToJobsScreen: function() {
        window.isRegularJob = false;
        window.activeJobId = null;
        window.isHistoryView = false;

        if (window.UI?.clearAllData) window.UI.clearAllData();

        const nextUpPanel = document.getElementById('next-up-panel');
        if (nextUpPanel) nextUpPanel.style.display = 'none';

        const backTopBtn = document.getElementById('btn-back-top');
        if (backTopBtn) backTopBtn.style.display = 'none';

        this.currentPage = 1;
        this.renderJobsList();

        const areaJobs = document.getElementById('area-jobs');
        if (areaJobs) areaJobs.style.display = 'block';

        document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('tab-active'));
        document.getElementById('tab-jobs')?.classList.add('tab-active');
        window.StorageEngine?.saveSessionCache?.();
    },

    _showAlert: function(message) {
        if (window.Utils?.showAlert) window.Utils.showAlert(message);
        else alert(message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.JobsEngine) {
        window.JobsEngine._initialized = false;
        window.JobsEngine.init();
    }
});
