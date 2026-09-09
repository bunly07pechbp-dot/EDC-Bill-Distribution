// ==========================================================================
// 🚀 App Entry Point
// ==========================================================================

window.masterData = [];
window.currentExportData = [];
window.currentCabinGlobal = "Unknown";

// ==========================================================================
// 📱 PWA Service Worker Registration - បិទសម្រាប់ local file
// ==========================================================================
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

    // ==========================================================================
    // 📱 3. មុខងារលោតផ្ទាំងបញ្ជីឈ្មោះ Digital (រូបមន្ត Smart Target ដោះស្រាយចុចមិនចេញ)
    // ==========================================================================
    const digitalModalHtml = `
        <div class="method-picker-overlay" id="digital-list-modal" style="display:none; z-index: 99999;">
            <div class="method-picker-sheet" style="max-width: 600px; max-height: 85vh; display: flex; flex-direction: column; padding-bottom: 20px;">
                <div class="method-picker-handle"></div>
                <div class="method-picker-header">
                    <span>📱 បញ្ជីឈ្មោះ Digital (<span id="digital-list-count">0</span>)</span>
                    <button type="button" class="method-picker-close" id="digital-list-close">✕</button>
                </div>
                <div style="overflow-y: auto; flex-grow: 1; margin-top: 10px;">
                    <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 13px;">
                        <thead style="position: sticky; top: 0; background: var(--bg-card, #1e293b); box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: var(--text-secondary, #94a3b8);">
                            <tr>
                                <th style="padding: 10px 8px; border-bottom: 2px solid var(--border, #334155); width: 40px;">ល.រ</th>
                                <th style="padding: 10px 8px; border-bottom: 2px solid var(--border, #334155);">លេខ IN</th>
                                <th style="padding: 10px 8px; border-bottom: 2px solid var(--border, #334155);">ឈ្មោះអតិថិជន</th>
                                <th style="padding: 10px 8px; border-bottom: 2px solid var(--border, #334155);">ប.ត</th>
                            </tr>
                        </thead>
                        <tbody id="digital-list-tbody" style="color: var(--text, #f8fafc);">
                            <!-- ទិន្នន័យនឹងលោតចូលទីនេះ -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', digitalModalHtml);

    const digitalModal = document.getElementById('digital-list-modal');
    const closeBtn = document.getElementById('digital-list-close');

    if (digitalModal && closeBtn) {
        const closeModal = () => {
            digitalModal.classList.remove('active');
            setTimeout(() => digitalModal.style.display = 'none', 300);
        };
        closeBtn.addEventListener('click', closeModal);
        digitalModal.addEventListener('click', (e) => {
            if (e.target.id === 'digital-list-modal') closeModal();
        });
    }

    // 🚀 ការចាប់ចំណុចចុច (Smart Target) ធានាថា ១០០% ស្គាល់កាត Digital
    document.body.addEventListener('click', (e) => {
        let targetEl = e.target;
        
        // រាវរកឡើងលើ (Parent) ដើម្បីឆែកមើលថាវាជាកាតឬអត់
        while (targetEl && targetEl !== document.body) {
            // អានអក្សរទាំងអស់ដែលមានក្នុងប្រអប់ដែលគេកំពុងចុច
            let text = targetEl.textContent || '';
            text = text.toUpperCase();
            
            // លក្ខខណ្ឌឆ្លាតវៃ៖ បើប្រអប់នេះមានអក្សរតិចជាង ៥០ តួ ហើយមានពាក្យ "DIGITAL" 
            // មានន័យថាវាគឺជា "កាត Digital" ពិតប្រាកដ (ទប់មិនឱ្យវាច្រឡំជាមួយទំព័រទាំងមូល)
            if (text.includes('DIGITAL') && text.length < 50 && !text.includes('DELIVERED') && !text.includes('PENDING')) {
                
                e.preventDefault();
                e.stopPropagation();

                // ១. ទាញយកទិន្នន័យ Digital ពី Master Data
                const digitalData = (window.masterData || []).filter(r => 
                    r.method && r.method.toLowerCase().includes('digital')
                );

                document.getElementById('digital-list-count').innerText = digitalData.length;
                const tbody = document.getElementById('digital-list-tbody');

                if (digitalData.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-secondary);">📭 មិនទាន់មានអតិថិជន Digital ទេនៅក្នុងទិន្នន័យរួម</td></tr>';
                } else {
                    tbody.innerHTML = digitalData.map((r, i) => `
                        <tr style="border-bottom: 1px solid var(--border, #334155);">
                            <td style="padding: 10px 8px; color: var(--text-secondary, #94a3b8); text-align: center;">${i + 1}</td>
                            <td style="padding: 10px 8px; font-family: monospace;"><strong>${r.invoice || r.houseNumber || ''}</strong></td>
                            <td style="padding: 10px 8px;">${r.name || r.customerName || 'N/A'}</td>
                            <td style="padding: 10px 8px; color: #ea580c; font-weight: bold;">${r.box || r.boxNumber || 'N/A'}</td>
                        </tr>
                    `).join('');
                }

                // ២. បង្ហាញ Modal ឡើង
                if (digitalModal) {
                    digitalModal.style.display = 'flex';
                    setTimeout(() => digitalModal.classList.add('active'), 10);
                }
                return; // បញ្ឈប់ Loop
            }
            targetEl = targetEl.parentElement;
        }
    });

    console.log('✅ Digital List feature initialized with Smart Targeting');
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
