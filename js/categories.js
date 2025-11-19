import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';

export function setupCategories(refreshCallback) {
    // مدیریت دسته‌ها
    document.getElementById('category-form').onsubmit = (e) => { 
        e.preventDefault(); 
        addItem(APPWRITE_CONFIG.COLS.CATS, 'cat-name', refreshCallback); 
    };

    // مدیریت واحدها (جدید)
    document.getElementById('unit-form').onsubmit = (e) => { 
        e.preventDefault(); 
        addItem(APPWRITE_CONFIG.COLS.UNITS, 'unit-name', refreshCallback); 
    };
}

async function addItem(col, inputId, cb) {
    const input = document.getElementById(inputId);
    const val = input.value;
    if(!val) return;
    try {
        await api.create(col, {name: val});
        input.value = '';
        cb();
    } catch(e) { alert(e.message); }
}

export function renderCategories(refreshCallback) {
    renderList('category-list', state.categories, APPWRITE_CONFIG.COLS.CATS, refreshCallback);
    renderList('unit-list', state.units, APPWRITE_CONFIG.COLS.UNITS, refreshCallback);
}

function renderList(elementId, data, col, cb) {
    const el = document.getElementById(elementId);
    if(!el) return;

    el.innerHTML = data.map(item => `
        <div class="flex justify-between p-2 bg-slate-50 rounded border mb-1 text-xs items-center">
            <span class="font-bold text-slate-700">${item.name}</span>
            <button class="text-rose-500 btn-del-${col} w-6 h-6 flex items-center justify-center hover:bg-rose-50 rounded" data-id="${item.$id}">×</button>
        </div>
    `).join('');
    
    el.querySelectorAll(`.btn-del-${col}`).forEach(b => {
        b.onclick = async () => {
            if(confirm('حذف شود؟')) {
                try { await api.delete(col, b.dataset.id); cb(); }
                catch(e) { alert(e.message); }
            }
        };
    });
}
