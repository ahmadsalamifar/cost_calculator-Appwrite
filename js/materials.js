import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

let currentUnitRelations = []; 

export function setupMaterials(refreshCallback) {
    // سابمیت فرم
    document.getElementById('material-form').onsubmit = (e) => { e.preventDefault(); saveMaterial(refreshCallback); };
    
    const cancelBtn = document.getElementById('mat-cancel-btn');
    if(cancelBtn) cancelBtn.onclick = resetMatForm;

    const searchInp = document.getElementById('search-materials');
    if(searchInp) searchInp.oninput = (e) => renderMaterials(e.target.value);

    const sortSel = document.getElementById('sort-materials');
    if(sortSel) sortSel.onchange = () => renderMaterials();

    const addRelBtn = document.getElementById('btn-add-relation');
    if(addRelBtn) addRelBtn.onclick = addRelationRow;

    // ---------------------------------------------------------
    // 1. دکمه مثبت (+) برای کالای جدید
    // ---------------------------------------------------------
    const sidebarHeader = document.querySelector('#tab-materials h3');
    if(sidebarHeader && !document.getElementById('btn-new-mat-plus')) {
        const container = document.createElement('div');
        container.className = "flex items-center justify-between w-full mb-2";
        sidebarHeader.parentNode.insertBefore(container, sidebarHeader);
        container.appendChild(sidebarHeader);
        
        const btn = document.createElement('button');
        btn.id = 'btn-new-mat-plus';
        btn.type = 'button';
        btn.className = 'bg-emerald-500 text-white rounded-lg w-8 h-8 flex items-center justify-center text-xl font-bold shadow hover:bg-emerald-600 transition-colors pb-1';
        btn.innerHTML = '+';
        btn.title = 'کالای جدید';
        btn.onclick = () => {
            resetMatForm();
            document.getElementById('mat-name').focus();
        };
        container.appendChild(btn);
    }

    // ---------------------------------------------------------
    // 2. دکمه بروزرسانی کلی (Bulk Update)
    // ---------------------------------------------------------
    const bulkScraperBtn = document.getElementById('btn-scraper-trigger');
    if(bulkScraperBtn) bulkScraperBtn.onclick = async () => {
        if(!confirm('آیا می‌خواهید قیمت تمام کالاهای لینک‌دار را بروزرسانی کنید؟')) return;
        
        bulkScraperBtn.innerText = '⏳ در حال استعلام...';
        bulkScraperBtn.disabled = true;
        bulkScraperBtn.classList.add('opacity-70');

        try {
            const result = await api.runScraper({ type: 'bulk' }); 
            if(result.success && result.report) {
                showScraperReport(result.report); 
                refreshCallback(); 
            } else {
                alert('خطا: ' + (result.error || 'پاسخ نامشخص'));
            }
        } 
        catch(e) { alert('خطا: ' + e.message); } 
        finally { 
            bulkScraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; 
            bulkScraperBtn.disabled = false;
            bulkScraperBtn.classList.remove('opacity-70');
        }
    };

    // ---------------------------------------------------------
    // 3. اصلاح دکمه تست لینک (UI Fix)
    // استفاده از Flexbox برای قرارگیری مرتب کنار اینپوت
    // ---------------------------------------------------------
    const urlInput = document.getElementById('mat-scraper-url');
    if(urlInput && !document.getElementById('btn-test-link')) {
        // والد اینپوت را به Flex تغییر می‌دهیم
        const parent = urlInput.parentElement; 
        
        // یک کانتینر ردیفی برای اینپوت و دکمه
        const rowWrapper = document.createElement('div');
        rowWrapper.className = "flex gap-2 items-center w-full";
        
        // جابجایی اینپوت به داخل رپر
        parent.insertBefore(rowWrapper, urlInput);
        rowWrapper.appendChild(urlInput);
        
        // دکمه تست
        const testBtn = document.createElement('button');
        testBtn.id = 'btn-test-link';
        testBtn.type = 'button';
        testBtn.className = 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 rounded-lg h-10 text-xs font-bold shrink-0 transition-colors whitespace-nowrap';
        testBtn.innerHTML = '⚡ تست';
        testBtn.title = 'بررسی قیمت بدون ذخیره';
        
        rowWrapper.appendChild(testBtn);

        testBtn.onclick = async () => {
            const url = urlInput.value;
            const anchor = document.getElementById('mat-scraper-anchor').value;
            const factor = parseFloat(document.getElementById('mat-scraper-factor').value) || 1;
            
            if(!url) { alert('لطفاً لینک را وارد کنید'); return; }
            
            const originalText = testBtn.innerHTML;
            testBtn.innerText = '⏳ ...';
            testBtn.disabled = true;
            
            try {
                const res = await api.runScraper({ type: 'single_check', url, anchor, factor });
                if(res.success && res.data) {
                    document.getElementById('mat-price').value = formatPrice(res.data.final_price);
                    
                    const pInput = document.getElementById('mat-price');
                    pInput.classList.add('bg-green-100', 'text-green-800');
                    setTimeout(() => pInput.classList.remove('bg-green-100', 'text-green-800'), 2000);

                    alert(`✅ قیمت یافت شد: ${formatPrice(res.data.final_price)} تومان`);
                } else {
                    alert('❌ خطا: ' + (res.error || 'قیمت پیدا نشد'));
                }
            } catch(e) { alert('خطا: ' + e.message); }
            finally { 
                testBtn.innerHTML = originalText;
                testBtn.disabled = false;
            }
        };
    }
    
    // مدیریت فرمت قیمت
    const priceInput = document.getElementById('mat-price');
    if(priceInput) {
        const newPriceInput = priceInput.cloneNode(true);
        priceInput.parentNode.replaceChild(newPriceInput, priceInput);
        
        newPriceInput.onfocus = (e) => {
            const val = parseLocaleNumber(e.target.value);
            if(val > 0) e.target.value = val; 
        };
        newPriceInput.onblur = (e) => {
            const val = parseLocaleNumber(e.target.value);
            if(val > 0) e.target.value = formatPrice(val); 
        };
    }
    
    const baseUnitSelect = document.getElementById('mat-base-unit-select');
    if(baseUnitSelect) baseUnitSelect.onchange = updateUnitDropdowns;
    
    // اصلاح: استفاده از ID صحیح (mat-price-unit) برای لیسنرها
    ['mat-price-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.onchange = calculateScraperFactor;
    });
}

// --- توابع کمکی ---

function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    if(!container) return;
    container.innerHTML = '';
    const baseElem = document.getElementById('mat-base-unit-select');
    const baseUnitName = baseElem ? (baseElem.value || 'واحد پایه') : 'واحد پایه';
    
    currentUnitRelations.forEach((rel, index) => {
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        const row = document.createElement('div');
        row.className = 'flex items-center gap-1 bg-white p-1 rounded border border-slate-200 mb-1 shadow-sm text-xs';
        row.innerHTML = `
            <input type="number" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-unit" value="${rel.qtyUnit || 1}">
            <select class="input-field w-24 px-1 h-7 text-[10px] rel-name-select">${options}</select>
            <span>=</span>
            <input type="number" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-base" value="${rel.qtyBase || 1}">
            <span class="w-12 truncate text-[10px] base-unit-label">${baseUnitName}</span>
            <button type="button" class="text-rose-500 px-2 btn-remove-rel text-lg">×</button>
        `;
        const updateRow = () => {
            currentUnitRelations[index].name = row.querySelector('.rel-name-select').value;
            currentUnitRelations[index].qtyUnit = parseFloat(row.querySelector('.rel-qty-unit').value) || 1;
            currentUnitRelations[index].qtyBase = parseFloat(row.querySelector('.rel-qty-base').value) || 1;
            updateUnitDropdowns();
        };
        row.querySelectorAll('input, select').forEach(el => el.onchange = updateRow);
        row.querySelector('.btn-remove-rel').onclick = () => { currentUnitRelations.splice(index, 1); renderRelationsUI(); updateUnitDropdowns(); };
        container.appendChild(row);
    });
}

function addRelationRow() {
    const usedNames = currentUnitRelations.map(r => r.name);
    const available = state.units.find(u => !usedNames.includes(u.name));
    const name = available ? available.name : (state.units[0]?.name || 'Unit');
    currentUnitRelations.push({ name: name, qtyUnit: 1, qtyBase: 1 });
    renderRelationsUI();
    updateUnitDropdowns();
}

function updateUnitDropdowns() {
    const baseElem = document.getElementById('mat-base-unit-select');
    if(!baseElem) return;
    
    if(!baseElem.value && baseElem.options.length > 0) {
        baseElem.selectedIndex = 0;
    }
    const baseUnit = baseElem.value;

    let availableUnits = [baseUnit];
    currentUnitRelations.forEach(r => availableUnits.push(r.name));
    availableUnits = [...new Set(availableUnits)];
    
    const optionsHtml = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
    
    // FIX: استفاده از mat-price-unit به جای mat-purchase-unit که در HTML وجود ندارد
    ['mat-price-unit', 'mat-consumption-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            const prev = el.value;
            el.innerHTML = optionsHtml;
            if(availableUnits.includes(prev)) el.value = prev;
            else if(availableUnits.length > 0) el.value = availableUnits[0];
        }
    });
    
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    calculateScraperFactor();
}

function getFactorToBase(unitName) {
    const baseElem = document.getElementById('mat-base-unit-select');
    if (!baseElem || unitName === baseElem.value) return 1;
    const rel = currentUnitRelations.find(r => r.name === unitName);
    return rel ? (rel.qtyBase / rel.qtyUnit) : 1;
}

function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    // FIX: استفاده از mat-price-unit
    const pSelect = document.getElementById('mat-price-unit');
    const factorInput = document.getElementById('mat-scraper-factor');
    if(!sSelect || !pSelect || !factorInput) return;
    
    const sFactor = getFactorToBase(sSelect.value);
    const pFactor = getFactorToBase(pSelect.value);
    
    let rate = 1;
    if (sFactor !== 0) rate = pFactor / sFactor;
    factorInput.value = parseFloat(rate.toFixed(4)); 
}

// ---------------------------------------------------------
// 4. رفع مشکل ذخیره (مدیریت واحد پایه گمشده و ID صحیح)
// ---------------------------------------------------------
async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    const baseElem = document.getElementById('mat-base-unit-select');
    let baseUnitVal = baseElem.value;
    if(!baseUnitVal) baseUnitVal = 'عدد';

    // FIX: گرفتن مقدار از mat-price-unit
    let purchaseUnitVal = document.getElementById('mat-price-unit').value;
    if(!purchaseUnitVal) purchaseUnitVal = baseUnitVal;

    let consumptionUnitVal = document.getElementById('mat-consumption-unit') ? document.getElementById('mat-consumption-unit').value : purchaseUnitVal;
    if(!consumptionUnitVal) consumptionUnitVal = purchaseUnitVal;

    const rawPrice = document.getElementById('mat-price').value;
    const priceNum = parseLocaleNumber(rawPrice);

    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        price: priceNum,
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_anchor: document.getElementById('mat-scraper-anchor').value || null,
        
        unit: purchaseUnitVal, 
        purchase_unit: purchaseUnitVal,
        consumption_unit: consumptionUnitVal,
        
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1,
        has_tax: document.getElementById('mat-has-tax').checked,
        
        unit_relations: JSON.stringify({
            base: baseUnitVal,
            others: currentUnitRelations,
            selected_purchase: purchaseUnitVal,
            selected_consumption: consumptionUnitVal,
            selected_scraper: document.getElementById('mat-scraper-unit').value
        })
    };

    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        
        resetMatForm();
        cb(); 
        alert('✅ ذخیره شد');
    } catch(e){ 
        alert('❌ خطا در ذخیره: ' + e.message); 
    }
}

export function renderMaterials(filter='') {
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(baseSelect && state.units.length > 0 && baseSelect.options.length === 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        if(!baseSelect.value) baseSelect.selectedIndex = 0;
        updateUnitDropdowns(); 
    }

    const sortElem = document.getElementById('sort-materials');
    const sort = sortElem ? sortElem.value : 'update_desc';
    
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    list.sort((a,b) => {
        if(sort === 'price_desc') return b.price - a.price;
        if(sort === 'price_asc') return a.price - b.price;
        return new Date(b.$updatedAt) - new Date(a.$updatedAt);
    });
    
    const el = document.getElementById('materials-container');
    if(!el) return;
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">موردی یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const pUnit = m.purchase_unit || m.unit || 'واحد'; 
        
        let taxBadge = '';
        let borderClass = 'border-slate-100';
        if (m.has_tax) {
            taxBadge = '<span class="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 rounded ml-1">مالیات</span>';
            borderClass = 'border-rose-200 ring-1 ring-rose-50';
        }

        return `
        <div class="bg-white p-3 rounded-xl border ${borderClass} group relative hover:shadow-md transition-all shadow-sm">
            <div class="flex justify-between mb-1 items-start">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center">
                        <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500 border border-slate-100 w-fit">${cat}</span>
                        ${taxBadge}
                    </div>
                    <div class="font-bold text-sm text-slate-800 truncate mt-1" title="${m.name}">${m.name}</div>
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 left-2 bg-white pl-1">
                    <button class="text-amber-500 px-1 btn-edit-mat hover:bg-amber-50 rounded" data-id="${m.$id}">✎</button>
                    <button class="text-rose-500 px-1 btn-del-mat hover:bg-rose-50 rounded" data-id="${m.$id}">×</button>
                </div>
            </div>
            <div class="flex justify-between items-end mt-2 pt-2 border-t border-dashed border-slate-100">
                 <span class="text-[10px] text-slate-400">${getDateBadge(m.$updatedAt)}</span>
                 <div class="text-right">
                     <span class="font-bold text-teal-700 text-lg">${formatPrice(m.price)}</span>
                     <span class="text-[10px] text-slate-400 mr-1">تومان / ${pUnit}</span>
                </div>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('حذف شود؟')) { try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); } catch(e) { alert(e.message); } }
    });
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    if(!m) return;
    
    resetMatForm();

    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || '';
    document.getElementById('mat-category').value = m.category_id || '';
    document.getElementById('mat-has-tax').checked = !!m.has_tax; 
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    document.getElementById('mat-scraper-anchor').value = m.scraper_anchor || '';
    
    try {
        const rels = JSON.parse(m.unit_relations || '{}');
        const baseSelect = document.getElementById('mat-base-unit-select');
        
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        
        const savedBase = rels.base || 'عدد';
        let baseExists = Array.from(baseSelect.options).some(o => o.value === savedBase);
        if (!baseExists) {
            const opt = document.createElement('option');
            opt.value = savedBase;
            opt.innerText = savedBase + " (قدیمی)";
            baseSelect.appendChild(opt);
        }
        baseSelect.value = savedBase;

        currentUnitRelations = (rels.others || []).map(r => ({ name: r.name, qtyUnit: r.qtyUnit || 1, qtyBase: r.qtyBase || 1 }));
        
        renderRelationsUI(); 
        updateUnitDropdowns();
        
        const savedP = rels.selected_purchase || m.purchase_unit || m.unit;
        if(savedP) {
             // FIX: استفاده از mat-price-unit
             const pEl = document.getElementById('mat-price-unit');
             if(![...pEl.options].some(o=>o.value===savedP)) {
                 pEl.innerHTML += `<option value="${savedP}">${savedP}</option>`;
             }
             pEl.value = savedP;
        }
        
        calculateScraperFactor(); 
    } catch(e) { 
        console.error("Parse Error", e);
        currentUnitRelations = []; 
        renderRelationsUI(); 
    }

    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره تغییرات';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    currentUnitRelations = [];
    
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(baseSelect) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        if(baseSelect.options.length > 0) baseSelect.selectedIndex = 0;
    }

    renderRelationsUI();
    updateUnitDropdowns();
    
    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}

function showScraperReport(report) {
    const existing = document.getElementById('report-modal');
    if(existing) existing.remove();

    let content = '';
    let successCount = 0;

    if(!report || report.length === 0) content = '<p class="text-center text-slate-400 py-4">نتیجه‌ای یافت نشد.</p>';
    else {
        report.forEach(item => {
            let style = { bg: 'bg-slate-50', border: 'border-slate-200', icon: '⚪' };
            if(item.status === 'success') {
                style = { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' };
                successCount++;
            }
            if(item.status === 'error') style = { bg: 'bg-rose-50', border: 'border-rose-200', icon: '❌' };
            
            content += `
            <div class="border rounded p-2 mb-1 ${style.bg} ${style.border} text-xs">
                <div class="font-bold flex justify-between text-slate-700">
                    <span class="truncate w-2/3" title="${item.name}">${style.icon} ${item.name}</span> 
                    <span class="text-[10px] opacity-70">${item.status}</span>
                </div>
                <div class="text-slate-500 mt-1 text-[10px]">${item.msg}</div>
                ${item.new ? `<div class="mt-1 font-bold text-emerald-600 text-left dir-ltr">${formatPrice(item.new)} T</div>` : ''}
            </div>`;
        });
    }

    const html = `
    <div class="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" id="report-modal">
        <div class="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div class="p-3 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h3 class="font-bold text-sm text-slate-700">گزارش بروزرسانی (${successCount}/${report.length})</h3>
                <button onclick="document.getElementById('report-modal').remove()" class="text-slate-400 hover:text-rose-500 text-xl">&times;</button>
            </div>
            <div class="p-3 overflow-y-auto flex-1 custom-scrollbar">${content}</div>
            <div class="p-3 border-t"><button onclick="document.getElementById('report-modal').remove()" class="btn btn-primary w-full text-xs">بستن</button></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
