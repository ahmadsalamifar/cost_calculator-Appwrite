import { state } from './config.js';
import { formatPrice, formatDate } from './utils.js';
import { calculateCost, getUnitFactor } from './formulas_calc.js';

// رندر لیست سمت راست (لیست اصلی فرمول‌ها)
export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    if(!el) return;

    if(!list.length) { 
        el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">لیست خالی است</p>'; 
        return; 
    }
    
    el.innerHTML = list.map(f => {
        const calc = calculateCost(f); 
        const isActive = f.$id === state.activeFormulaId;
        return `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${isActive ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none flex justify-between">
                <span>${formatDate(f.$updatedAt)}</span>
                <span class="font-bold text-teal-700">${formatPrice(calc.final)} T</span>
            </div>
        </div>`;
    }).join('');
}

// رندر جزئیات فرمول (پنل وسط)
export function renderFormulaDetail(f) {
    if(!f) return;

    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('active-formula-date').innerText = "بروزرسانی: " + formatDate(f.$updatedAt);
    
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    setVal('inp-labor', formatPrice(f.labor));
    setVal('inp-overhead', formatPrice(f.overhead));
    setVal('inp-profit', f.profit);
    
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e) {}
    
    const listEl = document.getElementById('formula-comps-list');
    
    if(comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">اجزای سازنده را اضافه کنید...</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name = '?', unitName = '-', price = 0, total = 0;
            let taxBadge = '', warning = '';

            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) { 
                    name = m.display_name || m.name;
                    unitName = c.unit || 'واحد';
                    if(m.has_tax) taxBadge = '<span class="text-[9px] text-rose-500 bg-rose-50 px-1 rounded ml-1 border border-rose-100">+۱۰٪</span>';

                    try {
                        let baseMatPrice = m.price;
                        if(m.has_tax) baseMatPrice *= 1.10;

                        const rels = JSON.parse(m.unit_relations || '{}');
                        const priceUnit = m.purchase_unit || rels.price_unit || 'عدد';
                        
                        const priceFactor = getUnitFactor(m, priceUnit);
                        const selectedUnitFactor = getUnitFactor(m, unitName);

                        if(priceFactor !== 0) {
                            const basePrice = baseMatPrice / priceFactor;
                            price = basePrice * selectedUnitFactor;
                        }
                    } catch(e) { price = m.price; warning = '⚠️'; }
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
                <div class="flex-grow min-w-0">
                    <div class="font-bold text-slate-700 text-xs flex items-center gap-1 truncate">
                        ${warning} ${name} ${taxBadge}
                    </div>
                    <div class="text-[10px] text-slate-500 mt-1">
                        <span class="font-mono font-bold bg-slate-200 px-1.5 rounded text-slate-700">${c.qty}</span>
                        <span class="mx-1 text-teal-700">${unitName}</span>
                        <span class="opacity-40 mx-1">×</span>
                        <span class="opacity-70 font-mono">${formatPrice(price)}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <div class="text-right font-mono font-bold text-slate-700 text-xs w-20">${formatPrice(total)}</div>
                    <button class="text-rose-400 lg:opacity-0 group-hover:opacity-100 px-2 btn-del-comp transition-opacity" data-idx="${idx}">×</button>
                </div>
            </div>`;
        }).join('');
    }
    
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
    
    updateDropdowns();
    updateCompSelect();
    updateCompUnitSelect();
}

export function updateDropdowns() {
    const filterEl = document.getElementById('comp-filter');
    if(!filterEl) return;
    const current = filterEl.value;
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    filterEl.innerHTML = '<option value="">همه دسته‌ها...</option>' + c + '<option value="FORM">فرمول‌ها (محصولات)</option>';
    filterEl.value = current;
}

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

export function updateCompUnitSelect() {
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
            
            const defaultUnit = m.consumption_unit || rels.selected_consumption;
            if(defaultUnit && !options.includes(defaultUnit)) options.push(defaultUnit);
            if(options.length === 0) options.push('عدد');
        } catch(e) { options.push('عدد'); }
        
        unitSelect.innerHTML = options.map(u => `<option value="${u}">${u}</option>`).join('');
        if(m.consumption_unit) unitSelect.value = m.consumption_unit;
    }
}