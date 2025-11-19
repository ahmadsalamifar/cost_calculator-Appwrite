import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { formatPrice, getDateBadge } from './utils.js';

export function setupMaterials(refreshCallback) {
    document.getElementById('material-form').onsubmit = (e) => { e.preventDefault(); saveMaterial(refreshCallback); };
    document.getElementById('mat-cancel-btn').onclick = resetMatForm;
    document.getElementById('search-materials').oninput = (e) => renderMaterials(e.target.value);
    document.getElementById('sort-materials').onchange = () => renderMaterials();
}

async function saveMaterial(cb) {
    const id = document.getElementById('mat-id').value;
    const data = {
        name: document.getElementById('mat-name').value,
        unit: document.getElementById('mat-unit').value,
        price: parseFloat(document.getElementById('mat-price').value.replace(/,/g,'')) || 0,
        category_id: document.getElementById('mat-category').value || null
    };
    try {
        if(id) await api.update(APPWRITE_CONFIG.COLS.MATS, id, data);
        else await api.create(APPWRITE_CONFIG.COLS.MATS, data);
        resetMatForm();
        cb();
    } catch(e){ alert(e.message); }
}

export function renderMaterials(filter='') {
    const sort = document.getElementById('sort-materials').value;
    let list = state.materials.filter(m => m.name.includes(filter));
    
    // منطق مرتب‌سازی پیشرفته
    list.sort((a,b) => {
        if(sort === 'update_desc') return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        if(sort === 'update_asc') return new Date(a.$updatedAt) - new Date(b.$updatedAt);
        if(sort === 'price_desc') return b.price - a.price;
        if(sort === 'price_asc') return a.price - b.price;
        return a.name.localeCompare(b.name); // default: name_asc
    });
    
    const el = document.getElementById('materials-container');
    if(!list.length) { el.innerHTML='<p class="col-span-full text-center text-slate-400 text-xs mt-4">خالی</p>'; return; }
    
    el.innerHTML = list.map(m => {
        const cat = state.categories.find(c => c.$id === m.category_id)?.name || '-';
        const dateBadge = getDateBadge(m.$updatedAt); // دریافت بج تاریخ
        
        return `
        <div class="bg-white p-3 rounded-xl border border-slate-100 group relative hover:border-teal-400 transition-colors">
            <div class="flex justify-between mb-1 items-start">
                <div class="flex flex-col items-start gap-1">
                    <span class="text-[10px] bg-slate-50 px-1 rounded text-slate-400 border border-slate-100">${cat}</span>
                    ${dateBadge}
                </div>
                <div class="flex gap-1"><button class="text-amber-500 px-1 btn-edit-mat" data-id="${m.$id}">✎</button><button class="text-rose-500 px-1 btn-del-mat" data-id="${m.$id}">×</button></div>
            </div>
            <div class="font-bold text-xs text-slate-800 truncate mt-2 mb-1">${m.name}</div>
            <div class="flex justify-between items-end">
                <span class="text-[10px] text-slate-400">${m.unit}</span>
                <span class="font-mono font-bold text-teal-700 text-base">${formatPrice(m.price)}</span>
            </div>
        </div>`;
    }).join('');
    
    el.querySelectorAll('.btn-edit-mat').forEach(b => b.onclick = () => editMat(b.dataset.id));
    el.querySelectorAll('.btn-del-mat').forEach(b => b.onclick = async () => {
        if(confirm('حذف؟')) {
            try { 
                await api.delete(APPWRITE_CONFIG.COLS.MATS, b.dataset.id); 
                // رفرش سریع فقط برای مواد (بدون درخواست کامل از سرور برای سرعت)
                const idx = state.materials.findIndex(i => i.$id === b.dataset.id);
                if(idx !== -1) state.materials.splice(idx, 1);
                renderMaterials(filter);
            }
            catch(e) { alert(e.message); }
        }
    });
}

function editMat(id) {
    const m = state.materials.find(x => x.$id === id);
    document.getElementById('mat-id').value = m.$id;
    document.getElementById('mat-name').value = m.name;
    document.getElementById('mat-unit').value = m.unit;
    document.getElementById('mat-price').value = formatPrice(m.price);
    document.getElementById('mat-category').value = m.category_id || '';
    
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ویرایش';
    btn.className = 'btn btn-primary flex-grow text-xs bg-amber-500 hover:bg-amber-600'; 
    document.getElementById('mat-cancel-btn').classList.remove('hidden');
    if(window.innerWidth < 1024) document.getElementById('tab-materials').scrollIntoView({behavior:'smooth'});
}

function resetMatForm() {
    document.getElementById('material-form').reset();
    document.getElementById('mat-id').value = '';
    const btn = document.getElementById('mat-submit-btn');
    btn.innerText = 'ذخیره کالا';
    btn.className = 'btn btn-primary flex-grow text-xs';
    document.getElementById('mat-cancel-btn').classList.add('hidden');
}