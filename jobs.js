// ==========================================================================
// 📋 Distribution Jobs Module (កំណែស្ថិរភាព - ដក Sorting Mode ចេញ)
// ==========================================================================

window.JobsEngine = {
    JOBS_KEY: 'EDC_JOBS_V1',
    PAGE_SIZE: 20,
    currentPage: 1,
    _initialized: false,

    init: function() {
        if (this._initialized) return;
        console.log('📋 Jobs Engine initializing...');
        this.loadJobs();
        this.wireImport();
        this.renderJobsList();

        const backToJobsBtn = document.getElementById('btn-back-to-jobs');
        if (backToJobsBtn) backToJobsBtn.style.display = 'none';

        const backTopBtn = document.getElementById('btn-back-top');
        if (backTopBtn) backTopBtn.style.display = 'none';

        this._initialized = true;
        console.log('📋 Jobs Engine initialized successfully');
    },

    // 🆕 Reload method – called by StorageEngine after caches are loaded
    reload: function() {
        console.log('🔄 JobsEngine.reload() called – refreshing jobs from storage.');
        this.loadJobs();
        this.renderJobsList();
    },

    loadJobs: function() {
        try {
            window.distributionJobs = window.StorageEngine.loadJobs() || [];
            if (window.distributionJobs) {
                window.distributionJobs.forEach(job => {
                    delete job._cachedProgress;
                });
            }
            console.log('📋 Loaded jobs:', window.distributionJobs.length);
        } catch (e) {
            console.error('❌ ការទាញយក Jobs បរាជ័យ:', e);
            window.distributionJobs = [];
        }
    },

    saveJobs: function() {
        if (window.distributionJobs) {
            window.distributionJobs.forEach(job => {
                delete job._cachedProgress;
            });
        }
        try {
            window.StorageEngine.saveJobs(window.distributionJobs || []);
        } catch (e) {
            console.error('❌ ការរក្សាទុក Jobs បរាជ័យ:', e);
        }
    },

    wireImport: function() {
        const trigger = document.getElementById('btn-jobs-import-trigger');
        const fileInput = document.getElementById('jobs-file-input');
        if (trigger && fileInput) {
            trigger.addEventListener('click', () => {
                console.log('📥 Import button clicked');
                fileInput.click();
            });
            fileInput.addEventListener('change', this.importWorkbook.bind(this));
        } else {
            console.warn('⚠️ Import buttons not found');
        }

        const backToJobsBtn = document.getElementById('btn-back-to-jobs');
        if (backToJobsBtn) {
            backToJobsBtn.addEventListener('click', () => this.backToJobsScreen());
        }
    },

    importWorkbook: function(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                if (!window.distributionJobs) window.distributionJobs = [];

                let createdCount = 0;
                let skippedEmptyCount = 0;
                const createdAt = new Date().toLocaleDateString('km-KH');

                workbook.SheetNames.forEach((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                    const inNumbers = this.extractInNumbersFromSheet(aoa);

                    if (inNumbers.length === 0) { skippedEmptyCount++; return; }

                    window.distributionJobs.push({
                        id: 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                        worksheetName: sheetName,
                        inNumbers: inNumbers,
                        createdDate: createdAt,
                        type: 'distribution'
                    });
                    createdCount++;
                });

                this.saveJobs();
                this.renderJobsList();

                let msg = `✅ បានបង្កើត ${createdCount} Job ថ្មី`;
                if (skippedEmptyCount > 0) msg += ` (រំលង ${skippedEmptyCount} sheet)`;
                this._showAlert(msg);
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
            if (!aoa[r] || !Array.isArray(aoa[r])) continue;
            const rowStr = aoa[r].map(c => String(c || "").toLowerCase().trim());
            const invIdx = rowStr.findIndex(c => c === "លេខin" || c === "លេខ in" || c === "invoice");
            if (invIdx !== -1) { headerRowIndex = r; colInvoice = invIdx; break; }
        }
        if (colInvoice === -1) { colInvoice = 1; headerRowIndex = 7; }

        const inNumbers = [];
        const seen = new Set();
        for (let i = headerRowIndex + 1; i < aoa.length; i++) {
            const row = aoa[i];
            if (!row || row.length === 0) continue;
            const val = String(row[colInvoice] || "").trim();
            if (val === "" || val.includes("លេខ") || val === "-") continue;
            if (!seen.has(val)) { seen.add(val); inNumbers.push(val); }
        }
        return inNumbers;
    },

    computeJobProgress: function(job) {
        if (job._cachedProgress && job._cachedProgress.timestamp > Date.now() - 5000) {
            return job._cachedProgress;
        }

        let matched = 0, done = 0;
        const data = window.masterData || [];
        const invoiceSet = new Set(job.inNumbers || []);
        
        for (const row of data) {
            if (invoiceSet.has(row.invoice)) {
                matched++;
                if (row.status === 'បានចែករួចរាល់' || row.status === 'ផ្អាកប្រើ') done++;
            }
        }
        
        const total = job.inNumbers ? job.inNumbers.length : 0;
        let statusLabel = 'Pending', statusClass = 'job-status-pending';
        if (done > 0 && done < total) { statusLabel = 'In Progress'; statusClass = 'job-status-progress'; }
        else if (total > 0 && done === total) { statusLabel = 'Completed'; statusClass = 'job-status-done'; }
        
        const result = { matched, done, total, statusLabel, statusClass };
        job._cachedProgress = { ...result, timestamp: Date.now() };
        
        return result;
    },

    renderJobsList: function() {
        const container = document.getElementById('jobs-list');
        if (!container) return;

        try {
            const jobs = window.distributionJobs || [];
            if (jobs.length === 0) {
                container.innerHTML = `<div class="empty-state">មិនទាន់មាន Job ណាមួយទេ។ សូម Import ហ្វាល់ខាងលើដើម្បីបង្កើត Job ។</div>`;
                return;
            }

            const totalPages = Math.ceil(jobs.length / this.PAGE_SIZE);
            if (this.currentPage > totalPages) this.currentPage = totalPages;
            if (this.currentPage < 1) this.currentPage = 1;

            const start = (this.currentPage - 1) * this.PAGE_SIZE;
            const end = Math.min(start + this.PAGE_SIZE, jobs.length);
            const pageJobs = jobs.slice(start, end);

            const esc = (str) => {
                if (!str) return '';
                return String(str).replace(/[&<>"']/g, (c) => ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                }[c]));
            };

            let html = pageJobs.map((job) => {
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
                            <button type="button" class="btn job-delete-btn" data-job-id="${esc(job.id)}">🗑️</button>
                        </div>
                    </div>`;
            }).join('');

            let paginationHtml = '';
            if (totalPages > 1) {
                paginationHtml = `
                    <div class="jobs-pagination">
                        <button class="btn btn-sm page-btn" data-page="prev" ${this.currentPage === 1 ? 'disabled' : ''}>⬅️</button>
                        <span>${this.currentPage} / ${totalPages}</span>
                        <button class="btn btn-sm page-btn" data-page="next" ${this.currentPage === totalPages ? 'disabled' : ''}>➡️</button>
                    </div>
                `;
            }

            container.innerHTML = html + paginationHtml;

            container.querySelectorAll('.job-open-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.openJob(btn.dataset.jobId);
                });
            });

            container.querySelectorAll('.job-delete-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    this.deleteJob(btn.dataset.jobId);
                });
            });

            container.querySelectorAll('.page-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    if (btn.dataset.page === 'prev' && this.currentPage > 1) {
                        this.currentPage--;
                    } else if (btn.dataset.page === 'next' && this.currentPage < totalPages) {
                        this.currentPage++;
                    }
                    this.renderJobsList();
                });
            });

        } catch (err) {
            console.error('❌ Error in renderJobsList:', err);
            container.innerHTML = `<div class="empty-state" style="color: #dc2626;">❌ កំហុស៖ ${err.message}</div>`;
        }
    },

    deleteJob: function(jobId) {
        const job = (window.distributionJobs || []).find((j) => j.id === jobId);
        if (!job) return;
        if (!confirm(`⚠️ លុប Job "${job.worksheetName}" ចោល?`)) return;
        window.distributionJobs = window.distributionJobs.filter((j) => j.id !== jobId);
        this.saveJobs();
        this.renderJobsList();
        this._showAlert(`🗑️ បានលុប Job "${job.worksheetName}" រួចរាល់!`);
    },

    openJob: function(jobId) {
        const job = (window.distributionJobs || []).find((j) => j.id === jobId);
        if (!job) {
            this._showAlert('⚠️ រកមិនឃើញ Job នេះទេ!');
            return;
        }

        if (!window.masterData || window.masterData.length === 0) {
            this._showAlert('⚠️ សូម Import ទិន្នន័យ Master Database ជាមុនសិន!');
            return;
        }

        const ok = window.RouteEngine.buildExportData(job.inNumbers);
        if (!ok) return;

        if (!window.currentExportData || window.currentExportData.length === 0) {
            this._showAlert('⚠️ គ្មានទិន្នន័យដែលត្រូវគ្នានឹង Job នេះ!');
            return;
        }

        window.activeJobId = jobId;
        window.isRegularJob = false;

        const areaJobs = document.getElementById('area-jobs');
        if (areaJobs) areaJobs.style.display = 'none';

        const backTopBtn = document.getElementById('btn-back-top');
        if (backTopBtn) {
            backTopBtn.style.display = 'flex';
            backTopBtn.innerHTML = '⬅️ ត្រឡប់ទៅបញ្ជី Jobs';
        }

        const backToJobsBtn = document.getElementById('btn-back-to-jobs');
        if (backToJobsBtn) backToJobsBtn.style.display = 'none';

        const nextUpPanel = document.getElementById('next-up-panel');
        if (nextUpPanel) nextUpPanel.style.display = 'block';

        if (window.UI && typeof window.UI.enterFieldMode === 'function') {
            window.UI.enterFieldMode(true);
        }

        const lbl = document.getElementById('lbl-current-cabin');
        if (lbl) lbl.innerText = `📂 Job: ${job.worksheetName} — ${lbl.innerText}`;
    },

    backToJobsScreen: function() {
        window.isRegularJob = false;

        if (window.UI && typeof window.UI.clearAllData === 'function') {
            window.UI.clearAllData();
        }

        const nextUpPanel = document.getElementById('next-up-panel');
        if (nextUpPanel) nextUpPanel.style.display = 'none';

        window.activeJobId = null;
        window.isHistoryView = false;

        const backTopBtn = document.getElementById('btn-back-top');
        if (backTopBtn) backTopBtn.style.display = 'none';

        const backToJobsBtn = document.getElementById('btn-back-to-jobs');
        if (backToJobsBtn) backToJobsBtn.style.display = 'none';

        this.currentPage = 1;

        const tbody = document.getElementById('table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color: #94a3b8; font-size: 16px;">📭 មិនទាន់មានទិន្នន័យផ្លូវចែកទេ។</td></tr>`;
        }

        const lblCounter = document.getElementById('lbl-counter-progress');
        if (lblCounter) lblCounter.innerText = 'ចែកបាន៖ 0/0';

        const lblCabin = document.getElementById('lbl-current-cabin');
        if (lblCabin) lblCabin.innerText = '📋 ផ្លូវជាក់ស្តែង';

        const areaJobs = document.getElementById('area-jobs');
        if (areaJobs) areaJobs.style.display = 'block';
        document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('tab-active'));
        document.getElementById('tab-jobs')?.classList.add('tab-active');

        window.StorageEngine.saveSessionCache();
    },

    _showAlert: function(message) {
        if (window.Utils && typeof window.Utils.showAlert === 'function') {
            window.Utils.showAlert(message);
        } else {
            alert(message);
        }
    }
};

// ================================================================
// 🚀 INITIALIZE
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    if (window.JobsEngine && typeof window.JobsEngine.init === 'function') {
        window.JobsEngine._initialized = false;
        window.JobsEngine.init();
    }
});