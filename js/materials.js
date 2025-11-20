import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

let currentUnitRelations = []; 

export function setupMaterials(refreshCallback) {
    // مدیریت سابمیت فرم ذخیره کالا
    document.getElementById('material-form').onsubmit = (e) => { e.preventDefault(); saveMaterial(refreshCallback); };
    
    const cancelBtn = document.getElementById('mat-cancel-btn');
    if(cancelBtn) cancelBtn.onclick = resetMatForm;

    // جستجو و مرتب‌سازی
    const searchInp = document.getElementById('search-materials');
    if(searchInp) searchInp.oninput = (e) => renderMaterials(e.target.value);

    const sortSel = document.getElementById('sort-materials');
    if(sortSel) sortSel.onchange = () => renderMaterials();

    // افزودن سطر جدید برای روابط واحدها
    const addRelBtn = document.getElementById('btn-add-relation');
    if(addRelBtn) addRelBtn.onclick = addRelationRow;
    
    // ---------------------------------------------------------
    // رفع باگ ۱: مشکل پرش نشانگر موس (Input Jumping)
    // لاجیک: هنگام تایپ (Focus) فرمت حذف شود، هنگام خروج (Blur) فرمت اعمال شود.
    // ---------------------------------------------------------
    const priceInput = document.getElementById('mat-price');
    if(priceInput) {
        priceInput.onblur = (e) => {
            const val = parseLocaleNumber(e.target.value);
            if(val > 0) e.target.value = formatPrice(val); // نمایش ۳ رقم ۳ رقم
        };
        priceInput.onfocus = (e) => {
            const val = parseLocaleNumber(e.target.value);
            if(val > 0) e.target.value = val; // نمایش عدد خام برای ویرایش راحت
        };
    }
    
    // مدیریت تغییر واحدها در دراپ‌داون
    const baseUnitSelect = document.getElementById('mat-base-unit-select');
    if(baseUnitSelect) baseUnitSelect.onchange = updateUnitDropdowns;
    
    const scraperUnit = document.getElementById('mat-scraper-unit');
    if(scraperUnit) scraperUnit.onchange = calculateScraperFactor;
    
    const priceUnit = document.getElementById('mat-purchase-unit'); // تغییر نام به purchase-unit طبق اسکیما
    if(priceUnit) priceUnit.onchange = calculateScraperFactor;

    // ---------------------------------------------------------
    // رفع مشکل ۲: اسکرپر و کالای جدید
    // ---------------------------------------------------------
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        // بررسی اینکه آیا کالا ذخیره شده است؟
        const currentId = document.getElementById('mat-id').value;
        if(!currentId) {
            alert('⚠️ لطفاً ابتدا کالا را ذخیره کنید، سپس درخواست بروزرسانی قیمت دهید.');
            return;
        }

        if(!confirm('آیا از بروزرسانی اتوماتیک قیمت‌ها از سایت مرجع اطمینان دارید؟')) return;
        
        scraperBtn.innerText = '⏳ در حال استعلام...';
        scraperBtn.disabled = true;
        try { 
            // فراخوانی فانکشن سرور
            const result = await api.runScraper(); 
            if(result.success && result.report) {
                showScraperReport(result.report); 
                refreshCallback(); // رفرش لیست برای دیدن قیمت‌های جدید
            } else {
                alert('خطا: ' + (result.error || 'پاسخ نامعتبر از سرور'));
            }
        } 
        catch(e) { alert('ارتباط با سرور برقرار نشد: ' + e.message); } 
        finally { 
            scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; 
            scraperBtn.disabled = false;
        }
    };

    // ---------------------------------------------------------
    // ویژگی جدید ۳: دکمه بکاپ‌گیری کامل (Full Backup)
    // این دکمه را به هدر متریال اضافه می‌کنیم
    // ---------------------------------------------------------
    const headerActions = document.querySelector('#tab-materials .flex.justify-between');
    if(headerActions && !document.getElementById('btn-full-backup')) {
        const backupBtn = document.createElement('button');
        backupBtn.id = 'btn-full-backup';
        backupBtn.className = 'text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 mr-2';
        backupBtn.innerHTML = '💾 دانلود بکاپ (JSON)';
        backupBtn.onclick = exportDatabase;
        headerActions.appendChild(backupBtn);
    }
}

// تابع بکاپ‌گیری از کل دیتابیس موجود در State
function exportDatabase() {
    const data = {
        timestamp: new Date().toISOString(),
        version: "3.0",
        materials: state.materials,
        formulas: state.formulas,
        categories: state.categories,
        units: state.units
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "conex_bom_backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// نمایش گزارش اسکرپر (بدون تغییر عمده نسبت به قبل)
function showScraperReport(report) {
    // (کد این بخش مشابه نسخه قبل است که در فایل آپلودی شما بود - برای خلاصه شدن تکرار نمی‌کنم مگر نیاز باشد)
    // ... کد نمایش مودال ...
    // برای اجرا شدن صحیح، کد قبلی را اینجا فرض کنید یا از فایل قبلی کپی کنید.
    // اما یک تغییر کوچک: نمایش دقیق خطاها
    const existing = document.getElementById('report-modal');
    if(existing) existing.remove();
    // ... (ادامه کد نمایش مودال مانند قبل)
    let content = '';
    if(!report || report.length === 0) content = '<p class="text-center text-slate-400 py-4">نتیجه‌ای یافت نشد.</p>';
    else {
        report.forEach(item => {
            let style = { bg: 'bg-slate-50', border: 'border-slate-200', icon: '⚪', text: 'text-slate-600' };
            if(item.status === 'success') style = { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅', text: 'text-emerald-700' };
            if(item.status === 'error') style = { bg: 'bg-rose-50', border: 'border-rose-200', icon: '❌', text: 'text-rose-700' };
            const newP = formatPrice(item.new || 0);
            content += `
            <div class="border rounded-lg p-3 mb-2 ${style.bg} ${style.border} text-sm">
                <div class="flex justify-between font-bold ${style.text} mb-1">
                    <span>${style.icon} ${item.name}</span>
                    <span class="text-[10px] opacity-70 uppercase border px-1 rounded bg-white">${item.status}</span>
                </div>
                <div class="text-xs text-slate-600">${item.msg}</div>
                ${item.status === 'success' ? `<div class="mt-1 text-xs font-bold text-emerald-600">قیمت جدید: ${newP} تومان</div>` : ''}
            </div>`;
        });
    }
    // ... رندر مودال ...
    const html = `
    <div class="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" id="report-modal">
        <div class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div class="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 class="font-bold text-slate-800">گزارش عملیات</h3>
                <button onclick="document.getElementById('report-modal').remove()" class="text-slate-400 text-2xl">&times;</button>
            </div>
            <div class="p-4 overflow-y-auto flex-1">${content}</div>
            <div class="p-4 border-t bg-slate-50"><button onclick="document.getElementById('report-modal').remove()" class="btn btn-primary w-full">بستن</button></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

// ... توابع مدیریت UI روابط (renderRelationsUI, addRelationRow, updateUnitDropdowns) ...
// (فرض بر این است که این توابع در فایل هستند، مشابه نسخه قبلی)
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
            <input type="number" step="any" class="input-field h-9 w-16 text-center font-bold text-slate-700 text-xs border-slate-200 bg-slate-50 rel-qty-unit" value="${rel.qtyUnit || 1}">
            <select class="input-field h-9 w-28 px-2 text-xs rel-name-select border-slate-200 bg-white text-slate-700">${options}</select>
            <span class="text-slate-400 text-lg">=</span>
            <input type="number" step="any" class="input-field h-9 w-16 text-center font-bold text-slate-500 text-xs border-slate-200 bg-slate-50 rel-qty-base" value="${rel.qtyBase || 1}">
            <span class="text-slate-500 text-xs w-16 truncate base-unit-label font-bold">${baseUnitName}</span>
            <button type="button" class="text-slate-300 hover:text-rose-500 px-2 text-lg mr-auto transition-colors btn-remove-rel">×</button>
        `;
        
        const updateRow = () => {
            currentUnitRelations[index].name = row.querySelector('.rel-name-select').value;
            currentUnitRelations[index].qtyUnit = parseFloat(row.querySelector('.rel-qty-unit').value) || 1;
            currentUnitRelations[index].qtyBase = parseFloat(row.querySelector('.rel-qty-base').value) || 1;
            updateUnitDropdowns();
        };
        row.querySelectorAll('input, select').forEach(el => el.onchange = updateRow); // استفاده از change برای بهینگی
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
    
    // آپدیت سلکت‌های فرم
    const ids = ['mat-purchase-unit', 'mat-consumption-unit', 'mat-scraper-unit'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            const prev = el.value;
            el.innerHTML = optionsHtml;
            if(availableUnits.includes(prev)) el.value = prev;
        }
    });
    
    const labels = document.querySelectorAll('.base-unit-label');
    if(labels) labels.forEach(el => el.innerText = baseUnit);
    calculateScraperFactor();
}

function getFactorToBase(unitName) {
    const baseElem = document.getElementById('mat-base-unit-select');
    const baseUnit = baseElem ? baseElem.value : '';
    if (unitName === baseUnit) return 1;
    const rel = currentUnitRelations.find(r => r.name === unitName);
    if (!rel) return 1; 
    return rel.qtyBase / rel.qtyUnit;
}

function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    const pSelect = document.getElementById('mat-purchase-unit'); // واحد خرید مبنا است
    const factorInput = document.getElementById('mat-scraper-factor');
    if(!sSelect || !pSelect || !factorInput) return;
    
    const sUnit = sSelect.value;
    const pUnit = pSelect.value;
    
    const sFactor = getFactorToBase(sUnit);
    const pFactor = getFactorToBase(pUnit);
    
    let rate = 1;
    if (sFactor !== 0) rate = pFactor / sFactor;
    
    factorInput.value = rate; 
}

// ---------------------------------------------------------
// ذخیره کالا (با ساختار دیتابیس جدید)
// ---------------------------------------------------------
async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    calculateScraperFactor();
    const scraperFactorVal = parseFloat(document.getElementById('mat-scraper-factor').value) || 1;
    const purchaseUnitVal = document.getElementById('mat-purchase-unit').value;
    const consumptionUnitVal = document.getElementById('mat-consumption-unit') ? document.getElementById('mat-consumption-unit').value : purchaseUnitVal;
    
    const hasTax = document.getElementById('mat-has-tax').checked;

    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        price: parseLocaleNumber(document.getElementById('mat-price').value),
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_anchor: document.getElementById('mat-scraper-anchor').value || null,
        
        // طبق اسکیما جدید:
        unit: purchaseUnitVal, // فیلد لگسی
        purchase_unit: purchaseUnitVal,
        consumption_unit: consumptionUnitVal,
        
        scraper_factor: scraperFactorVal,
        has_tax: hasTax,
        
        unit_relations: JSON.stringify({
            base: document.getElementById('mat-base-unit-select').value,
            others: currentUnitRelations,
            // ذخیره واحدهای انتخابی برای پر کردن مجدد فرم
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
    } catch(e){ 
        console.error(e);
        alert('خطا در ذخیره: ' + e.message); 
    }
}

export function renderMaterials(filter='') {
    // پر کردن دراپ‌داون واحد پایه اگر خالی بود
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(baseSelect && state.units.length > 0 && baseSelect.options.length === 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        updateUnitDropdowns(); // فراخوانی اولیه
    }

    const sortElem = document.getElementById('sort-materials');
    const sort = sortElem ? sortElem.value : 'update_desc';
    
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    // لاجیک سورت (مشابه قبل)
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
        
        // نمایش واحد خرید
        const pUnit = m.purchase_unit || m.unit || 'واحد';
        
        // بررسی مالیات برای تغییر رنگ
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
        if(confirm('آیا از حذف این کالا اطمینان دارید؟')) { 
            try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); } 
            catch(e) { alert(e.message); } 
        }
    });
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    if(!m) return;
    
    resetMatForm(); // اول ریست کنیم که تمیز شه

    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || '';
    document.getElementById('mat-category').value = m.category_id || '';
    document.getElementById('mat-has-tax').checked = !!m.has_tax; 
    
    // بازیابی قیمت (بدون فرمت برای نمایش صحیح در اینپوت)
    document.getElementById('mat-price').value = m.price; 
    
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    document.getElementById('mat-scraper-anchor').value = m.scraper_anchor || '';
    
    // بازیابی روابط و واحدها
    try {
        const rels = JSON.parse(m.unit_relations || '{}');
        const baseSelect = document.getElementById('mat-base-unit-select');
        
        // اگر واحدها هنوز لود نشده‌اند، موقتا پر کنیم
        if(state.units.length === 0) baseSelect.innerHTML = `<option value="${rels.base || 'Unit'}">${rels.base || 'Unit'}</option>`;
        
        if(rels.base) baseSelect.value = rels.base;
        currentUnitRelations = (rels.others || []).map(r => ({ name: r.name, qtyUnit: r.qtyUnit || 1, qtyBase: r.qtyBase || 1 }));
        
        renderRelationsUI(); 
        updateUnitDropdowns();
        
        // انتخاب واحدهای ذخیره شده
        if(rels.selected_purchase) document.getElementById('mat-purchase-unit').value = rels.selected_purchase;
        else if(m.purchase_unit) document.getElementById('mat-purchase-unit').value = m.purchase_unit; // پشتیبانی از دیتای قدیمی

        if(rels.selected_consumption) {
            const el = document.getElementById('mat-consumption-unit');
            if(el) el.value = rels.selected_consumption;
        }

        if(rels.selected_scraper) document.getElementById('mat-scraper-unit').value = rels.selected_scraper;
        
        calculateScraperFactor(); 
    } catch(e) { 
        console.error("Error parsing unit relations", e);
        currentUnitRelations = []; 
        renderRelationsUI(); 
    }

    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره تغییرات';
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    
    // اسکرول به فرم در موبایل
    if(window.innerWidth < 768) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    currentUnitRelations = [];
    renderRelationsUI();
    updateUnitDropdowns(); // برمی‌گرداند به حالت پیش‌فرض
    
    const btn = document.getElementById('mat-submit-btn');
    if(btn) btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}
