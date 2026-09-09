// ==========================================================================
// 🏢 COMPANY REPORT ENGINE (Mobile-Optimized & Smart Excel Parser)
// ==========================================================================

window.CompanyReport = {
    _initialized: false,

    init: function() {
        if (this._initialized) return;
        this.renderContainer();
        this.bindEvents();
        this._initialized = true;
    },

    renderContainer: function() {
        const container = document.getElementById('area-companies');
        if (!container) return;

        container.innerHTML = `
            <div class="glass-card" style="background: var(--bg-card, #1e293b); border: 1px solid var(--border, #334155); border-radius: var(--radius-lg, 16px); padding: 16px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
                
                <!-- Action Buttons Bar -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 12px;">
                    <div style="position: relative; overflow: hidden; width: 100%;">
                        <input type="file" id="company-file-input" accept=".xlsx, .xls" style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer; z-index:10;" />
                        <button class="btn" style="background: #6366f1; color: white; width: 100%; min-height: 44px; font-size: 13px; font-weight: 700; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            📥 នាំចូល Excel
                        </button>
                    </div>

                    <button class="btn btn-success" id="btn-company-from-master" style="min-height: 44px; font-size: 13px; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        📊 បង្កើតពី Master
                    </button>

                    <button class="btn btn-warning" id="btn-company-export" style="min-height: 44px; font-size: 13px; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        📤 Export របាយការណ៍
                    </button>
                </div>

                <p style="font-size: 12px; color: var(--text-muted, #94a3b8); margin-bottom: 14px; line-height: 1.4;">
                    ℹ️ របាយការណ៍បែងចែកក្រុមហ៊ុន និងរក្សាលំដាប់លំដោយទិន្នន័យជាក់ស្តែង
                </p>

                <!-- 4 Stats Cards Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
                    <div style="background: var(--bg, #0f172a); border: 1px solid var(--border, #334155); border-radius: 10px; padding: 12px; text-align: center;">
                        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted, #94a3b8); text-transform: uppercase;">ក្រុមហ៊ុនសរុប</span>
                        <p id="stat-comp-count" style="font-size: 22px; font-weight: 800; color: #818cf8; margin: 4px 0 0;">0</p>
                    </div>

                    <div style="background: var(--bg, #0f172a); border: 1px solid var(--border, #334155); border-radius: 10px; padding: 12px; text-align: center;">
                        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted, #94a3b8); text-transform: uppercase;">ទីតាំងសរុប</span>
                        <p id="stat-comp-total" style="font-size: 22px; font-weight: 800; color: #38bdf8; margin: 4px 0 0;">0</p>
                    </div>

                    <div style="background: var(--bg, #0f172a); border: 1px solid var(--border, #334155); border-radius: 10px; padding: 12px; text-align: center;">
                        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted, #94a3b8); text-transform: uppercase;">Digital Bill</span>
                        <p id="stat-comp-digital" style="font-size: 22px; font-weight: 800; color: #a855f7; margin: 4px 0 0;">0</p>
                    </div>

                    <div style="background: var(--bg, #0f172a); border: 1px solid var(--border, #334155); border-radius: 10px; padding: 12px; text-align: center;">
                        <span style="font-size: 11.5px; font-weight: 700; color: var(--text-muted, #94a3b8); text-transform: uppercase;">Physical Bill</span>
                        <p id="stat-comp-physical" style="font-size: 22px; font-weight: 800; color: #3b82f6; margin: 4px 0 0;">0</p>
                    </div>
                </div>

                <!-- Perfectly Aligned Responsive Table -->
                <div class="table-responsive" style="max-height: 480px; overflow-y: auto; overflow-x: auto; border: 1px solid var(--border, #334155); border-radius: 10px; background: var(--bg, #0f172a);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                        <thead>
                            <tr style="background: #2563eb; color: #ffffff; position: sticky; top: 0; z-index: 5;">
                                <th style="width: 44px; padding: 10px 6px; text-align: center; white-space: nowrap;">ល.រ</th>
                                <th style="min-width: 130px; padding: 10px 8px; white-space: nowrap;">ក្រុមហ៊ុន</th>
                                <th style="width: 75px; padding: 10px 6px; text-align: center; white-space: nowrap;">សរុប</th>
                                <th style="width: 75px; padding: 10px 6px; text-align: center; white-space: nowrap; color: #c4b5fd;">Digital</th>
                                <th style="width: 75px; padding: 10px 6px; text-align: center; white-space: nowrap; color: #93c5fd;">Physical</th>
                            </tr>
                        </thead>
                        <tbody id="company-report-tbody">
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted, #94a3b8);">
                                    📭 មិនទាន់មានទិន្នន័យក្រុមហ៊ុននៅឡើយ
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        `;
    },

    bindEvents: function() {
        document.getElementById('btn-company-from-master')?.addEventListener('click', () => {
            this.generateFromMaster();
        });

        document.getElementById('btn-company-export')?.addEventListener('click', () => {
            this.exportReport();
        });

        const fileInput = document.getElementById('company-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this.importExcel(file);
            });
        }
    },

    generateFromMaster: function() {
        let master = window.masterData || [];
        if (master.length === 0 && window.StorageEngine) {
            master = window.StorageEngine.loadMasterData();
        }

        if (!master || master.length === 0) {
            if (window.Utils?.showAlert) window.Utils.showAlert('⚠️ គ្មាន Master Data សម្រាប់ទាញយកទេ!');
            else alert('⚠️ គ្មាន Master Data សម្រាប់ទាញយកទេ!');
            return;
        }

        const compMap = new Map();

        master.forEach(r => {
            let compName = r.company || r.companyName || r.ក្រុមហ៊ុន || 'Other';
            if (!compName || String(compName).trim() === '') compName = 'Other';
            compName = String(compName).trim();

            if (!compMap.has(compName)) {
                compMap.set(compName, { name: compName, total: 0, digital: 0, physical: 0 });
            }

            const item = compMap.get(compName);
            item.total++;

            // កែសម្រួល៖ បំប្លែងទៅជាអក្សរតូចសិន ការពារកំហុសអក្សរធំតូច (Case Sensitivity)
            const isDig = r.digitalNote || (r.method && String(r.method).toLowerCase().includes('digital'));
            if (isDig) {
                item.digital++;
            } else {
                item.physical++;
            }
        });

        const list = Array.from(compMap.values());
        // Sort: Other ទៅក្រោមគេ
        list.sort((a, b) => {
            if (a.name === 'Other') return 1;
            if (b.name === 'Other') return -1;
            return b.total - a.total;
        });

        this._companiesList = list;
        this.renderCompanies();
        this.updateStats();

        if (window.Utils?.showAlert) window.Utils.showAlert('✅ បង្កើតរបាយការណ៍ក្រុមហ៊ុនជោគជ័យ!');
    },

    renderCompanies: function() {
        if (!this._initialized) this.init();

        const tbody = document.getElementById('company-report-tbody');
        if (!tbody) return;

        const list = this._companiesList || [];
        if (list.length === 0) {
            this.generateFromMaster();
            return;
        }

        const esc = (s) => (window.Utils?.escapeHtml ? window.Utils.escapeHtml(s) : String(s || ''));

        tbody.innerHTML = list.map((item, idx) => `
            <tr style="border-bottom: 1px solid var(--border, #334155);">
                <td style="text-align: center; font-weight: 600; color: var(--text-muted, #94a3b8); padding: 12px 6px;">${idx + 1}</td>
                <td style="padding: 12px 8px; font-weight: 700; color: var(--text, #f8fafc);">${esc(item.name)}</td>
                <td style="text-align: center; font-weight: 700; color: #38bdf8; padding: 12px 6px;">${item.total}</td>
                <td style="text-align: center; font-weight: 700; color: #a855f7; padding: 12px 6px;">${item.digital}</td>
                <td style="text-align: center; font-weight: 700; color: #60a5fa; padding: 12px 6px;">${item.physical}</td>
            </tr>
        `).join('');
    },

    updateStats: function() {
        const list = this._companiesList || [];
        let totalComp = list.length;
        let totalHouses = 0, totalDig = 0, totalPhys = 0;

        list.forEach(c => {
            totalHouses += c.total;
            totalDig += c.digital;
            totalPhys += c.physical;
        });

        const elComp = document.getElementById('stat-comp-count');
        const elTotal = document.getElementById('stat-comp-total');
        const elDig = document.getElementById('stat-comp-digital');
        const elPhys = document.getElementById('stat-comp-physical');

        if (elComp) elComp.innerText = totalComp;
        if (elTotal) elTotal.innerText = totalHouses;
        if (elDig) elDig.innerText = totalDig;
        if (elPhys) elPhys.innerText = totalPhys;
    },

    exportReport: function() {
        const list = this._companiesList || [];
        if (list.length === 0) {
            alert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ទេ!');
            return;
        }

        if (typeof ExcelJS === 'undefined') {
            alert('❌ Library ExcelJS មិនទាន់ផ្ទុក!');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Company Report');
            const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

            sheet.mergeCells('A1:E1');
            sheet.getCell('A1').value = 'របាយការណ៍បែងចែកតាមក្រុមហ៊ុន';
            sheet.getCell('A1').font = { name: 'Khmer OS Muol Light', size: 13, bold: true };
            sheet.getCell('A1').alignment = { horizontal: 'center' };

            const headers = ['ល.រ', 'ឈ្មោះក្រុមហ៊ុន', 'ទីតាំងសរុប', 'Digital Bill', 'Physical Bill'];
            const headerRow = sheet.getRow(3);
            headerRow.height = 25;
            headers.forEach((h, i) => {
                const cell = headerRow.getCell(i + 1);
                cell.value = h;
                cell.font = { name: 'Khmer OS Battambang', size: 10, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                cell.border = borderStyle;
            });

            list.forEach((item, idx) => {
                const row = sheet.getRow(idx + 4);
                const cells = [idx + 1, item.name, item.total, item.digital, item.physical];
                cells.forEach((val, cIdx) => {
                    const cell = row.getCell(cIdx + 1);
                    cell.value = val;
                    cell.font = { name: 'Khmer OS Battambang', size: 10 };
                    cell.alignment = { horizontal: (cIdx === 1) ? 'left' : 'center', vertical: 'middle' };
                    cell.border = borderStyle;
                });
            });

            sheet.getColumn(1).width = 6;
            sheet.getColumn(2).width = 30;
            sheet.getColumn(3).width = 15;
            sheet.getColumn(4).width = 15;
            sheet.getColumn(5).width = 15;

            workbook.xlsx.writeBuffer().then(buffer => {
                saveAs(new Blob([buffer]), `Company_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
                if (window.Utils?.showAlert) window.Utils.showAlert('✅ Export របាយការណ៍ជោគជ័យ!');
            });
        } catch (err) {
            alert('❌ Export បរាជ័យ៖ ' + err.message);
        }
    },

    importExcel: function(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // អានទិន្នន័យជាទម្រង់ Array ជួរដេកនិងឈរ (Row x Col)
                const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (aoa && aoa.length > 0) {
                    let updatedCount = 0;
                    let currentCompany = "";
                    let companyMapping = [];

                    // ១. ស្កេនរកឈ្មោះក្រុមហ៊ុន និងលេខ IN (Smart Extract)
                    for (let i = 0; i < aoa.length; i++) {
                        const row = aoa[i];
                        if (!row || row.length === 0) continue;

                        const col0 = String(row[0] || "").trim();
                        const col1 = String(row[1] || "").trim();

                        // បើជួរនោះមានពាក្យ "ក្រុមហ៊ុន" (តែមិនមែនពាក្យ "ស្ថាប័ន") វានឹងចាប់យកឈ្មោះក្រុមហ៊ុន
                        if (col0.includes('ក្រុមហ៊ុន') && !col0.includes('ស្ថាប័ន')) {
                            const parts = col0.split('ក្រុមហ៊ុន');
                            if (parts.length > 1) {
                                currentCompany = parts[parts.length - 1].trim();
                            }
                        } 
                        // បើមានឈ្មោះក្រុមហ៊ុនហើយ ជួរនោះមានលេខ IN វានឹងចងទិន្នន័យចូលគ្នា
                        else if (currentCompany && col1 && !isNaN(col1) && col1.length >= 6) {
                            companyMapping.push({ invoice: col1, company: currentCompany });
                        }
                    }

                    // (Fallback) បើទម្រង់ឯកសារផ្សេង ជាតារាងធម្មតា
                    if (companyMapping.length === 0) {
                        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                        json.forEach(row => {
                            const inv = row['លេខIN'] || row['IN'] || row['invoice'] || row['id'];
                            const comp = row['ក្រុមហ៊ុន'] || row['company'] || row['Company Name'];
                            if (inv && comp) {
                                companyMapping.push({ invoice: String(inv).trim(), company: String(comp).trim() });
                            }
                        });
                    }

                    // ២. យកទៅ Update ចូល Master Data
                    if (companyMapping.length > 0 && window.masterData && window.masterData.length > 0) {
                        companyMapping.forEach(mapping => {
                            const canonicalInv = window.Utils ? window.Utils.normalizeIN(mapping.invoice) : mapping.invoice;
                            const masterRow = window.masterData.find(r => 
                                (window.Utils ? window.Utils.normalizeIN(r.invoice) : String(r.invoice).trim()) === canonicalInv
                            );
                            
                            if (masterRow) {
                                masterRow.company = mapping.company;
                                updatedCount++;
                            }
                        });
                        
                        if (window.StorageEngine) window.StorageEngine.saveMasterCache();
                    }

                    if (window.Utils?.showAlert) {
                        window.Utils.showAlert(`✅ រកឃើញទិន្នន័យក្រុមហ៊ុន និងបាន Update ចំនួន ${updatedCount} ទីតាំង!`);
                    } else {
                        alert(`✅ រកឃើញទិន្នន័យក្រុមហ៊ុន និងបាន Update ចំនួន ${updatedCount} ទីតាំង!`);
                    }
                    
                    // ៣. បញ្ជាឱ្យគូររបាយការណ៍ថ្មី
                    this.generateFromMaster();
                }
            } catch (err) {
                console.error("Import Error:", err);
                alert('❌ មិនអាចអានហ្វាល់ Excel បានទេ! សូមពិនិត្យមើលទម្រង់ឯកសារ។');
            } finally {
                // Clear input value ដើម្បីអាច Import ហ្វាល់ដដែលបានម្តងទៀត
                const fileInput = document.getElementById('company-file-input');
                if (fileInput) fileInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }
};

// Auto Init
document.addEventListener('DOMContentLoaded', () => {
    if (window.CompanyReport) {
        window.CompanyReport.init();
    }
});
