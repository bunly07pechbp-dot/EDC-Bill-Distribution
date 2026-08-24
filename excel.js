// ==========================================================================
// 📊 Excel Engine – Safe Excel Import Module (iOS Compatible & Metadata Preserve)
// ==========================================================================
window.ExcelEngine = {
    init: function() {
        const fileInput = document.getElementById('excel-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', this.parseFiles.bind(this));
        }
    },

    // ---- Helper: Wait for StorageEngine to be ready ----
    _waitForStorage: function(callback, retries = 10) {
        if (window.StorageEngine && window.StorageEngine._isInitialized) {
            callback();
        } else if (retries > 0) {
            console.log('⏳ Waiting for StorageEngine to initialize... (' + retries + ' retries left)');
            setTimeout(() => {
                this._waitForStorage(callback, retries - 1);
            }, 200);
        } else {
            console.error('❌ StorageEngine failed to initialize after multiple retries.');
            window.Utils.showAlert('⚠️ ប្រព័ន្ធផ្ទុកទិន្នន័យកំពុងដំណើរការ សូមចុច Import ម្តងទៀតក្រោយពី ២ វិនាទី។');
        }
    },

    parseFiles: function(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const existingMap = new Map(window.masterData.map(r => [String(r.invoice), r]));
        window.Utils.updateSystemStatus("កំពុងអានហ្វាល់...", window.masterData.length);

        let filesLoadedCount = 0;
        let totalFiles = files.length;
        let newlyAddedCount = 0;
        let updatedCount = 0;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = async function(e) {
                try {
                    let workbook;
                    let data;
                    
                    if (e.target.result instanceof ArrayBuffer) {
                        data = new Uint8Array(e.target.result);
                        workbook = XLSX.read(data, { type: 'array' });
                        console.log('📄 Excel read as ArrayBuffer, size:', data.length);
                    } else if (typeof e.target.result === 'string') {
                        data = e.target.result;
                        workbook = XLSX.read(data, { type: 'binary' });
                        console.log('📄 Excel read as binary string, length:', data.length);
                    } else {
                        throw new Error('Unsupported file format: ' + typeof e.target.result);
                    }

                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                    console.log('📊 Excel rows read:', aoa.length);

                    if (aoa.length === 0) {
                        window.Utils.showAlert('⚠️ ហ្វាល់ Excel ទទេ ឬមិនអាចអានបាន!');
                        event.target.value = "";
                        return;
                    }

                    let cabinName = file.name.replace(/\.[^/.]+$/, "").trim();
                    for (let r = 0; r < Math.min(aoa.length, 10); r++) {
                        if (aoa[r] && Array.isArray(aoa[r])) {
                            let text = aoa[r].map(c => String(c || "")).join(" ");
                            let match = text.match(/កាប៊ីនៈ?\s*([a-zA-Z0-9]+)/i);
                            if (match) { cabinName = match[1].trim(); break; }
                        }
                    }
                    window.currentCabinGlobal = cabinName;

                    let headerRowIndex = -1;
                    let foundHeaders = false;
                    let colMap = {};

                    const normalizeText = (text) => {
                        return String(text || '').trim().toLowerCase();
                    };

                    for (let r = 0; r < Math.min(aoa.length, 25); r++) {
                        if (!aoa[r] || !Array.isArray(aoa[r])) continue;
                        let rowStr = aoa[r].map(c => normalizeText(c));
                        
                        let invIdx = rowStr.findIndex(c => 
                            c === "លេខin" || 
                            c === "លេខ in" || 
                            c === "invoice" || 
                            c.includes("លេខអ.ជ") ||
                            c.includes("លេខផ្ទះ")
                        );
                        
                        if (invIdx !== -1) {
                            headerRowIndex = r;
                            foundHeaders = true;
                            
                            colMap = {
                                invoice: invIdx,
                                name: rowStr.findIndex(c => c.includes("ឈ្មោះ") || c.includes("អតិថិជន") || c.includes("customer") || c.includes("name")),
                                status: rowStr.findIndex(c => c === "ស្ថានភាព" || c.includes("ស្ថានភាព") || c.includes("status")),
                                customerType: rowStr.findIndex(c => c.includes("ប្រ.អតិថិជន") || c.includes("ប្រាក់អតិថិជន")),
                                usage: rowStr.findIndex(c => c.includes("ប្រ.ប្រើប្រាស់") || c.includes("ប្រើប្រាស់")),
                                door: rowStr.findIndex(c => c.includes("ទ្វារ") || c.includes("ទ្វារចរន្ត") || c.includes("door")),
                                meterNumber: rowStr.findIndex(c => c.includes("ដុំស្រង់") || c.includes("ដុំ") || c.includes("meter")),
                                boxNumber: rowStr.findIndex(c => c === "លេខប្រអប់" || c === "ប្រអប់" || c.includes("ប្រអប់") || c.includes("box")),
                                deposit: rowStr.findIndex(c => c.includes("ប្រាក់កក់") || c.includes("កក់") || c.includes("deposit")),
                                meterReading: rowStr.findIndex(c => c.includes("នាឡិកាស្ទង់") || c.includes("ស្ទង់") || c.includes("reading")),
                                reading: rowStr.findIndex(c => c.includes("អំណាន") || c.includes("read")),
                                address: rowStr.findIndex(c => c.includes("អាសយដ្ឋាន") || c.includes("អាស័យដ្ឋាន") || c.includes("address") || c.includes("location")),
                                location: rowStr.findIndex(c => c.includes("ទីតាំងជាក់ស្តែង") || c.includes("ទីតាំង")),
                                commune: rowStr.findIndex(c => c.includes("ឃុំ") || c.includes("សង្កាត់") || c.includes("commune")),
                                district: rowStr.findIndex(c => c.includes("ស្រុក") || c.includes("ខណ្ឌ") || c.includes("district")),
                                point: rowStr.findIndex(c => c.includes("ចំនុច") || c.includes("ទីតាំងប.ត") || c.includes("point")),
                                digitalNote: rowStr.findIndex(c => c.includes("ឌីជីថល") || c.includes("digital") || c.includes("កំណត់សម្គាល់") || c.includes("note"))
                            };
                            break;
                        }
                    }

                    if (!foundHeaders) {
                        colMap = {
                            invoice: 1, name: 2, status: 3, customerType: 4,
                            usage: 5, door: 6, meterNumber: 7, boxNumber: 8,
                            deposit: 9, meterReading: 11, reading: 12, address: 13
                        };
                    }

                    let startIndex = foundHeaders ? headerRowIndex + 1 : 8;

                    for (let i = startIndex; i < aoa.length; i++) {
                        const row = aoa[i];
                        if (!row || row.length === 0) continue;
                        
                        const invoice = String(row[colMap.invoice] || "").trim();
                        if (invoice === "" || invoice.includes("លេខ") || invoice === "-") continue;

                        const name = String(row[colMap.name] || "").trim() || "មិនមានឈ្មោះ";
                        if (name.toLowerCase().includes("edc check metering")) continue;
                        
                        const address = String(row[colMap.address] || "").trim() || "មិនមានអាសយដ្ឋាន";
                        
                        let rawStatus = "មិនទាន់ចែក";
                        if (colMap.status !== -1 && colMap.status !== undefined && row[colMap.status] !== undefined && row[colMap.status] !== null) {
                            const statusValue = String(row[colMap.status]).trim();
                            if (statusValue.includes("កំពុងប្រើ") || statusValue.includes("ប្រើប្រាស់") || statusValue.includes("active") || statusValue.includes("Active")) {
                                rawStatus = "កំពុងប្រើប្រាស់";
                            } else if (statusValue.includes("ឈប់ប្រើ") || statusValue.includes("inactive") || statusValue.includes("Inactive")) {
                                rawStatus = "ឈប់ប្រើ";
                            } else if (statusValue.includes("លុប") || statusValue.includes("deleted") || statusValue.includes("Deleted")) {
                                rawStatus = "បានលុប";
                            } else {
                                rawStatus = statusValue;
                            }
                        }

                        let door = (colMap.door !== -1 && row[colMap.door] !== undefined && row[colMap.door] !== null) ? String(row[colMap.door]).trim() : "";
                        let boxNumber = (colMap.boxNumber !== -1 && row[colMap.boxNumber] !== undefined && row[colMap.boxNumber] !== null) ? String(row[colMap.boxNumber]).trim() : "";
                        
                        let finalBox = "";
                        if (door && boxNumber) finalBox = door + boxNumber;
                        else if (door) finalBox = door;
                        else if (boxNumber) finalBox = boxNumber;
                        else finalBox = "គ្មានប្រអប់";

                        let meterNumber = (colMap.meterNumber !== -1 && row[colMap.meterNumber] !== undefined && row[colMap.meterNumber] !== null) ? String(row[colMap.meterNumber]).trim() : "";
                        let deposit = (colMap.deposit !== -1 && row[colMap.deposit] !== undefined && row[colMap.deposit] !== null) ? String(row[colMap.deposit]).trim() : "";
                        let customerType = (colMap.customerType !== -1 && row[colMap.customerType] !== undefined && row[colMap.customerType] !== null) ? String(row[colMap.customerType]).trim() : "";
                        let usage = (colMap.usage !== -1 && row[colMap.usage] !== undefined && row[colMap.usage] !== null) ? String(row[colMap.usage]).trim() : "";
                        let meterReading = (colMap.meterReading !== -1 && row[colMap.meterReading] !== undefined && row[colMap.meterReading] !== null) ? String(row[colMap.meterReading]).trim() : "";
                        let reading = (colMap.reading !== -1 && row[colMap.reading] !== undefined && row[colMap.reading] !== null) ? String(row[colMap.reading]).trim() : "";
                        let location = (colMap.location !== -1 && row[colMap.location] !== undefined && row[colMap.location] !== null) ? String(row[colMap.location]).trim() : "";
                        let commune = (colMap.commune !== -1 && row[colMap.commune] !== undefined && row[colMap.commune] !== null) ? String(row[colMap.commune]).trim() : "";
                        let district = (colMap.district !== -1 && row[colMap.district] !== undefined && row[colMap.district] !== null) ? String(row[colMap.district]).trim() : "";
                        let point = (colMap.point !== -1 && row[colMap.point] !== undefined && row[colMap.point] !== null) ? String(row[colMap.point]).trim() : "";
                        let digitalNote = (colMap.digitalNote !== -1 && row[colMap.digitalNote] !== undefined && row[colMap.digitalNote] !== null) ? String(row[colMap.digitalNote]).trim() : "";

                        // 🛡️ PRESERVE DELIVERY METADATA & UPDATE CUSTOMER PROFILE ONLY
                        if (existingMap.has(invoice)) {
                            const existingRow = existingMap.get(invoice);
                            existingRow.name = name;
                            existingRow.address = address;
                            existingRow.door = door;
                            existingRow.boxNumber = boxNumber;
                            existingRow.box = finalBox;
                            existingRow.cabin = cabinName;
                            existingRow.meterNumber = meterNumber;
                            existingRow.deposit = deposit;
                            existingRow.customerType = customerType;
                            existingRow.usage = usage;
                            existingRow.meterReading = meterReading;
                            existingRow.reading = reading;
                            existingRow.location = location;
                            existingRow.commune = commune;
                            existingRow.district = district;
                            existingRow.point = point;
                            existingRow.digitalNote = digitalNote;

                            if (existingRow.status !== 'បានចែករួចរាល់' && existingRow.status !== 'ផ្អាកប្រើ') {
                                existingRow.status = rawStatus;
                                if (digitalNote && digitalNote.toLowerCase().includes('digital')) {
                                    existingRow.method = 'digital';
                                }
                            }
                            updatedCount++;
                            continue;
                        }

                        const newRow = {
                            id: window.masterData.length + 1,
                            invoice: invoice,
                            name: name,
                            address: address,
                            box: finalBox,
                            cabin: cabinName,
                            status: rawStatus,
                            method: "",
                            door: door,
                            boxNumber: boxNumber,
                            meterNumber: meterNumber,
                            deposit: deposit,
                            customerType: customerType,
                            usage: usage,
                            meterReading: meterReading,
                            reading: reading,
                            location: location,
                            commune: commune,
                            district: district,
                            point: point,
                            digitalNote: digitalNote
                        };

                        if (digitalNote && digitalNote.toLowerCase().includes('digital')) {
                            newRow.method = 'digital';
                        }

                        existingMap.set(invoice, newRow);
                        window.masterData.push(newRow);
                        newlyAddedCount++;
                    }

                } catch (err) {
                    console.error('❌ Excel parse error:', err);
                    window.Utils.showAlert('❌ កំហុសពេលអាន Excel: ' + err.message);
                } finally {
                    filesLoadedCount++;
                    if (filesLoadedCount === totalFiles) {
                        document.getElementById('btn-clean-data').disabled = false;
                        window.Utils.rebuildMasterIndex();
                        window.Utils.updateSystemStatus("📥 ទាញចូលរួចរាល់", window.masterData.length);

                        const saveMasterData = () => {
                            if (window.StorageEngine && window.StorageEngine._isInitialized) {
                                window.StorageEngine.saveMasterCache();
                                if (window.JobsEngine && typeof window.JobsEngine.migrateAndReconcileJobs === 'function') {
                                    window.JobsEngine.migrateAndReconcileJobs();
                                    window.JobsEngine.renderJobsList();
                                }
                                console.log('✅ Master data saved and reconciled after import.');
                            } else {
                                setTimeout(saveMasterData, 200);
                            }
                        };
                        saveMasterData();

                        let msg = `✅ បានបញ្ចូលថ្មី ${newlyAddedCount} ផ្ទះ`;
                        if (updatedCount > 0) msg += ` (Update ព័ត៌មាន ${updatedCount} ផ្ទះ)`;
                        msg += `\n📊 សរុប ${window.masterData.length} ផ្ទះ`;
                        window.Utils.showAlert(msg);
                        event.target.value = "";
                    }
                }
            };

            reader.onerror = function(e) {
                console.error('❌ FileReader error:', e);
                window.Utils.showAlert('❌ ការអានហ្វាល់បរាជ័យ! សូមពិនិត្យហ្វាល់របស់អ្នក។');
                event.target.value = "";
            };

            try {
                reader.readAsArrayBuffer(file);
            } catch (e) {
                try {
                    reader.readAsBinaryString(file);
                } catch (e2) {
                    window.Utils.showAlert('❌ មិនអាចអានហ្វាល់ Excel បានទេ! សូមពិនិត្យហ្វាល់របស់អ្នក។');
                    event.target.value = "";
                }
            }
        });
    }
};