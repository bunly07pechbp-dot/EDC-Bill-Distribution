// ================================================================
// 🗺️ ROUTE ENGINE - កំណែជួសជុល (មិនប៉ះពាល់មុខងារផ្សេង)
// ================================================================

window.RouteEngine = {
    // 🧭 ដំណើរការចម្បង៖ អានប្រអប់លំដាប់ផ្លូវដើរ (route-sequence textarea) ហើយហៅ buildExportData()
    processSequence: function() {
        console.log('🔄 RouteEngine.processSequence() called');
        
        // 1. ពិនិត្យ Master Data
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលហ្វាល់ Excel ជាមុនសិនបង!");
            return false;
        }
        
        // 2. អានតម្លៃពី textarea
        const inputText = document.getElementById('route-sequence').value.trim();
        if (!inputText) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលបញ្ជីលេខ IN តាមលំដាប់ផ្លូវដើរសិនបង!");
            return false;
        }

        // 3. ច្រោះលេខ IN
        const orderedIds = inputText.replace(/[\r\n,;\t]+/g, ' ').split(' ').map(id => id.trim()).filter(id => id);
        console.log('📋 Ordered IDs:', orderedIds.length);
        
        // 4. ហៅ buildExportData
        return this.buildExportData(orderedIds);
    },

    // 🔧 Logic ស្នូល (ដកចេញពី processSequence ដើម ដោយមិនផ្លាស់ប្តូរឥរិយាបថ)
    buildExportData: function(orderedIds) {
        console.log('🔧 RouteEngine.buildExportData() called with', orderedIds.length, 'IDs');
        
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលហ្វាល់ Excel ជាមុនសិនបង!");
            return false;
        }

        window.currentExportData = [];

        // ច្រោះយកតែផ្ទះណាដែលមានក្នុងលំដាប់ផ្លូវដើរ
        const notFoundIds = [];
        const seenIds = new Set();
        orderedIds.forEach(id => {
            const matchedRow = window.Utils.findByInvoice(id);
            if (matchedRow) {
                const rowKey = String(matchedRow.invoice);
                if (!seenIds.has(rowKey)) {
                    window.currentExportData.push(matchedRow);
                    seenIds.add(rowKey);
                }
            } else {
                notFoundIds.push(id);
            }
        });

        console.log('✅ Matched:', window.currentExportData.length, 'Not found:', notFoundIds.length);

        if (window.currentExportData.length === 0) {
            window.Utils.showAlert("⚠️ រកមិនឃើញលេខ IN ណាដែលត្រូវគ្នានឹង Excel ទេបង!");
            return false;
        }

        // ⚠️ ប្រាប់អ្នកប្រើប្រាស់ បើលេខ IN ខ្លះមិនត្រូវនឹង Excel
        if (notFoundIds.length > 0) {
            const preview = notFoundIds.slice(0, 10).join(', ');
            const more = notFoundIds.length > 10 ? ` ...និង${notFoundIds.length - 10}ទៀត` : '';
            window.Utils.showAlert(`⚠️ ចំណាំ៖ រកមិនឃើញ ${notFoundIds.length} លេខ IN ក្នុង Excel៖ ${preview}${more}`);
        }

        // 🔁 បើផ្ទះណាមួយក្នុងផ្លូវនេះធីក "បានចែករួចរាល់" ស្រាប់
        const doneRows = window.currentExportData.filter(r => r.status === "បានចែករួចរាល់");
        if (doneRows.length > 0) {
            const wantsReset = confirm(
                `🔁 រកឃើញ ${doneRows.length} ផ្ទះ ក្នុងផ្លូវនេះ ដែលធីក "បានចែករួចរាល់" ស្រាប់។\n\n` +
                `តើនេះជាការចែកជុំថ្មី (ខែថ្មី) សម្រាប់ផ្ទះទាំងនេះមែនទេ?\n\n` +
                `✅ OK = ចាប់ផ្តើមជុំថ្មី (Reset ស្ថានភាពទាំង ${doneRows.length} ជួរនេះទៅជា "មិនទាន់ចែក")\n` +
                `❌ Cancel = រក្សាទុកស្ថានភាពចាស់ដដែល`
            );
            if (wantsReset) {
                doneRows.forEach(r => {
                    r.status = "មិនទាន់ចែក";
                    r.method = "";
                    delete r.deliveredAt;
                });
                window.StorageEngine.saveMasterCache();
                console.log('🔄 Reset', doneRows.length, 'rows');
            }
        }

        console.log('✅ RouteEngine.buildExportData() completed successfully');
        return true;
    }
};

console.log('✅ RouteEngine loaded successfully');