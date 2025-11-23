// کنترلر اصلی فرمول‌ها
// وظیفه: هماهنگی بین لیست، جزئیات و API

import { api } from '../../core/api.js';
import { state, APPWRITE_CONFIG } from '../../core/config.js';
import { parseLocaleNumber, openModal, closeModal } from '../../core/utils.js';
import * as ListUI from './formulaList.js';
import * as DetailUI from './formulaDetail.js';

export function init(refreshCb) {
    injectLayout(); // ساختار HTML اولیه
    
    // لیسنر لیست (اگر المنت‌ها ساخته شده باشند)
    setTimeout(() => {
        ListUI.setupSearch(() => ListUI.renderList(state.activeFormulaId, selectFormula));
        
        // لیسنرهای اکشن‌های سراسری
        const btnOpen = document.getElementById('btn-open-new-formula');
        if(btnOpen) btnOpen.onclick = () => openModal('new-formula-modal');
        
        const btnCreate = document.getElementById('btn-create-formula');
        if(btnCreate) btnCreate.onclick = () => createFormula(refreshCb);
        
        const btnCancel = document.getElementById('btn-cancel-formula');
        if(btnCancel) btnCancel.onclick = () => closeModal('new-formula-modal');

        // لیسنرهای پنل جزئیات
        const formAdd = document.getElementById('form-add-comp');
        if(formAdd) formAdd.onsubmit = (e) => {
            e.preventDefault();
            addComponent(refreshCb);
        };
        
        ['labor', 'overhead', 'profit'].forEach(key => {
            const inp = document.getElementById('inp-' + key);
            if(inp) inp.onchange = (e) => updateCostVar(key, e.target.value, refreshCb);
        });

        const btnDel = document.getElementById('btn-delete-formula');
        if(btnDel) btnDel.onclick = () => deleteFormula(refreshCb);
        
        const btnDup = document.getElementById('btn-duplicate-formula');
        if(btnDup) btnDup.onclick = () => duplicateFormula(refreshCb);
        
        const nameEl = document.getElementById('active-formula-name');
        if(nameEl) nameEl.onclick = () => renameFormula(refreshCb);

        // لیسنرهای دراپ‌داون جزئیات
        DetailUI.setupDropdownListeners();
    }, 50); // تأخیر کوتاه برای اطمینان از رندر DOM
}

export function renderFormulaList() {
    ListUI.renderList(state.activeFormulaId, selectFormula);
}

function selectFormula(id) {
    state.activeFormulaId = id;
    renderFormulaList(); // برای آپدیت استایل اکتیو
    
    const formula = state.formulas.find(f => f.$id === id);
    DetailUI.renderDetailView(formula, {
        onDeleteComp: (idx) => removeComponent(idx, () => selectFormula(id)) // رفرش لوکال
    });

    // موبایل
    if (window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({ behavior: 'smooth' });
}

// --- عملیات دیتا ---

async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if (!name) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0, overhead: 0, profit: 0, is_public: false
        });
        closeModal('new-formula-modal');
        cb();
    } catch(e) { alert(e.message); }
}

async function addComponent(cb) {
    if (!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    const unit = document.getElementById('comp-unit-select').value;

    if (!val || !qty) return alert('اطلاعات ناقص است');

    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    
    let comps = parseComponents(f.components);
    
    // اگر آیتم تکراری بود، تعداد اضافه شود
    const exist = comps.find(c => c.id === id && c.type === type && c.unit === unit);
    if (exist) exist.qty += qty; else comps.push({ id, type, qty, unit });

    updateFormulaComponents(f, comps, cb);
}

async function removeComponent(idx, cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = parseComponents(f.components);
    comps.splice(idx, 1);
    updateFormulaComponents(f, comps, cb);
}

async function updateFormulaComponents(formula, newComps, cb) {
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, formula.$id, { components: JSON.stringify(newComps) });
        // آپدیت لوکال برای سرعت
        formula.components = newComps;
        selectFormula(formula.$id); 
    } catch(e) { alert(e.message); }
}

async function updateCostVar(key, val, cb) {
    if (!state.activeFormulaId) return;
    const num = parseLocaleNumber(val);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: num });
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        f[key] = num;
        selectFormula(f.$id); // رفرش محاسبات
    } catch(e) { console.error(e); }
}

async function deleteFormula(cb) {
    if(confirm('حذف شود؟')) {
        await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
        state.activeFormulaId = null;
        cb();
    }
}

async function duplicateFormula(cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!f) return;
    try {
        await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name: f.name + ' (کپی)',
            components: typeof f.components === 'string' ? f.components : JSON.stringify(f.components),
            labor: f.labor, overhead: f.overhead, profit: f.profit
        });
        cb();
    } catch(e) { alert(e.message); }
}

async function renameFormula(cb) {
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    const n = prompt('نام جدید:', f.name);
    if (n && n !== f.name) {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, f.$id, { name: n });
        cb();
    }
}

function parseComponents(data) {
    try { return typeof data === 'string' ? JSON.parse(data) : (data || []); } catch { return []; }
}

function injectLayout() {
    const container = document.getElementById('tab-formulas');
    if (!container) return;

    // بررسی دقیق‌تر: اگر المنت لیست مستر وجود ندارد، یعنی ساختار ناقص است یا وجود ندارد
    if (document.getElementById('formula-master-list')) return;

    container.innerHTML = `
        <!-- Master List -->
        <div class="w-full lg:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[300px] lg:h-full shrink-0">
            <div class="p-3 border-b flex gap-2 bg-slate-50 sticky top-0 z-10">
                <input type="text" id="search-formulas" placeholder="جستجو..." class="input-field text-xs h-10">
                <button id="btn-open-new-formula" class="bg-teal-600 text-white w-10 h-10 rounded-xl font-bold shadow text-xl hover:bg-teal-700 shrink-0 transition-colors" type="button">+</button>
            </div>
            <div id="formula-master-list" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"></div>
        </div>
        <!-- Detail Panel -->
        <div class="w-full lg:w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative min-h-[500px] lg:h-full" id="detail-panel">
            <div id="formula-detail-empty" class="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                <span class="text-5xl mb-4 opacity-20">🏗️</span>
                <p class="font-bold text-sm">محصولی انتخاب نشده است</p>
            </div>
            <div id="formula-detail-view" class="hidden flex-col h-full w-full absolute inset-0 bg-white">
                <div class="p-3 border-b flex justify-between items-center bg-slate-50">
                    <div class="overflow-hidden mr-2">
                        <h2 id="active-formula-name" class="font-bold cursor-pointer hover:text-teal-600 border-b border-dashed border-slate-300 pb-1 truncate">---</h2>
                        <span id="active-formula-date" class="text-[10px] text-slate-400 block mt-1"></span>
                    </div>
                    <div class="flex gap-1 shrink-0">
                         <button id="btn-duplicate-formula" class="btn btn-white border border-blue-200 text-blue-500 py-1 px-2 text-xs shadow-none">📑</button>
                         <button id="btn-print" class="btn btn-white border border-slate-200 text-slate-600 py-1 px-2 text-xs shadow-none">🖨</button>
                         <button id="btn-delete-formula" class="btn btn-white border border-rose-200 text-rose-500 py-1 px-2 text-xs shadow-none">🗑</button>
                    </div>
                </div>
                <!-- Form Add Comp -->
                <div class="p-3 border-b bg-white shadow-sm z-20">
                    <form id="form-add-comp" class="flex flex-col gap-2">
                         <div class="flex gap-2">
                            <select id="comp-filter" class="input-field w-1/3 text-[10px] bg-slate-50 px-1"></select>
                            <select id="comp-select" class="input-field w-2/3 text-xs font-bold" required></select>
                         </div>
                         <div class="flex gap-2 items-center">
                            <select id="comp-unit-select" class="input-field w-1/3 text-[10px] bg-slate-50 px-1"></select>
                            <input id="comp-qty" class="input-field w-1/3 text-center font-bold" placeholder="تعداد" type="number" step="any" required>
                            <button class="btn btn-primary w-1/3 text-xs shadow-md h-9">افزودن</button>
                         </div>
                    </form>
                </div>
                <!-- List -->
                <div id="formula-comps-list" class="flex-1 overflow-y-auto bg-slate-50/30 divide-y divide-slate-100 pb-20"></div>
                <!-- Footer -->
                <div class="p-4 bg-slate-800 text-slate-200 border-t z-30">
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <input id="inp-labor" placeholder="دستمزد" class="bg-slate-700 p-2 rounded text-center text-xs text-white border border-slate-600">
                        <input id="inp-overhead" placeholder="سربار" class="bg-slate-700 p-2 rounded text-center text-xs text-white border border-slate-600">
                        <input id="inp-profit" placeholder="سود %" class="bg-slate-700 p-2 rounded text-center text-xs text-white border border-slate-600" type="number">
                    </div>
                    <div class="flex justify-between items-end border-t border-slate-700 pt-2">
                        <span class="text-xs text-slate-400">قیمت نهایی:</span>
                        <div class="text-right"><span id="lbl-final-price" class="text-xl md:text-2xl font-black text-teal-400">0</span> <span class="text-[10px]">تومان</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}