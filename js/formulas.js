import { api, fetchSingleFormula } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, formatDate, getDateBadge, openModal, closeModal } from './utils.js';

export function setupFormulas(refreshCallback) {
    // 1. مودال‌ها
    document.getElementById('btn-open-new-formula').onclick = () => openModal('new-formula-modal');
    document.getElementById('btn-cancel-formula').onclick = () => closeModal('new-formula-modal');
    document.getElementById('btn-create-formula').onclick = () => createFormula(refreshCallback);
    
    // 2. جستجو
    document.getElementById('search-formulas').oninput = (e) => renderFormulaList(e.target.value);
    
    // 3. فرم افزودن کالا
    document.getElementById('form-add-comp').onsubmit = (e) => { 
        e.preventDefault(); 
        addComp(refreshCallback); 
    };

    // 4. تغییر قیمت‌ها
    ['labor', 'overhead', 'profit'].forEach(key => {
        document.getElementById('inp-' + key).onchange = (e) => updateCost(key, e.target.value, refreshCallback);
    });
    
    // 5. دکمه‌های عملیاتی
    document.getElementById('active-formula-name').onclick = () => renameFormula(refreshCallback);
    document.getElementById('btn-delete-formula').onclick = () => deleteFormula(refreshCallback);
    
    // 6. دراپ‌داون فیلتر
    document.getElementById('comp-filter').onchange = updateCompSelect;

    // 7. *** اصلاح مهم: انتخاب از لیست با Event Delegation ***
    // به جای اینکه به تک تک دکمه‌ها رویداد بدهیم، به کل لیست می‌دهیم
    const masterList = document.getElementById('formula-master-list');
    masterList.addEventListener('click', (e) => {
        // پیدا کردن نزدیک‌ترین المنتی که data-id دارد
        const item = e.target.closest('[data-id]');
        if (item) {
            selectFormula(item.getAttribute('data-id'));
        }
    });
}

// --- ایجاد فرمول ---
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
        
        // انتخاب و رفرش
        selectFormula(res.$id);
    } catch(e) { alert("خطا: " + e.message); }
}

// --- رندر لیست (فقط HTML) ---
export function renderFormulaList(filter='') {
    const list = state.formulas.filter(f => f.name.includes(filter));
    const el = document.getElementById('formula-master-list');
    
    if(!list.length) { 
        el.innerHTML = '<p class="text-center text-slate-400 text-xs mt-10">موردی یافت نشد</p>'; 
        return; 
    }
    
    // ساخت HTML (بدون onclick داخلی)
    el.innerHTML = list.map(f => `
        <div class="p-3 border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${f.$id===state.activeFormulaId ? 'bg-teal-50 border-r-4 border-teal-600' : ''}" data-id="${f.$id}">
            <div class="font-bold text-xs text-slate-700 pointer-events-none">${f.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 pointer-events-none">${formatDate(f.$updatedAt)}</div>
        </div>
    `).join('');
}

// --- انتخاب فرمول (Logic اصلی) ---
export function selectFormula(id) {
    console.log("Selecting Formula ID:", id); // برای دیباگ
    
    state.activeFormulaId = id;
    renderFormulaList(); // برای رنگی شدن آیتم فعال
    
    const emptyEl = document.getElementById('formula-detail-empty');
    const viewEl = document.getElementById('formula-detail-view');
    
    // نمایش پنل جزئیات
    if(emptyEl) emptyEl.classList.add('hidden');
    if(viewEl) {
        viewEl.classList.remove('hidden');
        viewEl.classList.add('flex');
    }
    
    const f = state.formulas.find(x => x.$id === id);
    if(f) renderFormulaDetail(f);

    // اسکرول در موبایل
    if(window.innerWidth < 1024) {
        const panel = document.getElementById('detail-panel');
        if(panel) panel.scrollIntoView({behavior: 'smooth'});
    }
}

// --- نمایش جزئیات ---
export function renderFormulaDetail(f) {
    // 1. پر کردن فیلدها
    document.getElementById('active-formula-name').innerText = f.name;
    document.getElementById('inp-labor').value = formatPrice(f.labor);
    document.getElementById('inp-overhead').value = formatPrice(f.overhead);
    document.getElementById('inp-profit').value = f.profit;

    // 2. اطمینان از پر بودن دراپ‌داون‌ها
    // اگر فیلتر خالی بود، پرش کن
    const filterEl = document.getElementById('comp-filter');
    if (filterEl && filterEl.options.length <= 1) {
        updateDropdowns(); 
    }
    updateCompSelect(); // آیتم‌ها را بر اساس فیلتر بساز

    // 3. پارس کردن کالاها
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e) { console.error(e); }
    
    // 4. لیست کالاها
    const listEl = document.getElementById('formula-comps-list');
    if(comps.length === 0) {
        listEl.innerHTML = '<div class="p-8 text-center text-slate-400 text-xs">لیست مواد خالی است.</div>';
    } else {
        listEl.innerHTML = comps.map((c, idx) => {
            let name = '?', unit = '-', price = 0, total = 0, badge = '';
            
            if(c.type === 'mat') {
                const m = state.materials.find(x => x.$id === c.id);
                if(m) { 
                    name = m.name; unit = m.unit; price = m.price; 
                    badge = getDateBadge(m.$updatedAt);
                } else { 
                    name = '(حذف شده)'; badge = '<span class="text-rose-500">!</span>'; 
                }
            } else {
                const sub = state.formulas.find(x => x.$id === c.id);
                if(sub) { 
                    name = `🔗 ${sub.name}`; unit = 'عدد'; 
                    price = calculateCost(sub).final;
                    badge = getDateBadge(sub.$updatedAt);
                } else { name = '(حذف شده)'; }
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
                    <button class="text-rose-400 hover:text-rose-600 px-2 py-1 btn-del-comp" data-idx="${idx}">×</button>
                </div>
            </div>`;
        }).join('');

        // اتصال حذف آیتم
        listEl.querySelectorAll('.btn-del-comp').forEach(btn => {
            btn.onclick = () => removeComp(f.$id, parseInt(btn.dataset.idx));
        });
    }

    // 5. قیمت نهایی
    const calc = calculateCost(f);
    document.getElementById('lbl-final-price').innerText = formatPrice(calc.final);
}

// --- محاسبات ---
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

// --- عملیات ---

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
        
        // رفرش سریع
        const updatedF = await fetchSingleFormula(state.activeFormulaId);
        renderFormulaDetail(updatedF);
    } catch(e) { alert(e.message); }
}

async function removeComp(fid, idx) {
    const f = state.formulas.find(x => x.$id === fid);
    let comps = JSON.parse(f.components || '[]');
    comps.splice(idx, 1);
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, fid, { components: JSON.stringify(comps) });
        const updatedF = await fetchSingleFormula(fid);
        renderFormulaDetail(updatedF);
    } catch(e) { alert(e.message); }
}

async function updateCost(key, val, cb) {
    if(!state.activeFormulaId) return;
    try {
        await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { [key]: parseFloat(val.replace(/,/g,'')) || 0 });
        // رفرش سریع (بدون لود کل دیتا)
        const updatedF = await fetchSingleFormula(state.activeFormulaId);
        renderFormulaDetail(updatedF);
    } catch(e) { console.error(e); }
}

async function renameFormula(cb) {
    const cur = document.getElementById('active-formula-name').innerText;
    const n = prompt('نام جدید:', cur);
    if(n && n !== cur) {
        try { 
            await api.update(APPWRITE_CONFIG.COLS.FORMS, state.activeFormulaId, { name: n }); 
            cb(); // اینجا رفرش کامل نیاز است تا لیست سمت راست آپدیت شود
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

// --- دراپ‌داون‌ها ---

export function updateDropdowns() {
    const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    const filterEl = document.getElementById('comp-filter');
    
    // ذخیره مقدار فعلی
    const current = filterEl.value;
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
            if(m.length) {
                h += `<optgroup label="${cat.name}">` + 
                     m.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + 
                     `</optgroup>`;
            }
        });
        
        const o = state.materials.filter(x => !x.category_id);
        if((!f || f === 'null') && o.length) {
            h += `<optgroup label="سایر">` + 
                 o.map(x => `<option value="MAT:${x.$id}">${x.name}</option>`).join('') + 
                 `</optgroup>`;
        }
    }
    sel.innerHTML = h;
}