// ================================================================
// 📤 EXPORT MODULE - Normal + Regular
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('btn-export-excel');
    if (exportBtn) {
        exportBtn.addEventListener('click', function(e) {
            if (window.isRegularJob) {
                e.preventDefault();
                e.stopPropagation();
                window.exportRegularReport();
                return;
            }
            // Normal export (existing logic)
            if (!window.currentExportData || window.currentExportData.length === 0) {
                window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export!');
                return;
            }
            
            if (typeof window.exportDefaultReport === 'function') {
                window.exportDefaultReport();
            } else {
                window.Utils.showAlert('⚠️ មុខងារ Export មិនទាន់ត្រូវបានផ្ទុក!');
            }
        });
    }
});

// ============================================================
// 🆕 EXPORT REGULAR REPORT (បន្ថែមវិធីចែក)
// ============================================================
window.exportRegularReport = function() {
    const data = window.currentExportData || [];
    if (data.length === 0) {
        window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export!');
        return;
    }

    if (typeof ExcelJS === 'undefined') {
        window.Utils.showAlert('❌ Library ExcelJS មិនត្រូវបានផ្ទុក!');
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sheet1');

        // ============================================================
        // HEADER (ដូច Regular.xlsx)
        // ============================================================
        worksheet.mergeCells('G1:H1');
        worksheet.getCell('G1').value = 'ព្រះរាជាណាចក្រកម្ពុជា';
        worksheet.getCell('G1').font = { name: 'Khmer OS Muol Light', size: 11 };
        worksheet.getCell('G1').alignment = { horizontal: 'center' };

        worksheet.getCell('A2').value = 'អគ្គិសនីកម្ពុជា';
        worksheet.getCell('A2').font = { name: 'Khmer OS Muol Light', size: 11 };
        worksheet.mergeCells('G2:H2');
        worksheet.getCell('G2').value = 'ជាតិ    សាសនា​    ព្រះមហាក្សត្រ';
        worksheet.getCell('G2').font = { name: 'Khmer OS Muol Light', size: 11 };
        worksheet.getCell('G2').alignment = { horizontal: 'center' };

        worksheet.getCell('A3').value = 'នាយកដ្ឋានអាជីវកម្មចែកចាយ';
        worksheet.getCell('A3').font = { name: 'Khmer OS Battambang', size: 11 };
        worksheet.getCell('A4').value = 'សាខាអូរដឹម';
        worksheet.getCell('A4').font = { name: 'Khmer OS Battambang', size: 11 };
        worksheet.getCell('A5').value = 'ផ្នែកវិក្កយបត្រ';
        worksheet.getCell('A5').font = { name: 'Khmer OS Battambang', size: 11 };

        worksheet.mergeCells('C6:D6');
        worksheet.getCell('C6').value = 'របាយការណ៏ចែកវិក្កយបត្រ REGULAR';
        worksheet.getCell('C6').font = { name: 'Khmer OS Muol Light', size: 14, bold: true };
        worksheet.getCell('C6').alignment = { horizontal: 'center' };

        worksheet.getCell('A7').value = 'ភ្នាក់ងារចែកវិក្កយបត្រៈ ប៉ិច ប៊ុនលី';
        worksheet.getCell('A7').font = { name: 'Khmer OS Battambang', size: 11, bold: true };
        worksheet.getCell('E7').value = 'ថ្ងៃចេញវិក្កយបត្រៈ';
        worksheet.getCell('E7').font = { name: 'Khmer OS Battambang', size: 11, bold: true };
        worksheet.getCell('G7').value = 'ថ្ងៃផុតកំណត់ៈ';
        worksheet.getCell('G7').font = { name: 'Khmer OS Battambang', size: 11, bold: true };

        // ============================================================
        // TABLE HEADER - 🆕 បន្ថែម "វិធីចែក"
        // ============================================================
        const headers = ['ល.រ', 'ប.ត', 'លេខ IN', 'ឈ្មោះអតិថិជន', 'អាសយដ្ឋាន', 'ម៉ោងទទួល', 'ឈ្មោះអ្នកទទួល', 'ហត្ថលេខា', 'វិធីចែក'];
        const headerRow = worksheet.getRow(8);
        headerRow.height = 30;
        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { name: 'Khmer OS Battambang', size: 11, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = borderStyle;
        });

        // ============================================================
        // DATA - 🆕 បន្ថែមវិធីចែក
        // ============================================================
        data.forEach((row, index) => {
            const rowNum = worksheet.getRow(9 + index);
            
            // 🆕 ទាញយកវិធីចែក
            const methodStr = row.method || '';
            const methodLabels = {
                digital: 'Digital',
                box: 'ប្រអប់',
                door: 'ទ្វារ',
                owner: 'ម្ចាស់',
                neighbor: 'អ្នកជិតខាង',
                suspended: '⏸️ ផ្អាកប្រើ'
            };
            let methodDisplay = '';
            if (methodStr) {
                methodDisplay = methodStr.split(',').map(m => methodLabels[m.trim()] || m.trim()).join(' + ');
            }
            
            const cells = [
                index + 1,
                row.box || row._regularBox || '',
                row.invoice || row._regularInvoice || '',
                row.name || row._regularName || '',
                row.address || row._regularAddress || '',
                row.regularReceivedTime || '',
                row.regularReceiverName || '',
                row.regularSignature || '',
                methodDisplay
            ];
            
            cells.forEach((val, colIdx) => {
                const cell = rowNum.getCell(colIdx + 1);
                cell.value = val;
                cell.font = { name: 'Khmer OS Battambang', size: 10 };
                cell.alignment = { 
                    horizontal: (colIdx === 3 || colIdx === 4) ? 'left' : 'center', 
                    vertical: 'middle',
                    wrapText: true
                };
                cell.border = borderStyle;
            });
        });

        // ============================================================
        // SUMMARY & FOOTER
        // ============================================================
        const summaryRow = worksheet.getRow(9 + data.length + 1);
        worksheet.mergeCells(`C${9 + data.length + 1}:D${9 + data.length + 1}`);
        summaryRow.getCell(3).value = `សរុបចំនួនវិក្កយបត្រៈ ${data.length}`;
        summaryRow.getCell(3).font = { name: 'Khmer OS Battambang', size: 11, bold: true };
        summaryRow.getCell(3).alignment = { horizontal: 'center' };

        const footerRow = worksheet.getRow(9 + data.length + 3);
        worksheet.mergeCells(`E${9 + data.length + 3}:H${9 + data.length + 3}`);
        footerRow.getCell(5).value = `បានចែករួចនៅថ្ងៃទី ${String(new Date().getDate()).padStart(2, '0')} ខែ ${String(new Date().getMonth() + 1).padStart(2, '0')} ឆ្នាំ ២០${String(new Date().getFullYear()).slice(2)}`;
        footerRow.getCell(5).font = { name: 'Khmer OS Battambang', size: 11 };
        footerRow.getCell(5).alignment = { horizontal: 'center' };

        const signRow = worksheet.getRow(9 + data.length + 5);
        worksheet.mergeCells(`E${9 + data.length + 5}:H${9 + data.length + 5}`);
        signRow.getCell(5).value = 'ភ្នាក់ងារចែកវិក្កយបត្រៈ ប៉ិច ប៊ុនលី';
        signRow.getCell(5).font = { name: 'Khmer OS Battambang', size: 11, bold: true };
        signRow.getCell(5).alignment = { horizontal: 'center' };

        // Column widths
        worksheet.getColumn(1).width = 8;
        worksheet.getColumn(2).width = 14;
        worksheet.getColumn(3).width = 20;
        worksheet.getColumn(4).width = 28;
        worksheet.getColumn(5).width = 30;
        worksheet.getColumn(6).width = 16;
        worksheet.getColumn(7).width = 20;
        worksheet.getColumn(8).width = 18;
        worksheet.getColumn(9).width = 18; // 🆕 វិធីចែក

        workbook.xlsx.writeBuffer().then(function(buffer) {
            const dateStr = window.Utils.formatDate(new Date()).replace(/\//g, '-');
            saveAs(new Blob([buffer]), `Regular_Report_${dateStr}.xlsx`);
            window.Utils.showAlert('✅ Export Regular Report រួចរាល់!');
        }).catch(function(err) {
            console.error('❌ Export error:', err);
            window.Utils.showAlert('❌ Export បរាជ័យ! ' + err.message);
        });

    } catch (err) {
        console.error('❌ Export error:', err);
        window.Utils.showAlert('❌ Export បរាជ័យ! ' + err.message);
    }
};

// ============================================================
// DEFAULT EXPORT (Normal Jobs)
// ============================================================
window.exportDefaultReport = function() {
    if (!window.currentExportData || window.currentExportData.length === 0) {
        window.Utils.showAlert('⚠️ គ្មានទិន្នន័យសម្រាប់ Export!');
        return;
    }
    
    let defaultCabinName = window.currentCabinGlobal;

    const namePrompt = prompt("សូមបញ្ចូលឈ្មោះហ្វាល់របាយការណ៍៖", `EDC_Report_${defaultCabinName}`);
    if (namePrompt === null) return;
    const cabinPrompt = prompt("សូមបញ្ចូលឈ្មោះកាប៊ីន៖", defaultCabinName);
    if (cabinPrompt === null) return;
    const sessionPrompt = prompt("សូមបញ្ចូលវគ្គស្រង់ថ្ងៃទី៖", "24");
    if (sessionPrompt === null) return;
    const agentPrompt = prompt("សូមបញ្ចូលឈ្មោះភ្នាក់ងារចែកវិក្កយបត្រ៖", "ប៉ិច ប៊ុនលី");
    if (agentPrompt === null) return;

    let fileName = namePrompt.trim() || `EDC_Report_${defaultCabinName}`;
    let cabinInput = cabinPrompt.trim() || defaultCabinName;
    let sessionDate = sessionPrompt.trim() || "24";
    let agentName = agentPrompt.trim() || "ប៉ិច ប៊ុនលី";

    fileName = fileName.replace(".xlsx", "") + ".xlsx";
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1', { 
        pageSetup: { paperSize: 9, orientation: 'landscape' }, 
        properties: { defaultRowHeight: 22 } 
    });

    worksheet.columns = [
        { width: 6 }, { width: 9 }, { width: 12 }, { width: 14 }, 
        { width: 25 }, { width: 35 }, { width: 12 }, { width: 12 }, 
        { width: 10 }, { width: 14 }, { width: 15 }, { width: 12 }
    ];
    
    const fontMuol = { name: 'Khmer OS Muol Light', size: 11 };
    const fontMuolTitle = { name: 'Khmer OS Muol Light', size: 14, bold: true };
    const fontBattambang = { name: 'Khmer OS Battambang', size: 11 };
    const fontBattambangBold = { name: 'Khmer OS Battambang', size: 11, bold: true };
    const borderStyle = { 
        top: { style: 'thin' }, left: { style: 'thin' }, 
        bottom: { style: 'thin' }, right: { style: 'thin' } 
    };

    for(let i = 0; i < 7; i++) worksheet.addRow([]);
    worksheet.getCell('K1').value = 'ព្រះរាជាណាចក្រកម្ពុជា';
    worksheet.getCell('K1').font = fontMuol;
    worksheet.getCell('K1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').value = 'អគ្គិសនីកម្ពុជា';
    worksheet.getCell('A2').font = fontMuol;
    worksheet.mergeCells('K2:L2');
    worksheet.getCell('K2').value = 'ជាតិ    សាសនា​    ព្រះមហាក្សត្រ';
    worksheet.getCell('K2').font = fontMuol;
    worksheet.getCell('K2').alignment = { horizontal: 'center' };
    worksheet.getCell('A3').value = 'នាយកដ្ឋានអាជីវកម្មចែកចាយ';
    worksheet.getCell('A3').font = fontBattambang;
    worksheet.getCell('A4').value = 'សាខាអូរដឹម';
    worksheet.getCell('A4').font = fontBattambang;
    worksheet.getCell('A5').value = 'ផ្នែកវិក្កយបត្រ';
    worksheet.getCell('A5').font = fontBattambang;
    worksheet.getCell('A6').value = `កាប៊ីនៈ${cabinInput}`;
    worksheet.getCell('A6').font = fontBattambangBold;
    worksheet.mergeCells('E6:F6');
    worksheet.getCell('E6').value = 'របាយការណ៏ចែកតាមផ្លូវជាក់ស្តែង';
    worksheet.getCell('E6').font = fontMuolTitle;
    worksheet.getCell('E6').alignment = { horizontal: 'center' };
    worksheet.getCell('G6').value = `វគ្គស្រង់ថ្ងៃទីៈ${sessionDate}`;
    worksheet.getCell('G6').font = fontBattambangBold;
    worksheet.getCell('L6').value = agentName;
    worksheet.getCell('L6').font = fontBattambangBold;
    worksheet.getCell('L6').alignment = { horizontal: 'right' };

    const headers = ['ល.រ', 'កាប៊ីន', 'ប្រអប់', 'លេខIN', 'ឈ្មោះអតិថិជន', 'អាសយដ្ឋាន', 'DIGITAL BILL', 'ប្រអប់សំបុត្រ', 'សៀតទ្វា', 'ឲ្យម្ចាស់ផ្ទាល់', 'ផ្ញើរអ្នកជិតខាង', 'ផ្សេងៗ'];
    const headerRow = worksheet.getRow(7);
    headerRow.height = 30;
    headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = fontBattambangBold;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = borderStyle;
    });

    window.currentExportData.forEach((row, index) => {
        let added = worksheet.addRow([
            index + 1, row.cabin, row.box, row.invoice, row.name, row.address,
            window.Utils.hasMethod(row.method, 'digital') ? '✓' : '',
            window.Utils.hasMethod(row.method, 'box') ? '✓' : '',
            window.Utils.hasMethod(row.method, 'door') ? '✓' : '',
            window.Utils.hasMethod(row.method, 'owner') ? '✓' : '',
            window.Utils.hasMethod(row.method, 'neighbor') ? '✓' : '',
            ''
        ]);
        added.eachCell((cell, colNum) => {
            cell.font = fontBattambang;
            cell.border = borderStyle;
            if (colNum === 5 || colNum === 6) { 
                cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }; 
            } else { 
                cell.alignment = { horizontal: 'center', vertical: 'middle' }; 
            }
            if (cell.value === "✓") cell.font = { name: 'Khmer OS Battambang', size: 12, bold: true };
        });
    });

    workbook.xlsx.writeBuffer().then(buffer => {
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    }).catch(err => {
        console.error('❌ Export error:', err);
        window.Utils.showAlert("❌ ការបង្កើតឯកសារ Excel បរាជ័យ!");
    });
};