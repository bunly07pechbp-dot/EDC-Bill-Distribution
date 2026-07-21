// ==========================================================================
// 📊 REPORTS ENGINE (Phase 6 – Integrated with StorageEngine)
// --------------------------------------------------------------------------
// Deep Analytics Reporting & Standard Formal Report Export.
// Compatible with ExcelJS, FileSaver, and Mobile Browsers.
// ==========================================================================

window.ReportsEngine = {
    _initialized: false,

    init: function() {
        if (this._initialized) return;
        console.log('📊 Reports Engine initializing...');
        this._initialized = true;
        this.bindEvents();
    },

    bindEvents: function() {
        const exportMonthlyBtn = document.getElementById('btn-export-monthly-report');
        const exportAnalyticsBtn = document.getElementById('btn-export-analytics-excel');
        
        if (exportMonthlyBtn) {
            exportMonthlyBtn.addEventListener('click', () => this.exportMonthlyReport());
        }
        if (exportAnalyticsBtn) {
            exportAnalyticsBtn.addEventListener('click', () => this.exportAnalyticsExcel());
        }
    },

    // ============================================================
    // 1. GENERATE MONTHLY ANALYTICS
    // ============================================================
    generateMonthlyAnalytics: function() {
        const data = window.masterData || [];
        const activeData = data.filter(customer => {
            const status = String(customer.status || '').trim();
            return status !== 'ឈប់ប្រើ' && status !== 'បានលុប';
        });

        let totalActive = activeData.length;
        let totalDelivered = 0;
        let totalDigital = 0;
        let totalPhysical = 0;
        let totalSuspended = 0;

        const cabinBreakdown = {};

        activeData.forEach(row => {
            const cabin = row.cabin || 'Unknown';
            if (!cabinBreakdown[cabin]) {
                cabinBreakdown[cabin] = { total: 0, delivered: 0, digital: 0, physical: 0, pending: 0 };
            }

            cabinBreakdown[cabin].total++;

            const isDone = row.status === 'បានចែករួចរាល់';
            const isSusp = row.status === 'ផ្អាកប្រើ' || window.Utils?.hasMethod(row.method, 'suspended');
            const isDigital = window.Utils?.hasMethod(row.method, 'digital');

            if (isDone || isSusp) {
                totalDelivered++;
                cabinBreakdown[cabin].delivered++;
            } else {
                cabinBreakdown[cabin].pending++;
            }

            if (isSusp) totalSuspended++;

            if (isDigital) {
                totalDigital++;
                cabinBreakdown[cabin].digital++;
            } else if (isDone) {
                totalPhysical++;
                cabinBreakdown[cabin].physical++;
            }
        });

        const overallProgress = totalActive > 0 ? Math.round((totalDelivered / totalActive) * 100) : 0;
        const digitalRatio = totalDelivered > 0 ? Math.round((totalDigital / totalDelivered) * 100) : 0;

        return {
            totalActive,
            totalDelivered,
            totalPending: Math.max(0, totalActive - totalDelivered),
            totalDigital,
            totalPhysical,
            totalSuspended,
            overallProgress,
            digitalRatio,
            cabinBreakdown
        };
    },

    // ============================================================
    // 2. EXPORT MONTHLY REPORT (Formal Excel)
    // ============================================================
    exportMonthlyReport: function() {
        const analytics = this.generateMonthlyAnalytics();
        if (analytics.totalActive === 0) {
            window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់បង្កើតរបាយការណ៍!');
            return;
        }

        if (typeof ExcelJS === 'undefined') {
            window.Utils.showAlert('❌ Library ExcelJS មិនត្រូវបានផ្ទុក!');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Monthly Report');

            // Title
            sheet.mergeCells('A1:F1');
            sheet.getCell('A1').value = 'របាយការណ៍ប្រចាំខែ - EDC Distribution';
            sheet.getCell('A1').font = { name: 'Khmer OS Muol Light', size: 14, bold: true };
            sheet.getCell('A1').alignment = { horizontal: 'center' };

            sheet.addRow([]);

            // Summary
            const summaryData = [
                ['សូចនាករ', 'តម្លៃ'],
                ['ចំនួនអតិថិជនសរុប', analytics.totalActive],
                ['បានចែករួច', analytics.totalDelivered],
                ['នៅសល់', analytics.totalPending],
                ['Digital Bill', analytics.totalDigital],
                ['Physical Bill', analytics.totalPhysical],
                ['ភាគរយចែកដាច់', `${analytics.overallProgress}%`],
                ['ភាគរយ Digital', `${analytics.digitalRatio}%`]
            ];

            summaryData.forEach((row, idx) => {
                const rowNum = sheet.getRow(idx + 3);
                rowNum.getCell(1).value = row[0];
                rowNum.getCell(2).value = row[1];
                rowNum.getCell(1).font = { name: 'Khmer OS Battambang', bold: true };
                rowNum.getCell(2).font = { name: 'Khmer OS Battambang' };
            });

            sheet.addRow([]);

            // Cabin Breakdown
            const headerRow = sheet.addRow(['កាប៊ីន', 'សរុប', 'បានចែក', 'នៅសល់', 'Digital', 'Physical']);
            headerRow.font = { name: 'Khmer OS Battambang', bold: true };
            headerRow.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            Object.entries(analytics.cabinBreakdown).forEach(([cabin, stats]) => {
                const row = sheet.addRow([
                    cabin,
                    stats.total,
                    stats.delivered,
                    stats.pending,
                    stats.digital,
                    stats.physical
                ]);
                row.eachCell(c => {
                    c.font = { name: 'Khmer OS Battambang' };
                    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            sheet.columns.forEach(col => col.width = 20);

            workbook.xlsx.writeBuffer().then((buffer) => {
                const dateStr = new Date().toISOString().slice(0, 10);
                saveAs(new Blob([buffer]), `Monthly_Report_${dateStr}.xlsx`);
                window.Utils.showAlert('✅ Export Monthly Report រួចរាល់!');
            });

        } catch (err) {
            console.error('❌ Export error:', err);
            window.Utils.showAlert('❌ Export បរាជ័យ: ' + err.message);
        }
    },

    // ============================================================
    // 3. EXPORT ANALYTICS EXCEL
    // ============================================================
    exportAnalyticsExcel: function() {
        // Same as exportMonthlyReport but with "Analytics" naming
        const analytics = this.generateMonthlyAnalytics();
        if (analytics.totalActive === 0) {
            window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់បង្កើតរបាយការណ៍!');
            return;
        }

        if (typeof ExcelJS === 'undefined') {
            window.Utils.showAlert('❌ Library ExcelJS មិនត្រូវបានផ្ទុក!');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Analytics');

            // Title
            sheet.mergeCells('A1:F1');
            sheet.getCell('A1').value = 'របាយការណ៍វិភាគទិន្នន័យ - EDC Distribution';
            sheet.getCell('A1').font = { name: 'Khmer OS Muol Light', size: 14, bold: true };
            sheet.getCell('A1').alignment = { horizontal: 'center' };

            sheet.addRow([]);

            // Summary
            const summaryData = [
                ['សូចនាករ', 'តម្លៃ'],
                ['ចំនួនអតិថិជនសរុប', analytics.totalActive],
                ['បានចែករួច', analytics.totalDelivered],
                ['នៅសល់', analytics.totalPending],
                ['Digital Bill', analytics.totalDigital],
                ['Physical Bill', analytics.totalPhysical],
                ['ភាគរយចែកដាច់', `${analytics.overallProgress}%`],
                ['ភាគរយ Digital', `${analytics.digitalRatio}%`]
            ];

            summaryData.forEach((row, idx) => {
                const rowNum = sheet.getRow(idx + 3);
                rowNum.getCell(1).value = row[0];
                rowNum.getCell(2).value = row[1];
                rowNum.getCell(1).font = { name: 'Khmer OS Battambang', bold: true };
                rowNum.getCell(2).font = { name: 'Khmer OS Battambang' };
            });

            sheet.addRow([]);

            // Cabin Breakdown
            const headerRow = sheet.addRow(['កាប៊ីន', 'សរុប', 'បានចែក', 'នៅសល់', 'Digital', 'Physical']);
            headerRow.font = { name: 'Khmer OS Battambang', bold: true };
            headerRow.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            Object.entries(analytics.cabinBreakdown).forEach(([cabin, stats]) => {
                const row = sheet.addRow([
                    cabin,
                    stats.total,
                    stats.delivered,
                    stats.pending,
                    stats.digital,
                    stats.physical
                ]);
                row.eachCell(c => {
                    c.font = { name: 'Khmer OS Battambang' };
                    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            sheet.columns.forEach(col => col.width = 20);

            workbook.xlsx.writeBuffer().then((buffer) => {
                const dateStr = new Date().toISOString().slice(0, 10);
                saveAs(new Blob([buffer]), `Analytics_Report_${dateStr}.xlsx`);
                window.Utils.showAlert('✅ Export Analytics Report រួចរាល់!');
            });

        } catch (err) {
            console.error('❌ Export error:', err);
            window.Utils.showAlert('❌ Export បរាជ័យ: ' + err.message);
        }
    }
};

// ---- Auto-init ----
document.addEventListener('DOMContentLoaded', function() {
    if (window.ReportsEngine && typeof window.ReportsEngine.init === 'function') {
        window.ReportsEngine.init();
    }
});