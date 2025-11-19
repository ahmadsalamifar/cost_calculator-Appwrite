import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, formatDate, openModal, closeModal } from './utils.js';

export function setupFormulas(refreshCallback) {
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = () => createFormula(refreshCallback);
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    document.getElementById('search-formulas').oninput = (e) => renderFormulaList(e.target.value);
    document.getElementById('form-add-comp').onsubmit = (e) => { e.preventDefault(); addComp(refreshCallback); };
    document.getElementById('inp-labor').onchange = (e) => updateCost('labor', e.target.value, refreshCallback);
    document.getElementById('inp-overhead').onchange = (e) => updateCost('overhead', e.target.value, refreshCallback);
    document.getElementById('inp-profit').onchange = (e) => updateCost('profit', e.target.value, refreshCallback);
    document.getElementById('active-formula-name').onclick = () => renameFormula(refreshCallback);
    document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);
    document.getElementById('comp-filter').onchange = updateCompSelect;
}

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
        selectFormula(res.$id);
    } catch(e) { alert(e.message); }
}

export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    if(!list.length) { el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-4">خالی</p>'; return; }
    
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">${formatDate(f.$updatedAt)}</div>
        </div>
    `).join('');
    
    Array.from(el.children).forEach(child => {
        child.onclick = () => selectFormula(child.dataset.id);
    });
}

export function selectFormula(id) {
    state.activeFormulaId = id;
    renderFormulaList();
    document.getElementById('formula-detail-empty').classList.add('hidden');
    document.getElementById('formula-detail-view').classList.remove('hidden');
    document.getElementById('formula-detail-view').classList.add('flex');
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f);
    
    if(window.innerWidth < 1024) document.getElementById('detail-panel').scrollIntoView({behavior: 'smooth'});
}

export function renderFormulaDetail(f) {
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
    
    updateCompSelect();
    
    // پارس کردن امن لیست کالاها
    let comps = [];
    try {
        comps = JSON.parse(f.components || '[]');
    } catch (err) {
        console.error('JSON Error', err);
        comps = [];
    }

    const listEl = document.getElementById('formula-comps-list');
    
    if (comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">هنوز کالایی اضافه نشده است</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name='-', unit='-', price=0, total=0;
            if(c.type==='mat') {
                const m = state.materials.find(x=>x.$id===c.id);
                if(m) { name=m.name; unit=m.unit; price=m.price; } 
                else { name='(کالا حذف شده)'; }
            } else {
                const sub = state.formulas.find(x=>x.$id===c.id);
                if(sub) { name=`🔗 ${sub.name}`; unit='عدد'; price=calculateCost(sub).final; } 
                else { name='(فرمول حذف شده)'; }
            }
            total = price * c.qty;
            return `
            <div class="flex justify-between items-center p-3 text-sm border-b border-slate-50">
                <div><div class="font-bold text-slate-700 text-xs">${name}</div><div class="text-[10px] text-slate-400 mt-0.5">${c.qty} ${unit} × ${formatPrice(price)}</div></div>
                <div class="flex items-center gap-2"><span class="font-mono font-bold text-slate-600 text-xs">${formatPrice(total)}</span><button class="text-rose-400 px-2 btn-del-comp" data-idx="${idx}">×</button></div>
            </div>`;
        }).join('');

        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f.$id, parseInt(btn.dataset.idx), () => { 
                // رفرش فوری فقط همین بخش برای سرعت بیشتر
                 api.get(APPWRITE_CONFIG.COLS.FORMS, f.$id).then(updatedF => {
                     const index = state.formulas.findIndex(i => i.$id === f.$id);
                     if(index !== -1) state.formulas[index] = updatedF;
                     renderFormulaDetail(updatedF);
                 });
            });
        });
    }
}

export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    let matCost=0; 
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e){}
    
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

async function addComp(cb) {
    if(!state.activeFormulaId) return;
    const val = document.getElementById('comp-select').value;
    const qty = parseFloat(document.getElementById('comp-qty').value);
    if(!val || !qty) return;

    const [typePrefix, id] = val.split(':');
    const type = typePrefix === 'MAT' ? 'mat' : 'form';
    if(type === 'form' && id === state.activeFormulaId) { alert('خطا: نمی‌توانید محصول را در خودش استفاده کنید'); return; }
    
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e){}
    
    const exist = comps.find(c => c.id === id && c.type === type);
    if(exist) exist.qty += qty; else comps.push({id, type, qty});
    
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { components: JSON.stringify(comps) });
        document.getElementById('comp-qty').value = '';
        cb(); // فراخوانی رفرش اصلی که حالا updateUI را با دقت انجام می‌دهد
    } catch(e) { alert(e.message); }
}

async function removeComp(fid, idx, localRefresh) {
    const f = state.formulas.find(x => x.$id === fid);
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e){}
    
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
        cb();
    } catch(e) { alert(e.message); }
}

async function renameFormula(cb) {
    const n = prompt('نام جدید:', document.getElementById('active-formula-name').innerText);
    if(n) {
        try { await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); cb(); }
        catch(e) { alert(e.message); }
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

export function updateCompSelect() {
    const sel = document.getElementById('comp-select');
    const f = document.getElementById('comp-filter').value;
    if(!sel) return;
    let h = '<option value="">انتخاب...</option>';
    if(f === 'FORM') {
        h += state.formulas.filter(x => x.$id !== state.activeFormulaId).map(x => `<option value="FORM:${x.$id}">🔗 ${x.name}</option>`).join('');
    } else {
        state.categories.forEach(cat => {
            if(f && f !== cat.$id) return;
            const m = state.materials.filter(x => x.category_id === cat.$id);
            if(m.length) h += `<optgroup label="${cat.name}">` + m.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
        });
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) h += `<optgroup label="سایر">` + o.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + `</optgroup>`;
    }
    sel.innerHTML = h;
}