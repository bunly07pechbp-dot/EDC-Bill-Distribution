// ================================================================
// 🗺️ ROUTE ENGINE - Ultra-Fast $O(1)$ Route Builder
// ================================================================

window.RouteEngine = {
    processSequence: function() {
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលហ្វាល់ Excel ជាមុនសិនបង!");
            return false;
        }
        
        const inputText = document.getElementById('route-sequence').value.trim();
        if (!inputText) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលបញ្ជីលេខ IN តាមលំដាប់ផ្លូវដើរសិនបង!");
            return false;
        }

        const orderedIds = inputText.replace(/[\r\n,;\t]+/g, ' ').split(' ').map(id => id.trim()).filter(Boolean);
        return this.buildExportData(orderedIds);
    },

    // ⚡ Super Fast $O(1)$ Hash Map Lookup
    buildExportData: function(orderedIds, deliveryState = {}) {
        if (!window.masterData || window.masterData.length === 0) {
            window.Utils.showAlert("⚠️ សូមបញ្ចូលហ្វាល់ Excel ជាមុនសិនបង!");
            return false;
        }

        // ប្រាកដថា masterDataIndex ត្រូវបានបង្កើតរួចរាល់
        if (!window.masterDataIndex || window.masterDataIndex.size === 0) {
            window.Utils.rebuildMasterIndex();
        }

        const masterIndex = window.masterDataIndex;
        const norm = window.Utils.normalizeIN;
        const resultData = [];
        const notFoundIds = [];
        const seenIds = new Set();

        for (let i = 0; i < orderedIds.length; i++) {
            const rawId = orderedIds[i];
            const canonicalId = norm(rawId);
            if (!canonicalId || seenIds.has(canonicalId)) continue;

            const matchedRow = masterIndex.get(canonicalId);
            if (matchedRow) {
                const state = deliveryState[canonicalId] || deliveryState[String(rawId)];
                if (state && state.completed) {
                    matchedRow.status = state.status;
                    matchedRow.method = state.method;
                    matchedRow.deliveredAt = state.deliveredAt;
                }
                resultData.push(matchedRow);
                seenIds.add(canonicalId);
            } else {
                notFoundIds.push(rawId);
            }
        }

        window.currentExportData = resultData;

        if (resultData.length === 0) {
            window.Utils.showAlert("⚠️ រកមិនឃើញលេខ IN ណាដែលត្រូវគ្នានឹង Excel ទេបង!");
            return false;
        }

        if (notFoundIds.length > 0) {
            const preview = notFoundIds.slice(0, 5).join(', ');
            const more = notFoundIds.length > 5 ? ` ...និង${notFoundIds.length - 5}ទៀត` : '';
            console.warn(`⚠️ រកមិនឃើញ ${notFoundIds.length} លេខ IN ក្នុង Excel៖ ${preview}${more}`);
        }

        return true;
    }
};

console.log('✅ Fast RouteEngine loaded successfully');
