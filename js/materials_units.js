import { state } from './config.js';
import { parseLocaleNumber } from './utils.js'; 

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

    // استفاده از parseLocaleNumber برای اطمینان از خواندن صحیح اعداد فارسی ذخیره شده
    currentUnitRelations = (rels.others || []).map(r => ({ 
        name: r.name, 
        qtyUnit: parseLocaleNumber(r.qtyUnit) || 1, 
        qtyBase: parseLocaleNumber(r.qtyBase) || 1 
    }));
    
    renderRelationsUI();
    updateUnitDropdowns();
    
    setSelectValue('mat-price-unit', rels.selected_purchase);
    setSelectValue('mat-consumption-unit', rels.selected_consumption);
    setSelectValue('mat-scraper-unit', rels.selected_scraper);
    
    // محاسبه مجدد ضریب
    setTimeout(calculateScraperFactor, 200);
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
            <div class="flex flex-col items-center relative group">
                <input type="text" class="input-field w-14 text-center p-1 h-7 bg-slate-50 rel-qty-unit font-bold text-emerald-600" value="${rel.qtyUnit}">
                <span class="text-[8px] text-slate-400 absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 border rounded shadow-sm z-10">مقدار واحد</span>
            </div>
            
            <select class="input-field w-24 px-1 h-7 text-[10px] rel-name-select font-bold">${options}</select>
            
            <span class="text-slate-400 text-[10px] px-0.5 font-bold">=</span>
            
            <div class="flex flex-col items-center relative group">
                <input type="text" class="input-field w-14 text-center p-1 h-7 bg-slate-50 rel-qty-base font-bold text-blue-600" value="${rel.qtyBase}">
                <span class="text-[8px] text-slate-400 absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1 border rounded shadow-sm z-10">معادل پایه</span>
            </div>
            
            <span class="w-12 truncate text-[10px] base-unit-label text-slate-500" title="${baseUnitName}">${baseUnitName}</span>
            <button type="button" class="text-rose-500 px-2 btn-remove-rel text-lg hover:bg-rose-50 rounded transition-colors">×</button>
        `;
        
        // Event Listeners
        const inputs = row.querySelectorAll('input, select');
        inputs.forEach(el => el.addEventListener('input', () => {
            rel.name = row.querySelector('.rel-name-select').value;
            
            // استفاده از parseLocaleNumber برای پشتیبانی از اعداد فارسی
            const qU = parseLocaleNumber(row.querySelector('.rel-qty-unit').value);
            const qB = parseLocaleNumber(row.querySelector('.rel-qty-base').value);
            
            rel.qtyUnit = qU || 0;
            rel.qtyBase = qB || 0;
            
            if (el.tagName === 'SELECT') updateUnitDropdowns();
            
            calculateScraperFactor(); 
        }));

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
 * محاسبه و نمایش ضریب اسکرپر + متن راهنما
 */
export function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    const pSelect = document.getElementById('mat-price-unit');
    const factorInput = document.getElementById('mat-scraper-factor');
    const baseSelect = document.getElementById('mat-base-unit-select');
    
    if (!sSelect || !pSelect || !factorInput || !baseSelect) return;
    
    const baseVal = baseSelect.value;
    const sUnit = sSelect.value; // واحد سایت
    const pUnit = pSelect.value; // واحد خرید

    const getRatioToBase = (unitName) => {
        if (unitName === baseVal) return 1;
        const rel = currentUnitRelations.find(r => r.name === unitName);
        if (!rel || rel.qtyUnit === 0 || rel.qtyBase === 0) return 1;
        return rel.qtyBase / rel.qtyUnit;
    };
    
    const siteRatio = getRatioToBase(sUnit);    
    const purchaseRatio = getRatioToBase(pUnit); 
    
    let rate = 1;
    if (siteRatio !== 0) {
        rate = purchaseRatio / siteRatio;
    }

    if (isNaN(rate) || !isFinite(rate) || rate === 0) rate = 1;
    
    const finalRate = parseFloat(rate.toFixed(6));
    factorInput.value = finalRate;

    // --- ویژگی جدید: نمایش متن راهنما برای دیباگ ---
    showFactorHint(sUnit, pUnit, finalRate);
}

function showFactorHint(siteUnit, purchaseUnit, rate) {
    // پیدا کردن یا ساختن المنت راهنما
    let hintEl = document.getElementById('scraper-factor-hint');
    const container = document.getElementById('mat-scraper-factor').parentElement;
    
    if (!hintEl && container) {
        hintEl = document.createElement('div');
        hintEl.id = 'scraper-factor-hint';
        hintEl.className = 'text-[10px] text-slate-500 mt-1 w-full text-center bg-slate-100 p-1 rounded';
        container.appendChild(hintEl);
    }
    
    if (hintEl) {
        if (siteUnit === purchaseUnit) {
            hintEl.innerHTML = `قیمت سایت بدون تغییر وارد می‌شود`;
            hintEl.className = 'text-[10px] text-slate-400 mt-1 w-full text-center';
        } else {
            // مثال: قیمت (شاخه) = قیمت (کیلو) × 7.55
            const operation = rate >= 1 ? `× ${rate}` : `÷ ${(1/rate).toFixed(2)}`;
            hintEl.innerHTML = `قیمت <b>${purchaseUnit}</b> = قیمت <b>${siteUnit}</b> ${operation}`;
            hintEl.className = 'text-[10px] text-blue-600 mt-1 w-full text-center bg-blue-50 p-1 rounded border border-blue-100';
        }
    }
}

function setSelectValue(id, val) {
    const el = document.getElementById(id);
    if (!el || !val) return;
    if (![...el.options].some(o => o.value === val)) {
        const opt = document.createElement('option');
        opt.value = val; opt.text = val; el.add(opt);
    }
    el.value = val;
}