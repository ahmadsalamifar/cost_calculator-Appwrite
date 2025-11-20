import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

let currentUnitRelations = []; 

export function setupMaterials(refreshCallback) {
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
    // رفع باگ محدودیت ۴ رقم و پرش موس
    // ---------------------------------------------------------
    const priceInput = document.getElementById('mat-price');
    if(priceInput) {
        // هنگام تایپ هیچ فرمتی اعمال نکن (آزاد)
        priceInput.onfocus = (e) => {
            const val = parseLocaleNumber(e.target.value);
            if(val > 0) e.target.value = val; // نمایش عدد خام
        };
        // فقط وقتی کاربر کارش تمام شد و رفت بیرون، ۳ رقم جدا کن
        priceInput.onblur = (e) => {
            const val = parseLocaleNumber(e.target.value);
            if(val > 0) e.target.value = formatPrice(val);
        };
    }
    
    const baseUnitSelect = document.getElementById('mat-base-unit-select');
    if(baseUnitSelect) baseUnitSelect.onchange = updateUnitDropdowns;
    
    const scraperUnit = document.getElementById('mat-scraper-unit');
    if(scraperUnit) scraperUnit.onchange = calculateScraperFactor;
    
    const purchaseUnit = document.getElementById('mat-purchase-unit');
    if(purchaseUnit) purchaseUnit.onchange = calculateScraperFactor;

    // ---------------------------------------------------------
    // دکمه اسکرپر هوشمند (Live Check + DB Update)
    // ---------------------------------------------------------
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        const currentId = document.getElementById('mat-id').value;
        const url = document.getElementById('mat-scraper-url').value;
        const anchor = document.getElementById('mat-scraper-anchor').value;
        const scraperFactor = parseFloat(document.getElementById('mat-scraper-factor').value) || 1;

        // حالت ۱: استعلام زنده برای کالای جدید (یا ذخیره نشده)
        if (!currentId) {
            if(!url) { alert('لطفاً لینک سایت را وارد کنید.'); return; }
            
            scraperBtn.innerText = '⏳ استعلام از سایت...';
            scraperBtn.disabled = true;

            try {
                // ارسال مستقیم لینک به فانکشن برای دریافت قیمت لحظه‌ای
                const result = await api.runScraper({ type: 'single_check', url, anchor, factor: scraperFactor });
                
                if(result.success && result.data) {
                    const foundPrice = result.data.final_price;
                    document.getElementById('mat-price').value = formatPrice(foundPrice);
                    // تغییر رنگ جهت جلب توجه
                    document.getElementById('mat-price').classList.add('bg-green-50', 'text-green-700');
                    setTimeout(() => document.getElementById('mat-price').classList.remove('bg-green-50', 'text-green-700'), 2000);
                    alert(`قیمت یافت شد: ${formatPrice(foundPrice)} تومان`);
                } else {
                    alert('خطا: ' + (result.error || 'قیمت یافت نشد.'));
                }
            } catch(e) {
                alert('خطا در ارتباط با سرور: ' + e.message);
            } finally {
                scraperBtn.innerText = '🤖 دریافت اتوماتیک قیمت';
                scraperBtn.disabled = false;
            }
            return;
        }

        // حالت ۲: بروزرسانی کلی (اگر کالا ذخیره شده باشد و کاربر بخواهد آپدیت کند)
        if(!confirm('آیا از بروزرسانی قیمت طبق لینک اطمینان دارید؟')) return;
        scraperBtn.innerText = '⏳ در حال آپدیت...';
        scraperBtn.disabled = true;
        try { 
            const result = await api.runScraper(); // بدون پارامتر = آپدیت همه یا بر اساس دیتابیس
            if(result.success && result.report) {
                showScraperReport(result.report); 
                refreshCallback(); 
            } else {
                alert('خطا: ' + (result.error || 'پاسخ نامعتبر'));
            }
        } 
        catch(e) { alert('ارتباط برقرار نشد: ' + e.message); } 
        finally { 
            scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; 
            scraperBtn.disabled = false;
        }
    };

    // دکمه بکاپ
    const headerActions = document.querySelector('#tab-materials .flex.justify-between');
    if(headerActions && !document.getElementById('btn-full-backup')) {
        const backupBtn = document.createElement('button');
        backupBtn.id = 'btn-full-backup';
        backupBtn.className = 'text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 mr-2';
        backupBtn.innerHTML = '💾 بکاپ';
        backupBtn.onclick = exportDatabase;
        headerActions.appendChild(backupBtn);
    }
}

function exportDatabase() {
    const data = { timestamp: new Date().toISOString(), version: "3.0", materials: state.materials, formulas: state.formulas, categories: state.categories, units: state.units };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", "bom_backup.json");
    document.body.appendChild(dl); dl.click(); dl.remove();
}

function showScraperReport(report) {
    const existing = document.getElementById('report-modal');
    if(existing) existing.remove();

    let content = '';
    if(!report || report.length === 0) content = '<p class="text-center text-slate-400 py-4">نتیجه‌ای یافت نشد.</p>';
    else {
        report.forEach(item => {
            let style = { bg: 'bg-slate-50', border: 'border-slate-200', icon: '⚪' };
            if(item.status === 'success') style = { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' };
            if(item.status === 'error') style = { bg: 'bg-rose-50', border: 'border-rose-200', icon: '❌' };
            
            content += `
            <div class="border rounded p-2 mb-1 ${style.bg} ${style.border} text-xs">
                <div class="font-bold flex justify-between"><span>${style.icon} ${item.name}</span> <span>${item.status}</span></div>
                <div class="text-slate-600 mt-1">${item.msg}</div>
                ${item.new ? `<div class="mt-1 font-bold text-emerald-600">${formatPrice(item.new)} تومان</div>` : ''}
            </div>`;
        });
    }

    const html = `
    <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" id="report-modal">
        <div class="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div class="p-3 border-b flex justify-between"><h3 class="font-bold">گزارش</h3><button onclick="document.getElementById('report-modal').remove()">×</button></div>
            <div class="p-3 overflow-y-auto flex-1">${content}</div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ... (renderRelationsUI, addRelationRow مشابه قبل) ...
function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    if(!container) return;
    container.innerHTML = '';
    const baseElem = document.getElementById('mat-base-unit-select');
    const baseUnitName = baseElem ? (baseElem.value || 'واحد پایه') : 'واحد پایه';
    
    currentUnitRelations.forEach((rel, index) => {
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 bg-white p-2 rounded border border-slate-200 mb-2 shadow-sm';
        row.innerHTML = `
            <input type="number" step="any" class="input-field h-9 w-16 text-center font-bold bg-slate-50 rel-qty-unit" value="${rel.qtyUnit || 1}">
            <select class="input-field h-9 w-28 px-2 text-xs rel-name-select">${options}</select>
            <span class="text-slate-400 text-lg">=</span>
            <input type="number" step="any" class="input-field h-9 w-16 text-center font-bold bg-slate-50 rel-qty-base" value="${rel.qtyBase || 1}">
            <span class="text-slate-500 text-xs w-16 truncate base-unit-label font-bold">${baseUnitName}</span>
            <button type="button" class="text-slate-300 hover:text-rose-500 px-2 btn-remove-rel">×</button>
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
    const baseUnit = baseElem.value;
    let availableUnits = [baseUnit];
    currentUnitRelations.forEach(r => availableUnits.push(r.name));
    availableUnits = [...new Set(availableUnits)];
    const optionsHtml = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
    
    ['mat-purchase-unit', 'mat-consumption-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            const prev = el.value;
            el.innerHTML = optionsHtml;
            if(availableUnits.includes(prev)) el.value = prev;
        }
    });
    
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    calculateScraperFactor();
}

function getFactorToBase(unitName) {
    const baseElem = document.getElementById('mat-base-unit-select');
    if (!baseElem) return 1;
    if (unitName === baseElem.value) return 1;
    const rel = currentUnitRelations.find(r => r.name === unitName);
    if (!rel) return 1; 
    return rel.qtyBase / rel.qtyUnit;
}

function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    const pSelect = document.getElementById('mat-purchase-unit');
    const factorInput = document.getElementById('mat-scraper-factor');
    if(!sSelect || !pSelect || !factorInput) return;
    
    const sFactor = getFactorToBase(sSelect.value);
    const pFactor = getFactorToBase(pSelect.value);
    
    let rate = 1;
    if (sFactor !== 0) rate = pFactor / sFactor;
    factorInput.value = rate; 
}

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    calculateScraperFactor(); // اطمینان از آپدیت بودن ضریب
    
    const purchaseUnitVal = document.getElementById('mat-purchase-unit').value;
    const consumptionUnitVal = document.getElementById('mat-consumption-unit') ? document.getElementById('mat-consumption-unit').value : purchaseUnitVal;

    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        price: parseLocaleNumber(document.getElementById('mat-price').value),
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_anchor: document.getElementById('mat-scraper-anchor').value || null,
        
        // ذخیره هر دو فیلد جدید و قدیم
        unit: purchaseUnitVal, 
        purchase_unit: purchaseUnitVal,
        consumption_unit: consumptionUnitVal,
        
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1,
        has_tax: document.getElementById('mat-has-tax').checked,
        
        unit_relations: JSON.stringify({
            base: document.getElementById('mat-base-unit-select').value,
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
    } catch(e){ alert('خطا: ' + e.message); }
}

export function renderMaterials(filter='') {
    // اطمینان از پر بودن لیست واحدها
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(baseSelect && state.units.length > 0 && baseSelect.options.length === 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
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
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        
        // --- FIX: نمایش واحد قدیمی برای کالاهای قبلی ---
        const pUnit = m.purchase_unit || m.unit || 'واحد'; 
        
        let taxBadge = '';
        let borderClass = 'border-slate-100';
        if (m.has_tax) {
            taxBadge = '<span class="text-[9px] font-bold bg-rose-100 text-rose-600 px-1.5 rounded ml-1">٪ مالیات</span>';
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
                    <button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button>
                    <button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button>
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
        if(confirm('حذف؟')) { try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); } catch(e) { alert(e.message); } }
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
        
        // اگر هنوز واحدها لود نشده، موقتا با دیتای کالا پر کن
        if(state.units.length === 0) baseSelect.innerHTML = `<option value="${rels.base || 'Unit'}">${rels.base || 'Unit'}</option>`;
        
        if(rels.base) baseSelect.value = rels.base;
        currentUnitRelations = (rels.others || []).map(r => ({ name: r.name, qtyUnit: r.qtyUnit || 1, qtyBase: r.qtyBase || 1 }));
        
        renderRelationsUI(); 
        updateUnitDropdowns();
        
        // --- FIX: انتخاب واحد خرید صحیح (جدید یا قدیم) ---
        const savedPurchaseUnit = rels.selected_purchase || m.purchase_unit || m.unit;
        if(savedPurchaseUnit) {
             const pEl = document.getElementById('mat-purchase-unit');
             // اگر واحد در لیست نبود (چون قدیمیه)، موقتا اضافه‌ش کن
             if(![...pEl.options].map(o=>o.value).includes(savedPurchaseUnit)){
                 const opt = document.createElement('option');
                 opt.value = savedPurchaseUnit;
                 opt.innerText = savedPurchaseUnit;
                 pEl.appendChild(opt);
             }
             pEl.value = savedPurchaseUnit;
        }

        if(rels.selected_consumption) {
             const cEl = document.getElementById('mat-consumption-unit');
             if(cEl) cEl.value = rels.selected_consumption;
        }

        if(rels.selected_scraper) document.getElementById('mat-scraper-unit').value = rels.selected_scraper;
        
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
    renderRelationsUI();
    updateUnitDropdowns();
    
    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}