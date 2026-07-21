// ================================================================
// 🏢 COMPANY REPORT MODULE - កំណែពេញលេញ (ដោះស្រាយបញ្ហា F5 និង Sync UI ជាមួយ Tab)
// ================================================================

// Object សម្រាប់ទាញយក Icon តាមប្រភេទនៃការចែក
const methodIcons = {
    'ប្រអប់': '📦',
    'សន្តិសុខ': '🔒',
    'បុគ្គលិក': '👤',
    'ម្ចាស់ទីតាំង': '🏠'
};

window.CompanyReport = {
    COMPANIES_KEY: 'EDC_COMPANIES_DATA',
    companies: [],
    _initialized: false,

    init: function() {
        if (this._initialized) return;
        console.log('🏢 Company Report initializing...');
        this.loadCompanies(); // ទាញទិន្នន័យពី LocalStorage មកមុន
        this.addUI();         // បង្កើតរចនាសម្ព័ន្ធប៊ូតុង និង Stats
        this.bindTabEvents(); // 🆕 ភ្ជាប់ព្រឹត្តិការណ៍ Tab ការពារការបាត់ UI ពេល F5
        this.renderCompanies();
        this._initialized = true;
    },

    addUI: function() {
        const container = document.getElementById('area-companies');
        if (!container) {
            console.error('❌ area-companies not found!');
            return;
        }
        
        container.innerHTML = `
            <div class="companies-import-bar">
                <input type="file" id="company-excel-input" accept=".xlsx, .xls" style="display:none;" />
                <button class="btn btn-primary" id="btn-import-company-excel">📥 នាំចូល Excel ក្រុមហ៊ុន</button>
                <button class="btn btn-success" id="btn-generate-from-master">📊 បង្កើតពី Master Data</button>
                <button class="btn btn-warning" id="btn-export-company-report">📤 Export របាយការណ៍</button>
                <p class="companies-import-hint">នាំចូល Excel ក្រុមហ៊ុនដើម្បីបង្ហាញទិន្នន័យ និងរក្សាលំដាប់លំដោយតាមហ្វាយល៍ដើមទាំងស្រុង</p>
            </div>
            
            <div class="companies-stats" id="companies-stats">
                <div class="stat-card"><h3>ក្រុមហ៊ុនសរុប</h3><p id="stat-total-companies">0</p></div>
                <div class="stat-card"><h3>ទីតាំងសរុប</h3><p id="stat-total-locations">0</p></div>
                <div class="stat-card"><h3>Digital Bill</h3><p id="stat-digital-bills">0</p></div>
                <div class="stat-card"><h3>Physical Bill</h3><p id="stat-physical-bills">0</p></div>
            </div>
            
            <div class="companies-list" id="companies-list"></div>
        `;

        const importBtn = document.getElementById('btn-import-company-excel');
        const fileInput = document.getElementById('company-excel-input');
        if (importBtn && fileInput) {
            importBtn.addEventListener('click', function() { fileInput.click(); });
            fileInput.addEventListener('change', function(e) {
                window.CompanyReport.importCompanyExcel(e);
            });
        }
        
        const generateBtn = document.getElementById('btn-generate-from-master');
        if (generateBtn) {
            generateBtn.addEventListener('click', function() {
                window.CompanyReport.generateFromMasterData();
            });
        }
        
        const exportBtn = document.getElementById('btn-export-company-report');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                window.CompanyReport.exportReport();
            });
        }

        this.updateStats();
    },

    // 🆕 មុខងារចងព្រឹត្តិការណ៍បិទបើកផ្ទាំង (Sync Tab Events ជំនួសកូដចាស់ក្នុង index.html)
    bindTabEvents: function() {
        const tabCompanies = document.getElementById('tab-companies');
        
        const areaSetup = document.getElementById('area-setup');
        const areaJobs = document.getElementById('area-jobs');
        const areaCompanies = document.getElementById('area-companies');
        const areaField = document.getElementById('area-field');
        const areaRegular = document.getElementById('area-regular');
        
        const blockHistory = document.getElementById('block-history');
        const blockStats = document.getElementById('block-stats');
        const blockActions = document.getElementById('block-actions');

        if (tabCompanies) {
            // កែប្រែព្រឹត្តិការណ៍ចុចបើក Tab ក្រុមហ៊ុនឱ្យស្គាល់ទិន្នន័យចាស់ជានិច្ច
            tabCompanies.addEventListener('click', () => {
                console.log('🏢 Companies tab clicked - Syncing data...');
                
                // ១. ដូរពណ៌ Tab ឱ្យ Active
                document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('tab-active'));
                tabCompanies.classList.add('tab-active');
                
                // ២. បិទផ្ទាំងផ្សេងៗ និងបើកបង្ហាញផ្ទាំងក្រុមហ៊ុន
                if (areaSetup) areaSetup.style.display = 'none';
                if (areaJobs) areaJobs.style.display = 'none';
                if (areaField) areaField.style.display = 'none';
                if (areaRegular) areaRegular.style.display = 'none';
                if (areaCompanies) areaCompanies.style.display = 'block'; // បើកផ្ទាំងក្រុមហ៊ុន[cite: 3]
                
                if (blockHistory) blockHistory.style.display = 'none';
                if (blockStats) blockStats.style.display = 'none';
                if (blockActions) blockActions.style.display = 'none';

                // ៣. ទាញទិន្នន័យចាស់ពី Storage មករៀបចំបង្ហាញឡើងវិញភ្លាមៗ
                this.loadCompanies(); 
                this.renderCompanies();
                this.updateStats();
            });
        }
    },

    // ---- 📥 មុខងារនាំចូល Excel ----
    importCompanyExcel: function(event) {
        console.log('📥 importCompanyExcel called');
        
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (typeof XLSX === 'undefined') {
            window.Utils.showAlert('❌ Library XLSX មិនត្រូវបានផ្ទុក!');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                let companies = [];
                let currentCompany = null;
                let totalHouses = 0;

                for (let i = 0; i < aoa.length; i++) {
                    const row = aoa[i];
                    if (!row || row.length === 0) continue;

                    const col0 = String(row[0] || '').trim();
                    const col1 = String(row[1] || '').trim();

                    if (col0 && col0.includes('ទិន្នន័យទីតាំងផ្គត់ផ្គង់ចរន្តរបស់ក្រុមហ៊ុន') && !col1) {
                        const companyName = col0.substring(col0.indexOf('ក្រុមហ៊ុន') + 9).trim();
                        currentCompany = {
                            name: companyName,
                            houses: [],
                            digitalBills: 0,
                            physicalBills: 0,
                            active: 0,
                            inactive: 0,
                            deleted: 0
                        };
                        companies.push(currentCompany);
                        continue;
                    }

                    if (col0 && col0.toLowerCase().includes('សរុប')) {
                        continue;
                    }

                    if (col1 && col1.match(/^\d{6,12}$/)) {
                        if (currentCompany) {
                            totalHouses++;
                            
                            let masterInvoice = col1;
                            if (col1.length >= 10) {
                                masterInvoice = col1.slice(0, -2);
                            }
                            
                            let masterRow = null;
                            if (window.Utils && typeof window.Utils.findByInvoice === 'function') {
                                masterRow = window.Utils.findByInvoice(masterInvoice);
                            }

                            const columnOther = String(row[9] || '').trim();
                            const isDigital = columnOther.toLowerCase().includes('digital') || 
                                              (masterRow ? window.Utils.hasMethod(masterRow.method, 'digital') : false);
                            
                            const st = row[5] ? 'ផ្លូវ ' + row[5] : '';
                            const comm = row[6] ? 'សង្កាត់' + row[6] : '';
                            const dist = row[7] ? 'ខណ្ឌ' + row[7] : '';
                            const landmark = row[8] || '';
                            const fullAddress = [st, comm, dist, landmark].filter(Boolean).join(' ');

                            const house = {
                                invoice: col1,
                                masterInvoice: masterInvoice,
                                name: row[2] || '', 
                                door: row[3] || '', 
                                boxNumber: row[4] || '', 
                                box: (row[3] || '') + (row[4] || ''), 
                                address: fullAddress || 'N/A',
                                status: masterRow ? masterRow.status : 'កំពុងប្រើប្រាស់',
                                isDigital: isDigital,
                                masterStatus: masterRow ? masterRow.status : 'កំពុងប្រើប្រាស់',
                                masterMethod: masterRow ? masterRow.method : (isDigital ? 'digital' : ''),
                                hasMaster: !!masterRow
                            };
                            
                            currentCompany.houses.push(house);
                            
                            if (house.isDigital) currentCompany.digitalBills++;
                            else currentCompany.physicalBills++;
                            
                            if (house.status === 'កំពុងប្រើប្រាស់') currentCompany.active++;
                            else if (house.status === 'ឈប់ប្រើ') currentCompany.inactive++;
                            else if (house.status === 'បានលុប') currentCompany.deleted++;
                        }
                    }
                }

                window.CompanyReport.companies = companies;
                window.StorageEngine.saveCompanies(companies);
                
                window.CompanyReport.renderCompanies();
                window.CompanyReport.updateStats();
                
                window.Utils.showAlert(`✅ បាននាំចូល ${companies.length} ក្រុមហ៊ុន និង ${totalHouses} ទីតាំង តាមទម្រង់ហ្វាយល៍ដើមជោគជ័យ!`);
                
            } catch (err) {
                console.error('❌ Import error:', err);
                window.Utils.showAlert('❌ ការអានហ្វាល់បរាជ័យ! ' + err.message);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    },

    // ---- បង្កើតពី Master Data ----
    generateFromMasterData: function() {
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert('⚠️ គ្មានទិន្នន័យ Master Data! សូម Import Excel ជាមុនសិន។');
            return;
        }

        const KNOWN_COMPANIES = [
            { name: 'CAM GSM CO.,LTD', keywords: ['CAM GSM', 'CAM GSM CO.,LTD'] },
            { name: 'VIETTEL CAMBODIA.PTE.,LTD', keywords: ['VIETTEL', 'VIETTEL CAMBODIA'] },
            { name: 'ស្មាត អាស្យាតា ខូ អិលធីឌី', keywords: ['SMART', 'LATELZ', 'ស្មាត'] },
            { name: 'SEATEL CO', keywords: ['SEATEL', 'FAN JIANKANG'] },
            { name: 'TELCOTECH CO.,LTD', keywords: ['TELCOTECH', 'KING TECHNOLOGIES'] },
            { name: 'PPCTV', keywords: ['PPCTV', 'SOK CHAMROEUN'] },
            { name: 'EDOTCO', keywords: ['EDOTCO'] },
            { name: 'XINWEI', keywords: ['XINWEI'] },
            { name: 'ADM', keywords: ['ADM'] },
            { name: 'Comprehensive', keywords: ['Comprehensive'] }
        ];

        const companies = {};
        
        window.masterData.forEach(row => {
            let companyName = 'Other';
            if (row.name) {
                const uName = row.name.toUpperCase();
                for (const comp of KNOWN_COMPANIES) {
                    if (comp.keywords.some(k => uName.includes(comp.name.toUpperCase()) || uName.includes(k.toUpperCase()))) {
                        companyName = comp.name;
                        break;
                    }
                }
            }
            
            if (!companies[companyName]) {
                companies[companyName] = {
                    name: companyName,
                    houses: [],
                    digitalBills: 0,
                    physicalBills: 0,
                    active: 0,
                    inactive: 0,
                    deleted: 0
                };
            }
            
            const company = companies[companyName];
            const isDigital = window.Utils.hasMethod(row.method, 'digital');
            
            const house = {
                invoice: row.invoice,
                masterInvoice: row.invoice,
                name: row.name || '',
                status: row.status || 'កំពុងប្រើប្រាស់',
                box: row.box || '',
                door: row.door || '',
                boxNumber: row.boxNumber || '',
                address: row.address || '',
                isDigital: isDigital,
                masterStatus: row.status || 'កំពុងប្រើប្រាស់',
                masterMethod: row.method || '',
                hasMaster: true
            };
            
            company.houses.push(house);
            if (isDigital) company.digitalBills++;
            else company.physicalBills++;
            
            if (house.status === 'កំពុងប្រើប្រាស់') company.active++;
            else if (house.status === 'ឈប់ប្រើ') company.inactive++;
            else if (house.status === 'បានលុប') company.deleted++;
        });

        this.companies = Object.values(companies);
        window.StorageEngine.saveCompanies(this.companies);
        
        this.renderCompanies();
        this.updateStats();
        
        window.Utils.showAlert(`✅ បានបង្កើតរបាយការណ៍ពី Master Data! (${this.companies.length} ក្រុមហ៊ុន)`);
    },

    // ---- 📊 Render តារាងក្រុមហ៊ុនធំ ----
    renderCompanies: function() {
        const container = document.getElementById('companies-list');
        if (!container) return;
        
        const companies = this.companies || [];
        if (companies.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📭 មិនទាន់មានរបាយការណ៍ក្រុមហ៊ុនទេ។</p>
                    <p style="font-size: 13px; color: #94a3b8;">សូមចុច "📥 នាំចូល Excel ក្រុមហ៊ុន" ដើម្បីបង្ហាញទម្រង់ពិត</p>
                </div>
            `;
            return;
        }

        const esc = window.Utils.escapeHtml.bind(window.Utils);
        
        container.innerHTML = `
            <div class="companies-table-wrapper">
                <table class="companies-table">
                    <thead>
                        <tr>
                            <th>ល.រ</th>
                            <th>ក្រុមហ៊ុន</th>
                            <th>សរុបទីតាំង</th>
                            <th>Digital Bill</th>
                            <th>Physical Bill</th>
                            <th>កំពុងប្រើ</th>
                            <th>ឈប់ប្រើ</th>
                            <th>% Digital</th>
                            <th style="width: 130px;">សកម្មភាព</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${companies.map((company, index) => {
                            const total = company.houses.length;
                            const percent = total > 0 ? Math.round((company.digitalBills / total) * 100) : 0;
                            const statusColor = percent > 50 ? '#16a34a' : '#f59e0b';
                            
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td><strong>${esc(company.name)}</strong></td>
                                    <td>${total}</td>
                                    <td style="color: #2563eb; font-weight: bold;">${company.digitalBills}</td>
                                    <td style="color: #ea580c;">${company.physicalBills}</td>
                                    <td style="color: #16a34a;">${company.active}</td>
                                    <td style="color: #f59e0b;">${company.inactive}</td>
                                    <td>
                                        <div class="progress-bar-mini">
                                            <div class="progress-fill-mini" style="width: ${percent}%; background: ${statusColor};"></div>
                                            <span>${percent}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-view-details" data-company="${esc(company.name)}" style="padding: 5px 10px; font-size: 11px; background: #1e3a8a; color: white; border: none; border-radius: 4px; cursor: pointer;">👁️ មើលបញ្ជី</button>
                                        <button class="btn btn-sm btn-add-customer" data-company="${esc(company.name)}" style="padding: 5px 10px; font-size: 11px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">➕ បន្ថែម</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.querySelectorAll('.btn-view-details').forEach(btn => {
            btn.addEventListener('click', function() { window.CompanyReport.showCompanyDetails(this.dataset.company); });
        });
        container.querySelectorAll('.btn-add-customer').forEach(btn => {
            btn.addEventListener('click', function() { window.CompanyReport.showAddCustomerModal(this.dataset.company); });
        });
    },

    // ---- 👁️ ផ្ទាំងបង្ហាញបញ្ជីលម្អិត ----
    showCompanyDetails: function(companyName) {
        const company = this.companies.find(c => c.name === companyName);
        if (!company) return;

        const esc = window.Utils.escapeHtml.bind(window.Utils);
        
        let detailsHtml = `
            <div class="company-details-modal" id="details-modal-box" style="max-width: 95%; width: 1100px;">
                <div class="company-details-header">
                    <h3>🏢 បញ្ជីឈ្មោះក្រុមហ៊ុន៖ ${esc(company.name)}</h3>
                    <button class="btn-close-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="company-details-stats">
                    <span>សរុប: <strong>${company.houses.length}</strong></span>
                    <span>Digital: <strong style="color:#2563eb;">${company.digitalBills}</strong></span>
                    <span>Physical: <strong style="color:#ea580c;">${company.physicalBills}</strong></span>
                    <span>កំពុងប្រើ: <strong style="color:#16a34a;">${company.active}</strong></span>
                </div>
                <div class="company-details-table">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 45px;">ល.រ</th>
                                <th style="width: 100px;">លេខ IN</th>
                                <th style="width: 100px;">លេខកាប៊ីន</th>
                                <th style="width: 90px;">ស្ថានភាព</th>
                                <th style="width: 60px;">ទ្វារ</th>
                                <th style="width: 80px;">លេខប្រអប់</th>
                                <th>អាសយដ្ឋាន</th>
                                <th style="width: 110px;">ប្រភេទវិក្កយបត្រ</th>
                                <th style="width: 80px; text-align:center;">សកម្មភាព</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${company.houses.map((house, idx) => {
                                return `
                                    <tr>
                                        <td>${idx + 1}</td>
                                        <td><strong>${esc(house.invoice)}</strong></td>
                                        <td><strong>${esc(house.name || 'N/A')}</strong></td>
                                        <td>
                                            <span class="status-badge ${house.status === 'កំពុងប្រើប្រាស់' ? 'status-active' : 'status-inactive'}">
                                                ${esc(house.status || 'មិនស្គាល់')}
                                            </span>
                                        </td>
                                        <td>${esc(house.door || '-')}</td>
                                        <td>${esc(house.boxNumber || '-')}</td>
                                        <td style="text-align:left; font-size:12px; color:var(--text-secondary);">${esc(house.address || 'N/A')}</td>
                                        <td>${house.isDigital ? '✅ Digital' : '❌ Physical'}</td>
                                        <td style="text-align:center;">
                                            <button class="btn-edit-customer" data-company="${esc(companyName)}" data-invoice="${esc(house.invoice)}" style="padding:2px 6px; background:#f59e0b; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;" title="កែប្រែទិន្នន័យ">✏️</button>
                                            <button class="btn-delete-customer" data-company="${esc(companyName)}" data-invoice="${esc(house.invoice)}" style="padding:2px 6px; background:#dc2626; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;" title="លុបឈ្មោះនេះ">🗑️</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('company-details-overlay-box')?.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.id = 'company-details-overlay-box';
        modalOverlay.innerHTML = detailsHtml;
        document.body.appendChild(modalOverlay);
        
        modalOverlay.querySelectorAll('.btn-edit-customer').forEach(btn => {
            btn.addEventListener('click', function() {
                window.CompanyReport.showEditCustomerModal(this.dataset.company, this.dataset.invoice);
            });
        });

        modalOverlay.querySelectorAll('.btn-delete-customer').forEach(btn => {
            btn.addEventListener('click', function() {
                window.CompanyReport.deleteCustomer(this.dataset.company, this.dataset.invoice);
            });
        });

        modalOverlay.addEventListener('click', function(e) { if (e.target === this) this.remove(); });
    },

    // ---- ✏️ ផ្ទាំងកែប្រែទិន្នន័យអតិថិជនម្នាក់ៗ ----
    showEditCustomerModal: function(companyName, invoice) {
        const company = this.companies.find(c => c.name === companyName);
        if (!company) return;
        const house = company.houses.find(h => h.invoice === invoice);
        if (!house) return;

        const esc = window.Utils.escapeHtml.bind(window.Utils);
        
        const modalHtml = `
            <div class="modal-overlay" id="edit-customer-modal" style="z-index: 9999;">
                <div class="company-details-modal" style="max-width: 480px; margin-top: 60px;">
                    <div class="company-details-header">
                        <h3>✏️ កែប្រែទិន្នន័យទីតាំង</h3>
                        <button class="btn-close-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div style="padding: 20px;">
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">លេខ IN *</label>
                            <input type="text" id="edit-cust-invoice" value="${esc(house.invoice)}" placeholder="លេខ IN..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">លេខកាប៊ីន *</label>
                            <input type="text" id="edit-cust-name" value="${esc(house.name)}" placeholder="វាយលេខកាប៊ីន..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">ទ្វារចរន្ត</label>
                                <input type="text" id="edit-cust-door" value="${esc(house.door)}" placeholder="ទ្វារ..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                            </div>
                            <div style="flex: 1;">
                                <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">លេខប្រអប់</label>
                                <input type="text" id="edit-cust-box" value="${esc(house.boxNumber)}" placeholder="ប្រអប់..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                            </div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">អាសយដ្ឋាន</label>
                            <input type="text" id="edit-cust-address" value="${esc(house.address)}" placeholder="អាសយដ្ឋាន..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                            <div style="flex: 1;">
                                <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">ស្ថានភាព</label>
                                <select id="edit-cust-status" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                                    <option value="កំពុងប្រើប្រាស់" ${house.status === 'កំពុងប្រើប្រាស់' ? 'selected' : ''}>កំពុងប្រើប្រាស់</option>
                                    <option value="ឈប់ប្រើ" ${house.status === 'ឈប់ប្រើ' ? 'selected' : ''}>ឈប់ប្រើ</option>
                                </select>
                            </div>
                            <div style="flex: 1; display: flex; align-items: center; padding-top: 20px;">
                                <input type="checkbox" id="edit-cust-digital" ${house.isDigital ? 'checked' : ''} style="width: 18px; height: 18px; margin-right: 8px;">
                                <label for="edit-cust-digital" style="font-weight: bold; font-size: 13px; color: #1e3a8a;">Digital Bill</label>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button class="btn btn-success" id="btn-edit-cust-save" style="flex: 1; padding: 12px;">💾 រក្សាទុកការកែប្រែ</button>
                            <button class="btn btn-slate" style="flex: 1; padding: 12px;" onclick="this.closest('.modal-overlay').remove()">បោះបង់</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal.firstElementChild);

        document.getElementById('btn-edit-cust-save')?.addEventListener('click', function() {
            const newInvoice = document.getElementById('edit-cust-invoice').value.trim();
            const newName = document.getElementById('edit-cust-name').value.trim();
            const newDoor = document.getElementById('edit-cust-door').value.trim();
            const newBoxNum = document.getElementById('edit-cust-box').value.trim();
            const newAddress = document.getElementById('edit-cust-address').value.trim();
            const newStatus = document.getElementById('edit-cust-status').value;
            const newIsDigital = document.getElementById('edit-cust-digital').checked;

            if (!newInvoice || !newName) {
                window.Utils.showAlert('⚠️ សូមបំពេញលេខ IN និងលេខកាប៊ីន!');
                return;
            }

            house.invoice = newInvoice;
            house.name = newName;
            house.door = newDoor;
            house.boxNumber = newBoxNum;
            house.box = newDoor + newBoxNum;
            house.address = newAddress;
            house.status = newStatus;
            house.isDigital = newIsDigital;

            window.CompanyReport.recalculateCompanyStats(company);

            window.StorageEngine.saveCompanies(window.CompanyReport.companies);
            window.CompanyReport.renderCompanies();
            window.CompanyReport.updateStats();
            
            window.CompanyReport.showCompanyDetails(companyName);
            document.getElementById('edit-customer-modal').remove();
            window.Utils.showAlert('✅ បានកែប្រែទិន្នន័យរួចរាល់!');
        });
    },

    // ---- 🗑️ មុខងារលុបឈ្មោះអតិថិជនម្នាក់ៗ ----
    deleteCustomer: function(companyName, invoice) {
        const company = this.companies.find(c => c.name === companyName);
        if (!company) return;
        const house = company.houses.find(h => h.invoice === invoice);
        if (!house) return;

        if (!confirm(`⚠️ តើអ្នកពិតជាចង់លុបជួរលេខ IN: ${invoice} នេះមែនទេ?`)) return;

        company.houses = company.houses.filter(h => h.invoice !== invoice);
        this.recalculateCompanyStats(company);

        window.StorageEngine.saveCompanies(this.companies);
        this.renderCompanies();
        this.updateStats();
        
        window.CompanyReport.showCompanyDetails(companyName);
        window.Utils.showAlert('🗑️ បានលុបជួរទិន្នន័យរួចរាល់!');
    },

    recalculateCompanyStats: function(company) {
        company.digitalBills = 0;
        company.physicalBills = 0;
        company.active = 0;
        company.inactive = 0;
        company.deleted = 0;

        company.houses.forEach(h => {
            if (h.isDigital) company.digitalBills++; else company.physicalBills++;
            if (h.status === 'កំពុងប្រើប្រាស់') company.active++; else company.inactive++;
        });
    },

    showAddCustomerModal: function(companyName) {
        const esc = window.Utils.escapeHtml.bind(window.Utils);
        const modalHtml = `
            <div class="modal-overlay" id="add-customer-modal">
                <div class="company-details-modal" style="max-width: 500px;">
                    <div class="company-details-header">
                        <h3>➕ បន្ថែមទិន្នន័យថ្មី</h3>
                        <button class="btn-close-modal" onclick="this.closest('.modal-overlay').remove()">✕</button>
                    </div>
                    <div style="padding: 20px;">
                        <p style="color: #64748b; font-size: 13px;">ក្រុមហ៊ុន: <strong>${esc(companyName)}</strong></p>
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">លេខ IN *</label>
                            <input type="text" id="new-customer-invoice" placeholder="បញ្ចូលលេខ IN..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">លេខកាប៊ីន *</label>
                            <input type="text" id="new-customer-name" placeholder="បញ្ចូលលេខកាប៊ីន..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">ទ្វារចរន្ត</label>
                                <input type="text" id="new-customer-door" placeholder="ឧ. 1" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                            </div>
                            <div style="flex: 1;">
                                <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">លេខប្រអប់</label>
                                <input type="text" id="new-customer-box" placeholder="ឧ. 018C" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                            </div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">អាសយដ្ឋាន</label>
                            <input type="text" id="new-customer-address" placeholder="បញ្ចូលអាសយដ្ឋាន..." style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                        </div>
                        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                            <div style="flex: 1;">
                                <label style="font-weight: bold; font-size: 13px; color: #1e3a8a;">ស្ថានភាព</label>
                                <select id="new-customer-status" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; margin-top: 4px; font-size: 14px;">
                                    <option value="កំពុងប្រើប្រាស់">កំពុងប្រើប្រាស់</option>
                                    <option value="ឈប់ប្រើ">ឈប់ប្រើ</option>
                                </select>
                            </div>
                            <div style="flex: 1; display: flex; align-items: center; padding-top: 20px;">
                                <input type="checkbox" id="new-customer-digital" style="width: 18px; height: 18px; margin-right: 8px;">
                                <label for="new-customer-digital" style="font-weight: bold; font-size: 13px; color: #1e3a8a;">Digital Bill</label>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button class="btn btn-success" id="btn-add-customer-save" style="flex: 1; padding: 12px;">✅ រក្សាទុក</button>
                            <button class="btn btn-slate" style="flex: 1; padding: 12px;" onclick="this.closest('.modal-overlay').remove()">បោះបង់</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal.firstElementChild);

        document.getElementById('btn-add-customer-save')?.addEventListener('click', function() {
            const invoice = document.getElementById('new-customer-invoice').value.trim();
            const name = document.getElementById('new-customer-name').value.trim();
            const door = document.getElementById('new-customer-door').value.trim();
            const boxNumber = document.getElementById('new-customer-box').value.trim();
            const address = document.getElementById('new-customer-address').value.trim();
            const status = document.getElementById('new-customer-status').value;
            const isDigital = document.getElementById('new-customer-digital').checked;

            if (!invoice || !name) {
                window.Utils.showAlert('⚠️ សូមបំពេញ លេខ IN និងលេខកាប៊ីន!');
                return;
            }

            window.CompanyReport.addCustomerToCompany(companyName, {
                invoice: invoice, name: name, door: door, boxNumber: boxNumber, box: door + boxNumber, address: address, status: status, isDigital: isDigital
            });
            document.getElementById('add-customer-modal').remove();
        });
    },

    addCustomerToCompany: function(companyName, customerData) {
        const company = this.companies.find(c => c.name === companyName);
        if (!company) return false;

        if (company.houses.some(h => h.invoice === customerData.invoice)) {
            window.Utils.showAlert(`⚠️ លេខ IN ${customerData.invoice} មានរួចហើយ!`);
            return false;
        }

        const newHouse = {
            invoice: customerData.invoice,
            masterInvoice: customerData.invoice,
            name: customerData.name,
            status: customerData.status,
            box: customerData.box,
            door: customerData.door,
            boxNumber: customerData.boxNumber,
            address: customerData.address || 'N/A',
            isDigital: customerData.isDigital,
            masterStatus: customerData.status,
            masterMethod: customerData.isDigital ? 'digital' : '',
            hasMaster: false
        };

        company.houses.push(newHouse);
        this.recalculateCompanyStats(company);

        window.StorageEngine.saveCompanies(this.companies);
        this.renderCompanies();
        this.updateStats();
        window.Utils.showAlert('✅ បានបន្ថែមជួរទិន្នន័យថ្មីរួចរាល់!');
        return true;
    },

    updateStats: function() {
        const companies = this.companies || [];
        const total = companies.reduce((sum, c) => sum + c.houses.length, 0);
        const digital = companies.reduce((sum, c) => sum + c.digitalBills, 0);
        const physical = total - digital;
        
        if (document.getElementById('stat-total-companies')) document.getElementById('stat-total-companies').textContent = companies.length;
        if (document.getElementById('stat-total-locations')) document.getElementById('stat-total-locations').textContent = total;
        if (document.getElementById('stat-digital-bills')) document.getElementById('stat-digital-bills').textContent = digital;
        if (document.getElementById('stat-physical-bills')) document.getElementById('stat-physical-bills').textContent = physical;
    },

    // ---- 📤 មុខងារ Export Excel ----
    exportReport: function() {
        const companies = this.companies || [];
        if (companies.length === 0) {
            window.Utils.showAlert('⚠️ គ្មានរបាយការណ៍សម្រាប់ Export!');
            return;
        }
        if (typeof ExcelJS === 'undefined') {
            window.Utils.showAlert('❌ Library ExcelJS មិនត្រូវបានផ្ទុក!');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sheet1');
            const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            worksheet.mergeCells('G1:I1');
            worksheet.getCell('G1').value = 'ព្រះរាជាណាចក្រកម្ពុជា';
            worksheet.getCell('G1').font = { name: 'Khmer OS Muol Light', size: 10 };
            worksheet.getCell('G1').alignment = { horizontal: 'center' };

            worksheet.getCell('A2').value = 'អគ្គិសនីកម្ពុជា';
            worksheet.getCell('A2').font = { name: 'Khmer OS Muol Light', size: 10 };
            worksheet.mergeCells('G2:I2');
            worksheet.getCell('G2').value = 'ជាតិ    សាសនា​    ព្រះមហាក្សត្រ';
            worksheet.getCell('G2').font = { name: 'Khmer OS Muol Light', size: 10 };
            worksheet.getCell('G2').alignment = { horizontal: 'center' };

            worksheet.getCell('A3').value = 'នាយកដ្ឋានអាជីវកម្មចែកចាយ';
            worksheet.getCell('A3').font = { name: 'Khmer OS Battambang', size: 10 };
            worksheet.getCell('A4').value = 'សាខាអូរដឹម | ផ្នែកវិក្កយបត្រ';
            worksheet.getCell('A4').font = { name: 'Khmer OS Battambang', size: 10 };

            worksheet.mergeCells('C5:F5');
            worksheet.getCell('C5').value = 'របាយការណ៍ទីតាំងក្រុមហ៊ុនផ្គត់ផ្គង់ចរន្ត';
            worksheet.getCell('C5').font = { name: 'Khmer OS Muol Light', size: 13, bold: true };
            worksheet.getCell('C5').alignment = { horizontal: 'center' };

            const headers = ['ល.រ', 'លេខ IN', 'ប.ត', 'ទ្វារចរន្ត', 'លេខប្រអប់', 'អាសយដ្ឋាន', 'ប្រភេទវិក្កយបត្រ', 'ស្ថានភាព', 'ក្រុមហ៊ុន'];
            const headerRow = worksheet.getRow(7);
            headerRow.height = 25;
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { name: 'Khmer OS Battambang', size: 10, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                cell.border = borderStyle;
            });

            let rowIndex = 8;
            companies.forEach((company) => {
                const startRow = rowIndex;

                worksheet.mergeCells(`A${rowIndex}:I${rowIndex}`);
                const titleCell = worksheet.getCell(`A${rowIndex}`);
                titleCell.value = ` I. ទិន្នន័យទីតាំងផ្គត់ផ្គង់ចរន្តរបស់ក្រុមហ៊ុន ${company.name}`;
                titleCell.font = { name: 'Khmer OS Battambang', size: 10, bold: true };
                titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                titleCell.border = borderStyle;
                rowIndex++;

                company.houses.forEach((house, hIdx) => {
                    const row = worksheet.getRow(rowIndex);
                    const cells = [
                        hIdx + 1,
                        house.invoice || '',
                        house.boxNumber ? 'P' + house.invoice.substring(0,3) : 'P000', 
                        house.door || '',
                        house.boxNumber || '',
                        house.address || '',
                        house.isDigital ? 'Digital Bill' : '',
                        house.status || '',
                        company.name
                    ];
                    
                    cells.forEach((val, cIdx) => {
                        const cell = row.getCell(cIdx + 1);
                        cell.value = val;
                        cell.font = { name: 'Khmer OS Battambang', size: 10 };
                        cell.alignment = { horizontal: (cIdx === 5) ? 'left' : 'center', vertical: 'middle' };
                        cell.border = borderStyle;
                    });
                    rowIndex++;
                });

                const compSummaryRow = worksheet.getRow(rowIndex);
                worksheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
                worksheet.getCell(`A${rowIndex}`).value = `សរុប ${company.name}`;
                worksheet.getCell(`A${rowIndex}`).font = { name: 'Khmer OS Battambang', size: 10, bold: true };
                worksheet.getCell(`C${rowIndex}`).value = company.houses.length; 
                worksheet.getCell(`C${rowIndex}`).font = { name: 'Khmer OS Battambang', size: 10, bold: true };
                
                for (let k = 1; k <= 9; k++) {
                    compSummaryRow.getCell(k).border = borderStyle;
                    compSummaryRow.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                }
                rowIndex += 2; 
            });

            const grandSummaryRow = worksheet.getRow(rowIndex);
            worksheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
            worksheet.getCell(`A${rowIndex}`).value = 'សរុបរួមទាំងអស់';
            worksheet.getCell(`A${rowIndex}`).font = { name: 'Khmer OS Muol Light', size: 10 };
            grandSummaryRow.getCell(1).alignment = { horizontal: 'center' };
            
            worksheet.getCell(`C${rowIndex}`).value = { formula: `=COUNTA(B8:B${rowIndex-1})` }; 
            worksheet.getCell(`C${rowIndex}`).font = { name: 'Khmer OS Battambang', size: 10, bold: true };
            worksheet.getCell(`C${rowIndex}`).alignment = { horizontal: 'center' };

            for (let k = 1; k <= 9; k++) grandSummaryRow.getCell(k).border = borderStyle;

            worksheet.getColumn(1).width = 6;
            worksheet.getColumn(2).width = 15;
            worksheet.getColumn(3).width = 10;
            worksheet.getColumn(4).width = 10;
            worksheet.getColumn(5).width = 12;
            worksheet.getColumn(6).width = 35;
            worksheet.getColumn(7).width = 15;
            worksheet.getColumn(8).width = 15;
            worksheet.getColumn(9).width = 25;

            workbook.xlsx.writeBuffer().then(function(buffer) {
                saveAs(new Blob([buffer]), `Company_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
                window.Utils.showAlert('✅ Export របាយការណ៍តាមទម្រង់ស្តង់ដាររួចរាល់!');
            });
        } catch (err) {
            console.error('❌ Export error:', err);
            window.Utils.showAlert('❌ Export បរាជ័យ! ' + err.message);
        }
    },

    loadCompanies: function() {
        try {
            this.companies = window.StorageEngine.loadCompanies() || [];
            console.log('📊 Loaded companies:', this.companies.length);
        } catch (e) {
            console.error('❌ Load companies error:', e);
            this.companies = [];
        }
    }
};

// ---- Auto-init on DOM Ready ----
document.addEventListener('DOMContentLoaded', function() {
    if (window.CompanyReport && typeof window.CompanyReport.init === 'function') {
        window.CompanyReport.init();
    }
});