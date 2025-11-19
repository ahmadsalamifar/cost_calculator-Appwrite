import { api, fetchSingleFormula } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, formatDate, getDateBadge, openModal, closeModal } from './utils.js';

export function setupFormulas(refreshCallback) {
    console.log("🔧 Setup Formulas Started");

    // چک کردن وجود المنت‌ها
    const requiredIds = ['formula-master-list', 'formula-detail-view', 'formula-comps-list'];
    requiredIds.forEach(id => {
        if (!document.getElementById(id)) console.error(`❌ CRITICAL ERROR: Element #${id} not found in HTML!`);
    });

    // دکمه‌ها
    bindClick('btn-open-new-formula', () => openModal('new-formula-modal'));
    bindClick('btn-cancel-formula', () => closeModal('new-formula-modal'));
    bindClick('btn-create-formula', () => createFormula(refreshCallback));
    
    // جستجو
    const searchEl = document.getElementById('search-formulas');
    if(searchEl) searchEl.oninput = (e) => renderFormulaList(e.target.value);
    
    // افزودن کالا
    const addForm = document.getElementById('form-add-comp');
    if(addForm) addForm.onsubmit = (e) => { e.preventDefault(); addComp(refreshCallback); };

    // اینپوت‌ها
    ['labor', 'overhead', 'profit'].forEach(key => {
        const el = document.getElementById('inp-' + key);
        if(el) el.onchange = (e) => updateCost(key, e.target.value, refreshCallback);
    });

    // فیلتر
    const filterEl = document.getElementById('comp-filter');
    if(filterEl) filterEl.onchange = updateCompSelect;

    // انتخاب از لیست (Delegation)
    const listEl = document.getElementById('formula-master-list');
    if(listEl) {
        listEl.addEventListener('click', (e) => {
            const item = e.target.closest('[data-id]');
            if(item) selectFormula(item.getAttribute('data-id'), refreshCallback);
        });
    }
}

// تابع کمکی برای جلوگیری از خطا
function bindClick(id, handler) {
    const el = document.getElementById(id);
    if(el) el.onclick = handler;
}

// --- رندر لیست ---
export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    if(!el) return;
    
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">یافت نشد</p>'; return; }
    
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">${formatDate(f.$updatedAt)}</div>
        </div>
    `).join('');
}

// --- انتخاب فرمول ---
export function selectFormula(id, refreshCallback) {
    console.log("👉 Selecting Formula:", id);
    state.activeFormulaId = id;
    renderFormulaList();
    
    // مدیریت نمایش پنل‌ها
    const emptyEl = document.getElementById('formula-detail-empty');
    const viewEl = document.getElementById('formula-detail-view');
    
    if(emptyEl) {
        emptyEl.classList.remove('flex'); // اطمینان از حذف flex
        emptyEl.classList.add('hidden');
    }
    
    if(viewEl) {
        viewEl.classList.remove('hidden');
        viewEl.classList.add('flex');
    } else {
        console.error("❌ #formula-detail-view not found!");
        return;
    }

    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f, refreshCallback);
    
    // اسکرول موبایل
    if(window.innerWidth < 1024) document.getElementById('detail-panel')?.scrollIntoView({behavior:'smooth'});
}

// --- رندر جزئیات ---
export function renderFormulaDetail(f, refreshCallback) {
    // 1. پر کردن فیلدها
    const nameEl = document.getElementById('active-formula-name');
    if(nameEl) {
        nameEl.innerText = f.name;
        // اتصال مجدد رویداد کلیک برای اطمینان
        nameEl.onclick = () => renameFormula(refreshCallback);
    }

    // اتصال دکمه حذف همینجا (برای اطمینان)
    const delBtn = document.getElementById('btn-delete-formula');
    if(delBtn) delBtn.onclick = () => deleteFormula(refreshCallback);

    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    // 2. آپدیت دراپ‌داون‌ها
    updateDropdowns(); 
    updateCompSelect();

    // 3. لیست کالاها
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e) { console.error(e); }

    const listEl = document.getElementById('formula-comps-list');
    if(!listEl) {
        console.error("❌ #formula-comps-list not found!");
        return;
    }

    console.log("📝 Generating HTML for", comps.length, "items");

    if(comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">لیست مواد خالی است.</div>';
    } else {
        // ساخت HTML
        const html = comps.map((c, idx) => {
            let name = '?', unit = '-', price = 0, total = 0, badge = '';
            
            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) { 
                    name = m.name; unit = m.unit; price = m.price; 
                    badge = getDateBadge(m.$updatedAt);
                } else { 
                    name = '(کالا حذف شده)'; badge = '<span class="text-rose-500">!</span>'; 
                }
            } else {
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) { 
                    name = `🔗 ${sub.name}`; unit = 'عدد'; 
                    price = calculateCost(sub).final;
                    badge = getDateBadge(sub.$updatedAt);
                } else { name = '(فرمول حذف شده)'; }
            }
            total = price * c.qty;
            
            return `
            <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50 hover:bg-slate-50">
                <div class="flex-grow">
                    <div class="font-bold text-slate-700 text-xs flex items-center gap-2">
                        ${name} ${badge}
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5">
                        <span class="bg-slate-100 px-1 rounded border">${c.qty}</span> ${unit} × ${formatPrice(price)}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span>
                    <button class="text-rose-400 px-2 py-1 rounded hover:bg-rose-50 btn-del-comp" data-idx="${idx}">×</button>
                </div>
            </div>`;
        }).join('');
        
        listEl.innerHTML = html;

        // اتصال دکمه‌های حذف
        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f.$id, parseInt(btn.dataset.idx), () => {
                // رفرش داخلی
                api.get(APPWRITE_CONFIG.COLS.FORMS, f.$id).then(updatedF => {
                    const index = state.formulas.findIndex(i => i.$id === f.$id);
                    if(index !== -1) state.formulas[index] = updatedF;
                    renderFormulaDetail(updatedF, refreshCallback);
                });
            });
        });
    }

    // 4. قیمت نهایی
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
}

// --- توابع محاسباتی و دراپ‌داون ---
export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0;
    const comps = JSON.parse(f.components || '[]');
    comps.forEach(c => {
        if(c.type==='mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if(m) matCost += m.price * c.qty;
        } else {
            const sub = state.formulas.find(x => x.$id === c.id);
            if(sub) matCost += calculateCost(sub).final * c.qty;
        }
    });
    const sub = matCost + (f.labor||0) + (f.overhead||0);
    const profit = (f.profit||0)/100 * sub;
    return {matCost, sub, profit, final: sub+profit};
}

export function updateDropdowns() {
    const filterEl = document.getElementById('comp-filter');
    if(!filterEl) return;
    const current = filterEl.value;
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    filterEl.innerHTML = '<option value="">همه دسته‌ها...</option>' + c + '<option value="FORM">فرمول‌ها</option>';
    filterEl.value = current;
}

export function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    if(!sel) return;
    
    let h = '<option value="">انتخاب کالا...</option>';
    
    if(f === 'FORM') {
        h += `<optgroup label="فرمول‌ها">` + 
             state.formulas.filter(x => x.$id !== state.activeFormulaId)
             .map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('') + 
             `</optgroup>`;
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
}

// --- عملیات (Create, Add, Remove, Rename, Delete) ---
async function createFormula(cb) {
    const name = document.getElementById('new-formula-name').value;
    if(!name) return;
    try {
        const res = await api.create(APPWRITE_CONFIG.COLS.FORMS, {
            name, components: '[]', labor: 0.0, overhead: 0.0, profit: 0.0, is_public: false
        });
        state.formulas.unshift(res);
        closeModal('new-formula-modal');
        document.getElementById('new-formula-name').value = '';
        selectFormula(res.$id, cb);
    } catch(e) { alert(e.message); }
}

async function addComp(refreshCb) {
    if(!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    if(!val || !qty) { alert('انتخاب ناقص'); return; }

    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    if(type === 'form' && id === state.activeFormulaId) { alert('خطا: لوپ'); return; }

    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = JSON.parse(f.components || '[]');
    const exist = comps.find(c => c.id === id && c.type === type);
    if(exist) exist.qty += qty; else comps.push({id, type, qty});
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components: JSON.stringify(comps) });
        document.getElementById('comp-qty').value = '';
        // رفرش سریع با داده جدید
        const updatedF = await api.get(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
        // آپدیت استیت محلی
        const idx = state.formulas.findIndex(x => x.$id === state.activeFormulaId);
        if(idx !== -1) state.formulas[idx] = updatedF;
        
        renderFormulaDetail(updatedF, refreshCb);
    } catch(e) { alert(e.message); }
}

async function removeComp(fid, idx, localRefresh) {
    const f = state.formulas.find(x => x.$id === fid);
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, fid, { components: JSON.stringify(comps) });
        localRefresh();
    } catch(e) { alert(e.message); }
}

async function updateCost(key, val, cb) {
    if(!state.activeFormulaId) return;
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: parseFloat(val.replace(/,/g,'')) || 0 });
        const updatedF = await api.get(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
        const idx = state.formulas.findIndex(x => x.$id === state.activeFormulaId);
        if(idx !== -1) state.formulas[idx] = updatedF;
        renderFormulaDetail(updatedF, cb);
    } catch(e) { console.error(e); }
}

async function renameFormula(cb) {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید:', cur);
    if(n && n !== cur) {
        try { 
            await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); 
            cb(); // رفرش کلی برای تغییر در لیست سمت راست
        } catch(e) { alert(e.message); }
    }
}

async function deleteFormula(cb) {
    if(confirm('حذف شود؟')) {
        try {
            await api.delete(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId);
            state.activeFormulaId = null;
            cb();
        } catch(e) { alert(e.message); }
    }
}