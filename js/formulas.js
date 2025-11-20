import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, parseLocaleNumber, formatDate, openModal, closeModal } from './utils.js';

// ... (Setup Functions - بدون تغییر عمده) ...
export function setupFormulas(refreshCallback) {
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = () => createFormula(refreshCallback);
    
    const searchEl = document.getElementById('search-formulas');
    if(searchEl) searchEl.oninput = (e) => renderFormulaList(e.target.value);
    
    document.getElementById('form-add-comp').onsubmit = (e) => { e.preventDefault(); addComp(refreshCallback); };
    
    ['labor', 'overhead', 'profit'].forEach(key => {
        document.getElementById('inp-' + key).onchange = (e) => updateCostVariables(key, e.target.value, refreshCallback);
    });
    
    document.getElementById('comp-filter').onchange = updateCompSelect;
    document.getElementById('comp-select').onchange = updateCompUnitSelect;
    
    document.getElementById('formula-master-list').addEventListener('click', (e) => {
        const item = e.target.closest('[data-id]');
        if(item) selectFormula(item.getAttribute('data-id'), refreshCallback);
    });
    
    document.getElementById('btn-duplicate-formula').onclick = () => duplicateFormula(refreshCallback);
    document.getElementById('active-formula-name').onclick = () => renameFormula(refreshCallback);
    document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);
}

export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">لیست خالی است</p>'; return; }
    
    el.innerHTML = list.map(f => {
        const calc = calculateCost(f); // محاسبه قیمت زنده
        return `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none flex justify-between">
                <span>${formatDate(f.$updatedAt)}</span>
                <span class="font-bold text-teal-700">${formatPrice(calc.final)} T</span>
            </div>
        </div>`;
    }).join('');
}

// ... (selectFormula, renderFormulaDetail - تغییرات جزئی برای نمایش مالیات) ...
export function selectFormula(id, refreshCallback) {
    state.activeFormulaId = id;
    renderFormulaList(); // برای هایلایت شدن آیتم فعال
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f, refreshCallback);
    if(window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({behavior:'smooth'});
}

export function renderFormulaDetail(f, refreshCallback) {
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('active-formula-date').innerText = "بروزرسانی: " + formatDate(f.$updatedAt);
    
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;
    
    updateDropdowns(); updateCompSelect(); updateCompUnitSelect();

    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e) {}
    const listEl = document.getElementById('formula-comps-list');
    
    if(comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">اجزای سازنده را اضافه کنید...</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name = '?', unitName = '-', price = 0, total = 0;
            let taxBadge = '';
            let warning = '';

            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) { 
                    name = m.display_name || m.name;
                    unitName = c.unit || 'واحد';
                    
                    // -----------------------------------------------
                    // نمایش وضعیت مالیات در لیست اجزا
                    // -----------------------------------------------
                    let baseMatPrice = m.price;
                    if(m.has_tax) {
                        // اینجا قیمت نمایشی را تغییر نمی‌دهیم تا کاربر قیمت خام را ببیند
                        // اما یک بج اضافه می‌کنیم که بداند مالیات محاسبه می‌شود
                        taxBadge = '<span class="text-[9px] text-rose-500 bg-rose-50 px-1 rounded ml-1 border border-rose-100" title="۱۰٪ مالیات در قیمت کل اعمال شده">+۱۰٪</span>';
                    }

                    try {
                        const rels = JSON.parse(m.unit_relations || '{}');
                        const priceUnit = m.purchase_unit || rels.price_unit; // استفاده از purchase_unit
                        const priceFactor = getUnitFactor(m, priceUnit);
                        
                        if(priceFactor === 0) throw new Error('FactorZero');
                        
                        const basePrice = baseMatPrice / priceFactor; // قیمت بر اساس واحد پایه
                        const selectedUnitFactor = getUnitFactor(m, unitName);
                        price = basePrice * selectedUnitFactor;
                        
                        // اعمال مالیات برای نمایش "قیمت واحد موثر" (اختیاری، اینجا اعمال می‌کنیم تا جمع درست دربیاید)
                        if(m.has_tax) price = price * 1.10;

                    } catch(e) { 
                        price = baseMatPrice; 
                        warning = '<span class="text-amber-500 text-xs" title="مشکل در تبدیل واحد">⚠️</span>';
                    }
                } else { name = '(کالای حذف شده)'; warning='⚠️'; }
            } else {
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) { 
                    name = `🔗 ${sub.name}`; 
                    unitName = 'عدد'; 
                    price = calculateCost(sub).final; 
                } 
                else { name = '(فرمول حذف شده)'; warning='⚠️'; }
            }
            
            total = price * c.qty;
            
            return `
            <div class="flex justify-between items-center p-3 text-sm hover:bg-slate-50 group border-b border-slate-50">
                <div class="flex-grow">
                    <div class="font-bold text-slate-700 text-xs flex items-center gap-1">
                        ${warning} ${name} ${taxBadge}
                    </div>
                    <div class="text-[10px] text-slate-500 mt-1">
                        <span class="font-mono font-bold bg-slate-200 px-1.5 rounded text-slate-700">${c.qty}</span>
                        <span class="mx-1 text-teal-700">${unitName}</span>
                        <span class="opacity-40 mx-1">×</span>
                        <span class="opacity-70" title="قیمت واحد موثر (با مالیات)">${formatPrice(price)}</span>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-right"><div class="font-mono font-bold text-slate-700 text-xs">${formatPrice(total)}</div></div>
                    <button class="text-rose-400 opacity-0 group-hover:opacity-100 px-2 btn-del-comp transition-opacity" data-idx="${idx}">×</button>
                </div>
            </div>`;
        }).join('');
        
        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f, parseInt(btn.dataset.idx), refreshCallback);
        });
    }
    
    // محاسبه نهایی
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
}

function getUnitFactor(material, unitName) {
    if (!material || !unitName) return 1;
    try {
        const rels = JSON.parse(material.unit_relations || '{}');
        if (unitName === rels.base) return 1;
        const found = (rels.others || []).find(u => u.name === unitName);
        if (found) return found.qtyBase / found.qtyUnit;
        return 1;
    } catch (e) { return 1; }
}

// ---------------------------------------------------------
// رفع باگ ۳: اعمال مالیات در محاسبه هزینه
// ---------------------------------------------------------
export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0;
    const comps = JSON.parse(f.components || '[]');
    
    comps.forEach(c => {
        if(c.type==='mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if(m) {
                let currentPrice = m.price;
                
                // ====================================================
                // اعمال ۱۰٪ مالیات اگر تیک has_tax خورده باشد
                // ====================================================
                if(m.has_tax === true) {
                    currentPrice = currentPrice * 1.10;
                }

                const rels = JSON.parse(m.unit_relations || '{}');
                // پشتیبانی از فیلد جدید purchase_unit
                const priceUnit = m.purchase_unit || rels.price_unit || m.unit;
                
                const priceFactor = getUnitFactor(m, priceUnit);
                const selectedFactor = getUnitFactor(m, c.unit);
                
                if(priceFactor !== 0) {
                    // فرمول: (قیمت خرید / ضریب خرید) * ضریب مصرف * تعداد
                    matCost += (currentPrice / priceFactor) * selectedFactor * c.qty;
                }
            }
        } else {
            // اگر جزء فرمول دیگری باشد (Recursive)
            const sub = state.formulas.find(x => x.$id === c.id);
            if(sub) matCost += calculateCost(sub).final * c.qty;
        }
    });

    const sub = matCost + (f.labor||0) + (f.overhead||0);
    const profit = (f.profit||0)/100 * sub;
    return {matCost, sub, profit, final: sub+profit};
}

// ... (updateDropdowns, updateCompSelect, updateCompUnitSelect و توابع CRUD فرمول‌ها بدون تغییر عمده) ...
// برای جلوگیری از طولانی شدن، کد بخش‌های دیگر را مشابه فایل قبلی در نظر بگیرید.
// فقط جاهایی که از unit استفاده می‌شد را برای اطمینان چک کنید که مشکلی نسازد.
export function updateDropdowns() {
    const filterEl = document.getElementById('comp-filter');
    if(!filterEl) return;
    const current = filterEl.value;
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    filterEl.innerHTML = '<option value="">همه دسته‌ها...</option>' + c + '<option value="FORM">فرمول‌ها (محصولات نیمه‌ساخته)</option>';
    filterEl.value = current;
}
// ... بقیه توابع ...
export function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    if(!sel) return;
    let h = '<option value="">انتخاب کنید...</option>'; 
    if(f === 'FORM') {
        h += `<optgroup label="فرمول‌ها">` + state.formulas.filter(x => x.$id !== state.activeFormulaId).map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('') + `</optgroup>`;
    } else {
        state.categories.forEach(cat => {
            if(f && f !== 'FORM' && f !== cat.$id) return;
            const m = state.materials.filter(x => x.category_id === cat.$id);
            if(m.length) h += `<optgroup label="${cat.name}">` + m.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        });
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) h += `<optgroup label="سایر">` + o.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
    }
    sel.innerHTML = h;
    updateCompUnitSelect();
}

function updateCompUnitSelect() {
    const matSelect = document.getElementById('comp-select');
    const unitSelect = document.getElementById('comp-unit-select');
    if(!matSelect || !unitSelect) return;
    const val = matSelect.value;
    if(!val || val.startsWith('FORM:')) { unitSelect.innerHTML = '<option value="count">عدد</option>'; return; }

    const id = val.split(':')[1];
    const m = state.materials.find(x => x.$id === id);
    if(m) {
        let options = [];
        try {
            const rels = JSON.parse(m.unit_relations || '{}');
            if(rels.base) options.push(rels.base);
            if(rels.others) rels.others.forEach(u => options.push(u.name));
            
            // واحد مصرف را به عنوان گزینه اول انتخاب کن
            const defaultUnit = m.consumption_unit || rels.selected_consumption;
            if(defaultUnit && !options.includes(defaultUnit)) options.push(defaultUnit);

            if(options.length === 0) options.push('عدد');
        } catch(e) { options.push('عدد'); }
        
        unitSelect.innerHTML = options.map(u => `<option value="${u}">${u}</option>`).join('');
        
        // انتخاب پیش‌فرض: واحد مصرف
        if(m.consumption_unit) unitSelect.value = m.consumption_unit;
    }
}

async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if(!name) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {name, components: '[]', labor: 0.0, overhead: 0.0, profit: 0.0, is_public: false});
        closeModal('new-formula-modal'); document.getElementById('new-formula-name').value = ''; cb(); 
    } catch(e) { alert(e.message); }
}

async function addComp(refreshCb) {
    if(!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    const unit = document.getElementById('comp-unit-select').value;
    if(!val || !qty) { alert('لطفا مقدار و کالا را وارد کنید'); return; }
    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = JSON.parse(f.components || '[]');
    const exist = comps.find(c => c.id === id && c.type === type && c.unit === unit);
    if(exist) exist.qty += qty; else comps.push({id, type, qty, unit});
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components: JSON.stringify(comps) });
        document.getElementById('comp-qty').value = '';
        f.components = JSON.stringify(comps);
        renderFormulaDetail(f, refreshCb);
    } catch(e) { alert(e.message); }
}

async function removeComp(f, idx, cb) {
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, { components: JSON.stringify(comps) });
        f.components = JSON.stringify(comps);
        renderFormulaDetail(f, cb);
    } catch(e) { alert(e.message); }
}

async function updateCostVariables(key, val, cb) {
    if(!state.activeFormulaId) return;
    const numVal = parseLocaleNumber(val);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: numVal });
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if(f) { f[key] = numVal; renderFormulaDetail(f, cb); }
    } catch(e) {}
}

async function duplicateFormula(cb) {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!confirm('کپی از این فرمول ایجاد شود؟')) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, { name: "کپی " + f.name, components: f.components, labor: f.labor, overhead: f.overhead, profit: f.profit, is_public: false });
        alert('کپی ایجاد شد'); cb(); 
    } catch(e) { alert(e.message); }
}

async function renameFormula(cb) {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید:', cur);
    if(n && n !== cur) { try { await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); cb(); } catch(e) {} }
}

async function deleteFormula(cb) {
    if(confirm('حذف شود؟')) {
        try { await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId); state.activeFormulaId = null; document.getElementById('formula-detail-view').classList.add('hidden'); document.getElementById('formula-detail-empty').classList.remove('hidden'); cb(); } catch(e) { alert(e.message); }
    }
}
