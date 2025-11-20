import { state } from './config.js';

let currentUnitRelations = [];

// رندر کردن سطرهای روابط واحد
export function renderRelationsUI() {
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
            <input type="number" step="any" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-unit" value="${rel.qtyUnit || 1}">
            <select class="input-field w-24 px-1 h-7 text-[10px] rel-name-select">${options}</select>
            <span>=</span>
            <input type="number" step="any" class="input-field w-12 text-center p-1 h-7 bg-slate-50 rel-qty-base" value="${rel.qtyBase || 1}">
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

export function addRelationRow() {
    const usedNames = currentUnitRelations.map(r => r.name);
    const available = state.units.find(u => !usedNames.includes(u.name));
    const name = available ? available.name : (state.units[0]?.name || 'Unit');
    currentUnitRelations.push({ name: name, qtyUnit: 1, qtyBase: 1 });
    renderRelationsUI();
    updateUnitDropdowns();
}

export function updateUnitDropdowns() {
    const baseElem = document.getElementById('mat-base-unit-select');
    if(!baseElem) return;
    
    if(!baseElem.value && baseElem.options.length > 0) baseElem.selectedIndex = 0;
    const baseUnit = baseElem.value;

    let availableUnits = [baseUnit];
    currentUnitRelations.forEach(r => availableUnits.push(r.name));
    availableUnits = [...new Set(availableUnits)];
    
    const optionsHtml = availableUnits.map(u => `<option value="${u}">${u}</option>`).join('');
    
    ['mat-price-unit', 'mat-consumption-unit', 'mat-scraper-unit'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            const prev = el.value;
            el.innerHTML = optionsHtml;
            // حفظ مقدار قبلی حتی اگر در لیست جدید نباشد (جلوگیری از پریدن)
            if (prev && !availableUnits.includes(prev)) {
                const opt = document.createElement('option');
                opt.value = prev;
                opt.innerText = `${prev}`;
                el.appendChild(opt);
                el.value = prev;
            } 
            else if (availableUnits.includes(prev)) {
                el.value = prev;
            } 
            else if (availableUnits.length > 0) {
                el.value = availableUnits[0];
            }
        }
    });
    
    const labels = document.querySelectorAll('.base-unit-label');
    if(labels) labels.forEach(el => el.innerText = baseUnit);
    calculateScraperFactor();
}

export function getFactorToBase(unitName) {
    const baseElem = document.getElementById('mat-base-unit-select');
    if (!baseElem || unitName === baseElem.value) return 1;
    const rel = currentUnitRelations.find(r => r.name === unitName);
    return rel ? (rel.qtyBase / rel.qtyUnit) : 1;
}

export function calculateScraperFactor() {
    const sSelect = document.getElementById('mat-scraper-unit');
    const pSelect = document.getElementById('mat-price-unit');
    const factorInput = document.getElementById('mat-scraper-factor');
    if(!sSelect || !pSelect || !factorInput) return;
    
    const sFactor = getFactorToBase(sSelect.value);
    const pFactor = getFactorToBase(pSelect.value);
    
    let rate = 1;
    if (sFactor !== 0) rate = pFactor / sFactor;
    factorInput.value = parseFloat(rate.toFixed(4)); 
}

// دریافت امن اطلاعات (جلوگیری از خطای Null)
export function getUnitData() {
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : null; 
    };

    return {
        base: getVal('mat-base-unit-select') || 'عدد',
        others: currentUnitRelations,
        selected_purchase: getVal('mat-price-unit'),
        selected_consumption: getVal('mat-consumption-unit'),
        selected_scraper: getVal('mat-scraper-unit')
    };
}

export function setUnitData(rels) {
    const baseSelect = document.getElementById('mat-base-unit-select');
    baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
    
    const savedBase = rels.base || 'عدد';
    if (![...baseSelect.options].some(o => o.value === savedBase)) {
        baseSelect.innerHTML += `<option value="${savedBase}">${savedBase} (قدیمی)</option>`;
    }
    baseSelect.value = savedBase;

    currentUnitRelations = (rels.others || []).map(r => ({ name: r.name, qtyUnit: r.qtyUnit || 1, qtyBase: r.qtyBase || 1 }));
    renderRelationsUI();
    
    updateUnitDropdowns();
    
    if(rels.selected_purchase) setSelectValue('mat-price-unit', rels.selected_purchase);
    if(rels.selected_consumption) setSelectValue('mat-consumption-unit', rels.selected_consumption);
    if(rels.selected_scraper) setSelectValue('mat-scraper-unit', rels.selected_scraper);
    
    calculateScraperFactor();
}

export function resetUnitData() {
    currentUnitRelations = [];
    const baseSelect = document.getElementById('mat-base-unit-select');
    if(baseSelect) {
        baseSelect.innerHTML = state.units.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
        if(baseSelect.options.length > 0) baseSelect.selectedIndex = 0;
    }
    renderRelationsUI();
    updateUnitDropdowns();
}

function setSelectValue(id, val) {
    const el = document.getElementById(id);
    if(!el) return;
    if(![...el.options].some(o=>o.value===val)) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.innerText = val;
        el.appendChild(opt);
    }
    el.value = val;
}