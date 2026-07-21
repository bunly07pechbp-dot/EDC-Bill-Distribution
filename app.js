// ==========================================================================
// 🚀 App Entry Point
// ==========================================================================

window.masterData = [];
window.currentExportData = [];
window.currentCabinGlobal = "Unknown";

// ==========================================================================
// 📱 PWA Service Worker Registration - បិទសម្រាប់ local file
// ==========================================================================
// ❌ បិទ Service Worker ដំណោះស្រាយបញ្ហា CORS លើ file://
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('🎯 PWA Offline System Active!', reg.scope))
            .catch(err => console.error('❌ PWA Error:', err));
    });
}
*/

// ==========================================================================
// 🚀 DOM Ready - Initialize All Modules
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 EDC Route Billing System Starting...');

    // 1. Archive Engine
    if (window.ArchiveEngine) {
        window.ArchiveEngine.init();
        console.log('✅ Archive Engine initialized');
    }

    // 2. Clear Memory Button
    const clearMemoryBtn = document.getElementById('btn-clear-memory');
    if (clearMemoryBtn) {
        clearMemoryBtn.addEventListener('click', () => {
            if (confirm('🧹 តើអ្នកចង់សម្អាត Memory និងទិន្នន័យបណ្តោះអាសន្នទាំងអស់មែនទេ?\n\n⚠️ ទិន្នន័យ Master Database នឹងមិនរងផលប៉ះពាល់ទេ។')) {
                if (window.UI && typeof window.UI.clearAllData === 'function') {
                    window.UI.clearAllData();
                    if (window.gc) {
                        try { window.gc(); } catch (e) { /* ignore */ }
                    }
                    window.Utils.showAlert('✅ បានសម្អាត Memory និងទិន្នន័យបណ្តោះអាសន្នរួចរាល់!');
                } else {
                    window.Utils.showAlert('⚠️ មុខងារសម្អាត Memory មិនទាន់ត្រូវបានផ្ទុកទេ។');
                }
            }
        });
        console.log('✅ Clear Memory Button initialized');
    }

    console.log('✅ All modules initialized');
});

// ==========================================================================
// 🛡️ Global Error Handler
// ==========================================================================
window.addEventListener('error', (e) => {
    console.error('❌ Global Error:', e.message, e.filename, e.lineno);
    if (e.message && e.message.includes('out of memory')) {
        window.Utils.showAlert('⚠️ ឧបករណ៍របស់អ្នកកំពុងដំណើរការលើសទំហំ Memory!\n\nសូមចុច "🧹 សម្អាត Memory" ដើម្បីដោះស្រាយបញ្ហា។');
    }
});

// ==========================================================================
// 🛡️ Unhandled Promise Rejection Handler
// ==========================================================================
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
});

console.log('📦 EDC Route Billing System loaded successfully!');