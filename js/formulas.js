import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { parseLocaleNumber, openModal, closeModal } from './utils.js';
import * as UI from './formulas_ui.js'; // ایمپورت ماژول UI

// --- Setup & Event Listeners ---
export function setupFormulas(refreshCallback) {
    // مدال فرمول جدید
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = () => createFormula(refreshCallback);
    
    // جستجو
    const searchEl = document.getElementById('search-formulas');
    if(searchEl) searchEl.oninput = (e) => UI.renderFormulaList(e.target.value);
    
    // افزودن جزء جدید
    document.getElementById('form-add-comp').onsubmit = (e) => { e.preventDefault(); addComp(refreshCallback); };
    
    // تغییر مقادیر هزینه (دستمزد، سربار، سود)
    ['labor', 'overhead', 'profit'].forEach(key => {
        document.getElementById('inp-' + key).onchange = (e) => updateCostVariables(key, e.target.value, refreshCallback);
    });
    
    // دراپ‌داون‌ها
    document.getElementById('comp-filter').onchange = UI.updateCompSelect;
    document.getElementById('comp-select').onchange = UI.updateCompUnitSelect;
    
    // انتخاب فرمول از لیست (Event Delegation)
    document.getElementById('formula-master-list').addEventListener('click', (e) => {
        const item = e.target.closest('[data-id]');
        if(item) selectFormula(item.getAttribute('data-id'), refreshCallback);
    });
    
    // حذف جزء از لیست اجزا (Event Delegation)
    document.getElementById('formula-comps-list').addEventListener('click', (e) => {
        if(e.target.classList.contains('btn-del-comp')) {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            removeComp(state.activeFormulaId, idx, refreshCallback);
        }
    });
    
    // دکمه‌های هدر فرمول
    document.getElementById('btn-duplicate-formula').onclick = () => duplicateFormula(refreshCallback);
    document.getElementById('active-formula-name').onclick = () => renameFormula(refreshCallback);
    document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);
}

// --- View Logic Triggers ---
export function renderFormulaList(filter) {
    UI.renderFormulaList(filter);
}

export function renderFormulaDetail(f, cb) {
    UI.renderFormulaDetail(f);
}

export function updateDropdowns() {
    UI.updateDropdowns();
}

export function updateCompSelect() {
    UI.updateCompSelect();
}

export function selectFormula(id, refreshCallback) {
    state.activeFormulaId = id;
    UI.renderFormulaList(); // رفرش برای هایلایت شدن آیتم فعال
    
    // نمایش پنل
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) UI.renderFormulaDetail(f);
    
    // اسکرول در موبایل
    if(window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({behavior:'smooth'});
}

// --- CRUD & Data Operations (Controller Logic) ---

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
        UI.renderFormulaDetail(f); 
        refreshCb(); // بروزرسانی لیست سمت راست
    } catch(e) { alert(e.message); }
}

async function removeComp(formulaId, idx, cb) {
    const f = state.formulas.find(x => x.$id === formulaId);
    if(!f) return;
    
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, { components: JSON.stringify(comps) });
        f.components = JSON.stringify(comps);
        UI.renderFormulaDetail(f);
        cb(); // بروزرسانی لیست سمت راست
    } catch(e) { alert(e.message); }
}

async function updateCostVariables(key, val, cb) {
    if(!state.activeFormulaId) return;
    const numVal = parseLocaleNumber(val);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: numVal });
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if(f) { 
            f[key] = numVal; 
            UI.renderFormulaDetail(f); 
            cb(); // بروزرسانی لیست سمت راست
        }
    } catch(e) {}
}

async function duplicateFormula(cb) {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!confirm('کپی از این فرمول ایجاد شود؟')) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, { 
            name: "کپی " + f.name, 
            components: f.components, 
            labor: f.labor, overhead: f.overhead, profit: f.profit, is_public: false 
        });
        alert('کپی ایجاد شد'); cb(); 
    } catch(e) { alert(e.message); }
}

async function renameFormula(cb) {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید:', cur);
    if(n && n !== cur) { 
        try { 
            await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); 
            cb(); 
        } catch(e) {} 
    }
}

async function deleteFormula(cb) {
    if(confirm('حذف شود؟')) {
        try { 
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId); 
            state.activeFormulaId = null; 
            document.getElementById('formula-detail-view').classList.add('hidden'); 
            document.getElementById('formula-detail-empty').classList.remove('hidden'); 
            cb(); 
        } catch(e) { alert(e.message); }
    }
}
