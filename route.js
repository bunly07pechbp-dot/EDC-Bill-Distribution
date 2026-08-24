// ================================================================
// 🗺️ ROUTE ENGINE - Safe Route Building & Delivery State Sync
// ================================================================

window.RouteEngine = {
    processSequence: function() {
        console.log('🔄 RouteEngine.processSequence() called');
        
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលហ្វាល់ Excel ជាមុនសិនបង!");
            return false;
        }
        
        const inputText = document.getElementById('route-sequence').value.trim();
        if (!inputText) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលបញ្ជីលេខ IN តាមលំដាប់ផ្លូវដើរសិនបង!");
            return false;
        }

        const orderedIds = inputText.replace(/[\r\n,;\t]+/g, ' ').split(' ').map(id => id.trim()).filter(id => id);
        console.log('📋 Ordered IDs:', orderedIds.length);
        
        return this.buildExportData(orderedIds);
    },

    buildExportData: function(orderedIds, deliveryState = {}) {
        console.log('🔧 RouteEngine.buildExportData() called with', orderedIds.length, 'IDs');
        
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលហ្វាល់ Excel ជាមុនសិនបង!");
            return false;
        }

        window.currentExportData = [];
        const notFoundIds = [];
        const seenIds = new Set();

        orderedIds.forEach(id => {
            const matchedRow = window.Utils.findByInvoice(id);
            const state = deliveryState[String(id)];

            if (matchedRow) {
                const rowKey = String(matchedRow.invoice);
                if (!seenIds.has(rowKey)) {
                    if (state && state.completed) {
                        matchedRow.status = state.status;
                        matchedRow.method = state.method;
                        matchedRow.deliveredAt = state.deliveredAt;
                    }
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

        if (notFoundIds.length > 0) {
            const preview = notFoundIds.slice(0, 10).join(', ');
            const more = notFoundIds.length > 10 ? ` ...និង${notFoundIds.length - 10}ទៀត` : '';
            window.Utils.showAlert(`⚠️ ចំណាំ៖ រកមិនឃើញ ${notFoundIds.length} លេខ IN ក្នុង Excel៖ ${preview}${more}`);
        }

        console.log('✅ RouteEngine.buildExportData() completed successfully');
        return true;
    }
};

console.log('✅ RouteEngine loaded successfully');