// ================================================================
// 💾 JSON BACKUP MODULE (Export/Import) - FINAL FIX
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ============================================================
    // 1. EXPORT JSON (Backup)
    // ============================================================
    const exportBtn = document.getElementById('btn-export-json');
    if (exportBtn) {
        exportBtn.addEventListener('click', async function(e) {
            // Prevent any default action (just in case)
            e.preventDefault();
            
            try {
                console.log('📤 Export button clicked');
                
                // Check StorageEngine
                if (!window.StorageEngine || typeof window.StorageEngine.generateFullBackup !== 'function') {
                    throw new Error('StorageEngine.generateFullBackup is not available. Please refresh the page.');
                }
                
                // Generate full backup (includes ALL localStorage keys + IndexedDB)
                const backupData = await window.StorageEngine.generateFullBackup();
                console.log('📦 Backup data generated:', backupData);
                
                // Convert to JSON string
                const jsonString = JSON.stringify(backupData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
                
                // Create filename with timestamp
                const now = new Date();
                const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
                const filename = `EDC_FullBackup_${dateStr}.json`;
                
                // 1. Try using FileSaver's saveAs (most reliable)
                if (typeof saveAs === 'function') {
                    console.log('💾 Using FileSaver saveAs');
                    saveAs(blob, filename);
                }
                // 2. Fallback for Internet Explorer
                else if (typeof navigator !== 'undefined' && navigator.msSaveBlob) {
                    console.log('💾 Using msSaveBlob');
                    navigator.msSaveBlob(blob, filename);
                }
                // 3. Final fallback: anchor download
                else {
                    console.log('💾 Using anchor download fallback');
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    // Clean up after a short delay
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                }
                
                alert(`✅ Backup រួចរាល់! (បានរក្សាទុកទិន្នន័យទាំងអស់)`);
                
            } catch (err) {
                console.error('❌ Export error:', err);
                alert('❌ ការបង្កើត Backup បរាជ័យ: ' + err.message);
            }
        });
    }

    // ============================================================
    // 2. IMPORT JSON (Restore)
    // ============================================================
    const importBtn = document.getElementById('btn-import-json');
    const fileInput = document.getElementById('restore-file-input');
    
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Confirm before restore
            const confirmed = confirm(
                '⚠️ ការ Restore នឹងជំនួសទិន្នន័យបច្ចុប្បន្នទាំងអស់!\n\n' +
                '✅ OK = បន្ត Restore\n' +
                '❌ Cancel = បោះបង់'
            );
            
            if (!confirmed) {
                event.target.value = '';
                return;
            }

            try {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const backupData = JSON.parse(e.target.result);
                        console.log('📥 Backup data to restore:', backupData);
                        
                        // Validate required fields
                        if (!backupData.timestamp || !backupData.localStorage) {
                            throw new Error('ហ្វាល់នេះមិនមែនជា Backup ត្រឹមត្រូវទេ!');
                        }
                        
                        // Check StorageEngine
                        if (!window.StorageEngine || typeof window.StorageEngine.restoreFullBackup !== 'function') {
                            throw new Error('StorageEngine.restoreFullBackup is not available. Please refresh the page.');
                        }
                        
                        // Restore all data
                        await window.StorageEngine.restoreFullBackup(backupData);
                        
                        // Count restored master data (if any)
                        let count = 0;
                        if (backupData.localStorage && backupData.localStorage['EDC_MASTER_CACHE']) {
                            try {
                                const master = JSON.parse(backupData.localStorage['EDC_MASTER_CACHE']);
                                count = Array.isArray(master) ? master.length : 0;
                            } catch (e) {}
                        }
                        
                        alert(
                            `✅ Restore រួចរាល់!\n` +
                            `📊 បានស្ដារ ${count} ផ្ទះ\n` +
                            `📅 Backup: ${backupData.timestamp || 'Unknown'}`
                        );
                        
                        // Reload page to reinitialize everything
                        setTimeout(() => window.location.reload(), 1500);
                        
                    } catch (err) {
                        console.error('❌ Restore parse error:', err);
                        alert('❌ ហ្វាល់ Backup មិនត្រឹមត្រូវ ឬខូច: ' + err.message);
                    }
                };
                reader.readAsText(file);
                
            } catch (err) {
                console.error('❌ Import error:', err);
                alert('❌ ការអានហ្វាល់បរាជ័យ: ' + err.message);
            } finally {
                event.target.value = '';
            }
        });
    }
});