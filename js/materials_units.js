import { state } from './config.js';
import { parseLocaleNumber } from './utils.js'; // استفاده از تابع کمکی برای اطمینان از اعداد

// وضعیت موقت برای ویرایش واحدها
let currentUnitRelations = [];

export function getUnitData() {
    const getVal = (id) => document.getElementById(id)?.value;
    return {
        base: getVal('mat-base-unit-select') || 'عدد',
        others: currentUnitRelations,
        selected_purchase: getVal('mat-price-unit'),
        selected_consumption: getVal('mat-consumption-unit'),
        selected_scraper: getVal('mat-scraper-unit')
    };
}

export function setUnitData(rels) {
    if (typeof rels === 'string') rels = JSON.parse(rels);
    rels = rels || {};

    const baseSelect = document.getElementById('mat-base-unit-select');
    if (baseSelect) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        
        const savedBase = rels.base || 'عدد';
        if (![...baseSelect.options].some(o => o.value === savedBase)) {
            const opt = document.createElement('option');
            opt.value = savedBase;
            opt.text = `${savedBase} (قدیمی)`;
            baseSelect.add(opt);
        }
        baseSelect.value = savedBase;
    }

    currentUnitRelations = (rels.others || []).map(r => ({ 
        name: r.name, 
        qtyUnit: parseFloat(r.qtyUnit) || 1, 
        qtyBase: parseFloat(r.qtyBase) || 1 
    }));
    
    renderRelationsUI();
    updateUnitDropdowns();
    
    setSelectValue('mat-price-unit', rels.selected_purchase);
    setSelectValue('mat-consumption-unit', rels.selected_consumption);
    setSelectValue('mat-scraper-unit', rels.selected_scraper);
    
    // محاسبه اولیه ضریب
    setTimeout(calculateScraperFactor, 100);
}

export function resetUnitData() {
    currentUnitRelations = [];
    const baseSelect = document.getElementById('mat-base-unit-select');
    if (baseSelect) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        if (baseSelect.options.length > 0) baseSelect.selectedIndex = 0;
    }
    renderRelationsUI();
    updateUnitDropdowns();
}

export function addRelationRow() {
    const usedNames = currentUnitRelations.map(r => r.name);
    const available = state.units.find(u => !usedNames.includes(u.name));
    const name = available ? available.name : (state.units[0]?.name || 'Unit');
    
    currentUnitRelations.push({ name: name, qtyUnit: 1, qtyBase: 1 });
    renderRelationsUI();
    updateUnitDropdowns();
}

export function renderRelationsUI() {
    const container = document.getElementById('unit-relations-container');
    if (!container) return;
    
    container.innerHTML = '';
    const baseElem = document.getElementById('mat-base-unit-select');
    const baseUnitName = baseElem ? (baseElem.value || 'واحد پایه') : 'واحد پایه';
    
    currentUnitRelations.forEach((rel, index) => {
        const options = state.units.map(u => `<option value="${u.name}" ${u.name === rel.name ? 'selected' : ''}>${u.name}</option>`).join('');
        
        const row = document.createElement('div');
        row.className = 'flex items-center gap-1 bg-white p-1 rounded border border-slate-200 mb-1 shadow-sm text-xs';
        row.innerHTML = `
            <input type="number" step="any" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-unit" value="${rel.qtyUnit}">
            <select class="input-field w-24 px-1 h-7 text-[10px] rel-name-select">${options}</select>
            <span>=</span>
            <input type="number" step="any" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-base" value="${rel.qtyBase}">
            <span class="w-12 truncate text-[10px] base-unit-label" title="${baseUnitName}">${baseUnitName}</span>
            <button type="button" class="text-rose-500 px-2 btn-remove-rel text-lg">×</button>
        `;
        
        // Event Listeners با محاسبه مجدد ضریب
        const inputs = row.querySelectorAll('input, select');
        inputs.forEach(el => el.onchange = () => {
            rel.name = row.querySelector('.rel-name-select').value;
            rel.qtyUnit = parseFloat(row.querySelector('.rel-qty-unit').value) || 1;
            rel.qtyBase = parseFloat(row.querySelector('.rel-qty-base').value) || 1;
            updateUnitDropdowns();
            calculateScraperFactor(); // محاسبه مجدد ضریب هنگام تغییر اعداد رابطه
        });

        row.querySelector('.btn-remove-rel').onclick = () => { 
            currentUnitRelations.splice(index, 1); 
            renderRelationsUI(); 
            updateUnitDropdowns(); 
            calculateScraperFactor();
        };
        
        container.appendChild(row);
    });
}

export function updateUnitDropdowns() {
    const baseElem = document.getElementById('mat-base-unit-select');
    if (!baseElem) return;
    
    const baseUnit = baseElem.value;
    
    const availableUnits = new Set([baseUnit]);
    currentUnitRelations.forEach(r => availableUnits.add(r.name));
    
    const optionsHtml = Array.from(availableUnits).map(u => `<option value="${u}">${u}</option>`).join('');
    
    ['mat-price-unit', 'mat-consumption-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const prev = el.value;
            el.innerHTML = optionsHtml;
            if (availableUnits.has(prev)) el.value = prev;
            else if (availableUnits.size > 0) el.value = baseUnit;
        }
    });
    
    document.querySelectorAll('.base-unit-label').forEach(el => el.innerText = baseUnit);
}

/**
 * محاسبه دقیق ضریب اسکرپر (استاندارد سازی شده)
 * منطق:
 * ما میخواهیم بدانیم "یک واحد خرید" چند برابر "یک واحد سایت" قیمت دارد.
 * فرمول: ضریب = ارزش واحد خرید (به نسبت پایه) / ارزش واحد سایت (به نسبت پایه)
 */
export function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    const pSelect = document.getElementById('mat-price-unit');
    const factorInput = document.getElementById('mat-scraper-factor');
    const baseSelect = document.getElementById('mat-base-unit-select');
    
    if (!sSelect || !pSelect || !factorInput || !baseSelect) return;
    
    const baseVal = baseSelect.value;
    const sUnit = sSelect.value;
    const pUnit = pSelect.value;

    // تابع کمکی برای پیدا کردن نسبت تبدیل به پایه
    // یعنی: 1 واحد مورد نظر = چند واحد پایه؟
    const getRatioToBase = (unitName) => {
        if (unitName === baseVal) return 1;
        
        const rel = currentUnitRelations.find(r => r.name === unitName);
        // اگر رابطه پیدا نشد یا اعداد صفر بودند، پیش‌فرض 1 برمی‌گرداند
        if (!rel || rel.qtyUnit === 0) return 1;
        
        // مثال: 24 کیلو (Unit) = 1 شاخه (Base)
        // نسبت شاخه به پایه = 1
        // نسبت کیلو به پایه = 1 / 24
        return rel.qtyBase / rel.qtyUnit;
    };
    
    const siteRatio = getRatioToBase(sUnit);    // ارزش واحد سایت
    const purchaseRatio = getRatioToBase(pUnit); // ارزش واحد خرید
    
    let rate = 1;
    
    if (siteRatio !== 0) {
        rate = purchaseRatio / siteRatio;
    }

    // جلوگیری از اعشار بی‌نهایت و صفر شدن
    if (isNaN(rate) || !isFinite(rate)) rate = 1;
    
    // نمایش حداکثر 6 رقم اعشار، و حذف صفرهای اضافی (مثلا 24.0000 -> 24)
    factorInput.value = parseFloat(rate.toFixed(6)); 
}

function setSelectValue(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    
    if (![...el.options].some(o => o.value === val)) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.text = val;
        el.add(opt);
    }
    el.value = val;
}
