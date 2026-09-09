// ==========================================================================
// 🚀 App Entry Point
// ==========================================================================

window.masterData = [];
window.currentExportData = [];
window.currentCabinGlobal = "Unknown";

// ==========================================================================
// 🚀 មុខងារបើកផ្ទាំងបញ្ជីឈ្មោះ Digital (Global Function)
// ==========================================================================
window.openDigitalModal = function() {
    const digitalModal = document.getElementById('digital-list-modal');
    if (!digitalModal) return;

    // ១. ទាញយកទិន្នន័យ Digital ពី Master Data
    const digitalData = (window.masterData || []).filter(r => 
        r.method && r.method.toLowerCase().includes('digital')
    );

    // ២. បញ្ចូលតួលេខ និងគូរតារាង
    document.getElementById('digital-list-count').innerText = digitalData.length;
    const tbody = document.getElementById('digital-list-tbody');

    if (digitalData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-secondary);">📭 មិនទាន់មានអតិថិជន Digital ទេនៅក្នុងទិន្នន័យរួម</td></tr>';
    } else {
        tbody.innerHTML = digitalData.map((r, i) => `
            <tr style="border-bottom: 1px solid var(--border, #334155); transition: background 0.2s;">
                <td style="padding: 10px 8px; color: var(--text-secondary, #94a3b8); text-align: center;">${i + 1}</td>
                <td style="padding: 10px 8px; font-family: monospace;"><strong>${r.invoice || r.houseNumber || ''}</strong></td>
                <td style="padding: 10px 8px;">${r.name || r.customerName || 'N/A'}</td>
                <td style="padding: 10px 8px; color: #ea580c; font-weight: bold;">${r.box || r.boxNumber || 'N/A'}</td>
            </tr>
        `).join('');
    }

    // ៣. លោត Modal ឡើង
    digitalModal.style.display = 'flex';
    setTimeout(() => digitalModal.classList.add('active'), 10);
};

window.closeDigitalModal = function() {
    const digitalModal = document.getElementById('digital-list-modal');
    if (digitalModal) {
        digitalModal.classList.remove('active');
        setTimeout(() => digitalModal.style.display = 'none', 300);
    }
};

// ==========================================================================
// 🚀 DOM Ready - Initialize All Modules
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 EDC Route Billing System Starting...');

    // 1. Archive Engine
    if (window.ArchiveEngine) {
        window.ArchiveEngine.init();
    }

    // 2. Clear Memory Button
    const clearMemoryBtn = document.getElementById('btn-clear-memory');
    if (clearMemoryBtn) {
        clearMemoryBtn.addEventListener('click', () => {
            if (confirm('🧹 តើអ្នកចង់សម្អាត Memory និងទិន្នន័យបណ្តោះអាសន្នទាំងអស់មែនទេ?\n\n⚠️ ទិន្នន័យ Master Database នឹងមិនរងផលប៉ះពាល់ទេ។')) {
                if (window.UI && typeof window.UI.clearAllData === 'function') {
                    window.UI.clearAllData();
                    if (window.gc) { try { window.gc(); } catch (e) { /* ignore */ } }
                    window.Utils.showAlert('✅ បានសម្អាត Memory និងទិន្នន័យបណ្តោះអាសន្នរួចរាល់!');
                }
            }
        });
    }

    // ==========================================================================
    // 📱 3. បញ្ចូល HTML នៃ Modal Digital
    // ==========================================================================
    if (!document.getElementById('digital-list-modal')) {
        const digitalModalHtml = `
            <div class="method-picker-overlay" id="digital-list-modal" style="display:none; z-index: 99999;">
                <div class="method-picker-sheet" style="max-width: 600px; max-height: 85vh; display: flex; flex-direction: column; padding-bottom: 20px;">
                    <div class="method-picker-handle"></div>
                    <div class="method-picker-header">
                        <span style="font-size: 16px; font-weight: bold;">📱 បញ្ជីឈ្មោះ Digital (<span id="digital-list-count">0</span>)</span>
                        <button type="button" class="method-picker-close" id="digital-list-close">✕</button>
                    </div>
                    <div style="overflow-y: auto; flex-grow: 1; margin-top: 10px;">
                        <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 13px;">
                            <thead style="position: sticky; top: 0; background: var(--bg-card, #1e293b); box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: var(--text-secondary, #94a3b8); z-index: 5;">
                                <tr>
                                    <th style="padding: 10px 8px; border-bottom: 2px solid var(--border, #334155); width: 40px; text-align:center;">ល.រ</th>
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

        document.getElementById('digital-list-close')?.addEventListener('click', window.closeDigitalModal);
        document.getElementById('digital-list-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'digital-list-modal') window.closeDigitalModal();
        });
    }

    // ==========================================================================
    // 🚀 4. Mobile Touch System (ប្រព័ន្ធចាប់ការចុចលើទូរស័ព្ទដៃ)
    // ==========================================================================
    
    // កត់ត្រាទុកពេលអ្នកកំពុងអូស (Scroll) ដើម្បីកុំឱ្យវាលោតច្រឡំពេលកំពុងអូស
    let isScrollingMobile = false;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        isScrollingMobile = false;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
            isScrollingMobile = true;
        }
    }, { passive: true });

    // Aggressive Scanner ដែល Support ទាំង Click និង Touch
    setInterval(() => {
        const allCards = document.querySelectorAll('.stat-card, div'); // រាវរកកាត
        
        allCards.forEach(card => {
            const text = (card.textContent || '').toUpperCase();
            
            // លក្ខខណ្ឌកាត DIGITAL (ពង្រីក length ដល់ 100 ដើម្បី Support អេក្រង់ទូរស័ព្ទ)
            if (text.includes('DIGITAL') && 
                !text.includes('បញ្ជីឈ្មោះ') && 
                !text.includes('DELIVERED') && 
                !text.includes('PENDING') && 
                text.length < 100) {
                
                if (card.children.length > 0 && !card.dataset.digitalClickReady) {
                    card.dataset.digitalClickReady = "true";
                    card.style.cursor = 'pointer';

                    // មុខងារបើក Modal (ប្រើបានទាំង PC ទាំង Mobile)
                    const triggerModal = (e) => {
                        if (isScrollingMobile) return; // បើកំពុងអូស មិនឱ្យលោតទេ
                        e.preventDefault();
                        e.stopPropagation();
                        window.openDigitalModal();
                    };

                    // ដាក់ Event ២ ប្រភេទ (Click សម្រាប់កុំព្យូទ័រ, Touchend សម្រាប់ទូរស័ព្ទដៃ)
                    card.addEventListener('click', triggerModal, true);
                    card.addEventListener('touchend', triggerModal, true);
                }
            }
        });
    }, 1000);

    console.log('✅ Mobile Touch Support initialized');
});

// ==========================================================================
// 🛡️ Global Error Handler
// ==========================================================================
window.addEventListener('error', (e) => {
    console.error('❌ Global Error:', e.message);
});
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled Promise:', e.reason);
});
