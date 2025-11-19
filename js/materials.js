import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, getDateBadge } from './utils.js';

// ساختار جدید: نگهداری مقادیر دقیق ورودی کاربر (تعداد واحد فرعی و تعداد واحد پایه)
// مثال: { name: 'متر', qtyUnit: 6, qtyBase: 1 }  -> یعنی 6 متر = 1 واحد پایه
let currentUnitRelations = []; 

export function setupMaterials(refreshCallback) {
    document.getElementById('material-form').onsubmit = (e) => { 
        e.preventDefault(); 
        saveMaterial(refreshCallback); 
    };
    
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
    
    document.getElementById('btn-add-relation').onclick = addRelationRow;
    
    // تریگرها
    document.getElementById('mat-base-unit-select').onchange = updateUnitDropdowns;
    
    // وقتی واحدهای خرید/مصرف تغییر می‌کنند، محاسبات دوباره انجام شود
    document.getElementById('mat-purchase-unit').onchange = () => { calculateConversionRate(); calculateScraperFactor(); };
    document.getElementById('mat-consumption-unit').onchange = calculateConversionRate;
    document.getElementById('mat-scraper-unit').onchange = calculateScraperFactor;
    
    const scraperBtn = document.getElementById('btn-scraper-trigger');
    if(scraperBtn) scraperBtn.onclick = async () => {
        if(!confirm('قیمت‌ها از سایت‌های مرجع بروزرسانی شوند؟')) return;
        scraperBtn.innerText = '⏳ ...';
        try {
            await api.runScraper();
            alert('انجام شد. صفحه رفرش می‌شود.');
            refreshCallback();
        } catch(e) { alert('خطا: ' + e.message); }
        finally { scraperBtn.innerText = '🤖 بروزرسانی قیمت‌ها'; }
    };
}

// --- (مهم) رابط کاربری جدید برای تعریف روابط ---

function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    container.innerHTML = '';
    
    const baseUnitName = document.getElementById('mat-base-unit-select').value || 'واحد پایه';
    
    currentUnitRelations.forEach((rel, index) => {
        // ساخت لیست واحدها برای دراپ‌داون
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        
        const row = document.createElement('div');
        row.className = 'flex items-center gap-1 bg-slate-50 p-2 rounded border border-slate-200 mb-1 text-xs';
        
        // فرمول: [تعداد] [واحد فرعی] = [تعداد] [واحد پایه]
        // مثال: [6] [متر] = [1] [شاخه]
        row.innerHTML = `
            <span class="text-slate-400 w-4 text-center font-bold">${index+1}</span>
            
            <input type="number" step="any" class="input-field h-8 w-14 text-center font-bold text-blue-600 px-1 rel-qty-unit" value="${rel.qtyUnit || 1}" placeholder="تعداد">
            
            <select class="input-field h-8 w-24 px-1 rel-name-select font-bold">${options}</select>
            
            <span class="font-bold text-slate-400 mx-1">=</span>
            
            <input type="number" step="any" class="input-field h-8 w-14 text-center font-bold text-slate-700 px-1 rel-qty-base" value="${rel.qtyBase || 1}" placeholder="تعداد">
            
            <span class="text-slate-600 text-[10px] w-16 truncate base-unit-label font-bold" title="${baseUnitName}">${baseUnitName}</span>
            
            <button type="button" class="text-rose-500 text-lg font-bold px-2 hover:bg-rose-100 rounded btn-remove-rel mr-auto">×</button>
        `;
        
        // اتصال رویدادها برای ذخیره تغییرات
        const updateRow = () => {
            currentUnitRelations[index].name = row.querySelector('.rel-name-select').value;
            currentUnitRelations[index].qtyUnit = parseFloat(row.querySelector('.rel-qty-unit').value) || 1;
            currentUnitRelations[index].qtyBase = parseFloat(row.querySelector('.rel-qty-base').value) || 1;
            updateUnitDropdowns(); // آپدیت سایر بخش‌ها
        };

        row.querySelector('.rel-name-select').onchange = updateRow;
        row.querySelector('.rel-qty-unit').oninput = updateRow;
        row.querySelector('.rel-qty-base').oninput = updateRow;
        
        row.querySelector('.btn-remove-rel').onclick = () => { 
            currentUnitRelations.splice(index, 1); 
            renderRelationsUI(); 
            updateUnitDropdowns(); 
        };
        
        container.appendChild(row);
    });
    
    // آپدیت نام واحد پایه در همه سطرها
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnitName);
}

function addRelationRow() {
    // انتخاب یک واحد پیش‌فرض که هنوز استفاده نشده
    const usedNames = currentUnitRelations.map(r => r.name);
    const available = state.units.find(u => !usedNames.includes(u.name));
    const name = available ? available.name : (state.units[0]?.name || 'Unit');
    
    // پیش‌فرض: 1 واحد جدید = 1 واحد پایه
    currentUnitRelations.push({ name: name, qtyUnit: 1, qtyBase: 1 });
    renderRelationsUI();
    updateUnitDropdowns();
}

// --- محاسبات هوشمند ضرایب ---

// تابع کمکی: محاسبه ضریب "استاندارد" نسبت به واحد پایه
// این تابع می‌گوید: ۱ واحد از این چیز، چند واحد پایه است؟
// مثال: اگر ۶ متر = ۱ شاخه (پایه)، پس ۱ متر = ۰.۱۶۶ شاخه. خروجی: ۰.۱۶۶
function getFactorToBase(unitName) {
    const baseUnit = document.getElementById('mat-base-unit-select').value;
    if (unitName === baseUnit) return 1;

    const rel = currentUnitRelations.find(r => r.name === unitName);
    if (!rel) return 1; // اگر پیدا نشد فرض می‌کنیم ۱ است

    // فرمول: (تعداد پایه) / (تعداد فرعی)
    // مثال: 15.5 کیلو = 1 شاخه -> ضریب کیلو = 1 / 15.5 = 0.0645
    // مثال: 1 بندیل = 100 شاخه -> ضریب بندیل = 100 / 1 = 100
    return rel.qtyBase / rel.qtyUnit;
}

function updateUnitDropdowns() {
    const baseUnit = document.getElementById('mat-base-unit-select').value;
    
    // ساخت لیست واحدهای موجود (پایه + همه فرعی‌ها)
    let availableUnits = [baseUnit];
    currentUnitRelations.forEach(r => availableUnits.push(r.name));
    
    // حذف تکراری‌ها
    availableUnits = [...new Set(availableUnits)];

    const optionsHtml = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
    
    const pSelect = document.getElementById('mat-purchase-unit');
    const cSelect = document.getElementById('mat-consumption-unit');
    const sSelect = document.getElementById('mat-scraper-unit');
    
    // حفظ انتخاب قبلی
    const prevP = pSelect.value;
    const prevC = cSelect.value;
    const prevS = sSelect.value;
    
    pSelect.innerHTML = optionsHtml;
    cSelect.innerHTML = optionsHtml;
    sSelect.innerHTML = optionsHtml;
    
    if(availableUnits.includes(prevP)) pSelect.value = prevP;
    if(availableUnits.includes(prevC)) cSelect.value = prevC;
    if(availableUnits.includes(prevS)) sSelect.value = prevS;
    
    // آپدیت نام‌ها در لیست
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
    
    calculateConversionRate();
    calculateScraperFactor();
}

function calculateConversionRate() {
    const pUnit = document.getElementById('mat-purchase-unit').value;
    const cUnit = document.getElementById('mat-consumption-unit').value;
    
    const pFactor = getFactorToBase(pUnit); // هر واحد خرید، چند تا پایه است؟
    const cFactor = getFactorToBase(cUnit); // هر واحد مصرف، چند تا پایه است؟
    
    // ضریب نهایی = ضریب خرید / ضریب مصرف
    // مثال: خرید بندیل (100 پایه)، مصرف شاخه (1 پایه). ضریب = 100/1 = 100
    // مثال: خرید شاخه (1 پایه)، مصرف متر (1/6 پایه). ضریب = 1 / (1/6) = 6
    let rate = 1;
    if (cFactor !== 0) rate = pFactor / cFactor;
    
    document.getElementById('mat-conversion-rate').value = rate;
    document.getElementById('lbl-calc-rate').innerText = parseFloat(rate.toFixed(4));
}

function calculateScraperFactor() {
    const sUnit = document.getElementById('mat-scraper-unit').value; // واحد سایت
    const pUnit = document.getElementById('mat-purchase-unit').value; // واحد خرید ما
    
    const sFactor = getFactorToBase(sUnit);
    const pFactor = getFactorToBase(pUnit);
    
    // ما می‌خواهیم قیمتِ "واحد خرید" را بدست آوریم.
    // سایت قیمتِ "واحد سایت" را می‌دهد.
    // فرمول: قیمت خرید = قیمت سایت * (ضریب خرید / ضریب سایت)
    
    // مثال: خرید شاخه (۱۵.۵ کیلو)، سایت کیلو (۱ کیلو).
    // pFactor (شاخه) = 1 (چون فرض کنیم پایه است) ؟ نه صبر کنید.
    // بیایید با مثال واقعی شما برویم:
    // پایه = شاخه.
    // رابطه: 15.5 کیلو = 1 شاخه. -> ضریب کیلو = 1/15.5 = 0.0645
    // خرید = شاخه (ضریب 1).
    // سایت = کیلو (ضریب 0.0645).
    // نرخ تبدیل = 1 / 0.0645 = 15.5.
    // قیمت شاخه = قیمت کیلو * 15.5. (درست است!)
    
    let rate = 1;
    if (sFactor !== 0) rate = pFactor / sFactor;
    
    document.getElementById('mat-scraper-factor').value = rate;
    document.getElementById('lbl-scraper-calc').innerText = parseFloat(rate.toFixed(4));
}

// --- ذخیره و لود (CRUD) ---

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    
    const data = {
        name: document.getElementById('mat-name').value,
        display_name: document.getElementById('mat-display-name').value || null,
        category_id: document.getElementById('mat-category').value || null,
        purchase_unit: document.getElementById('mat-purchase-unit').value,
        consumption_unit: document.getElementById('mat-consumption-unit').value,
        conversion_rate: parseFloat(document.getElementById('mat-conversion-rate').value) || 1,
        price: parseLocaleNumber(document.getElementById('mat-price').value),
        scraper_url: document.getElementById('mat-scraper-url').value || null,
        scraper_factor: parseFloat(document.getElementById('mat-scraper-factor').value) || 1,
        // ذخیره کل ساختار روابط
        unit_relations: JSON.stringify({
            base: document.getElementById('mat-base-unit-select').value,
            others: currentUnitRelations, // شامل qtyUnit و qtyBase
            scraper_unit: document.getElementById('mat-scraper-unit').value
        })
    };

    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        resetMatForm();
        cb();
    } catch(e){ alert(e.message); }
}

export function renderMaterials(filter='') {
    // لود اولیه واحد پایه اگر لیست خالی بود
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(state.units.length > 0 && baseSelect.options.length === 0) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
    }

    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter) || (m.display_name && m.display_name.includes(filter)));
    
    list.sort((a,b) => {
        if(sort === 'update_desc') return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        if(sort === 'price_desc') return b.price - a.price;
        return 0;
    });
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const dateBadge = getDateBadge(m.$updatedAt);
        const scraperInfo = m.scraper_url ? `<span class="text-[9px] text-blue-500 bg-blue-50 px-1 rounded border border-blue-100">Link</span>` : '';

        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative hover:border-teal-400 transition-colors shadow-sm">
            <div class="flex justify-between mb-1 items-start">
                <div class="flex flex-col items-start gap-1">
                    <span class="text-[10px] bg-slate-50 px-1 rounded text-slate-400 border border-slate-100">${cat}</span>
                    ${dateBadge}
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button>
                    <button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button>
                </div>
            </div>
            <div class="font-bold text-xs text-slate-800 truncate mt-1">${m.name}</div>
            <div class="flex justify-between items-end mt-2 pt-2 border-t border-dashed border-slate-100">
                <div class="text-[10px] text-slate-400 flex flex-col">
                    <span>${m.consumption_unit}</span>
                    ${scraperInfo}
                </div>
                <div class="text-right">
                     <span class="font-mono font-bold text-teal-700 text-sm">${formatPrice(m.price)}</span>
                     <span class="text-[9px] text-slate-400">/${m.purchase_unit}</span>
                </div>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('حذف؟')) {
            try { await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); refreshCallback(); }
            catch(e) { alert(e.message); }
        }
    });
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    if(!m) return;
    
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-display-name').value = m.display_name || '';
    document.getElementById('mat-category').value = m.category_id || '';
    
    try {
        const rels = JSON.parse(m.unit_relations || '{}');
        
        // 1. انتخاب واحد پایه
        const baseSelect = document.getElementById('mat-base-unit-select');
        if(state.units.length === 0) baseSelect.innerHTML = `<option value="${rels.base}">${rels.base}</option>`;
        if(rels.base) baseSelect.value = rels.base;

        // 2. بازیابی روابط (با پشتیبانی از ساختار جدید و قدیم)
        // ساختار جدید شامل qtyUnit و qtyBase است
        currentUnitRelations = (rels.others || []).map(r => ({
            name: r.name,
            qtyUnit: r.qtyUnit || 1, // اگر قبلی بود پیشفرض 1
            qtyBase: r.qtyBase || r.factor || 1 // فیلد factor برای سازگاری با دیتای قبلی
        }));
        
        renderRelationsUI();
        updateUnitDropdowns();
        
        // 3. انتخاب‌ها
        document.getElementById('mat-purchase-unit').value = m.purchase_unit || '';
        document.getElementById('mat-consumption-unit').value = m.consumption_unit || '';
        if(rels.scraper_unit) document.getElementById('mat-scraper-unit').value = rels.scraper_unit;
        
        calculateConversionRate();
        calculateScraperFactor();

    } catch(e) {
        console.error("Error parsing", e);
        currentUnitRelations = [];
        renderRelationsUI();
    }
    
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-scraper-url').value = m.scraper_url || '';
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ویرایش';
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
    btn.innerText = 'ذخیره کالا';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
    document.getElementById('material-guide').classList.add('hidden');
}
