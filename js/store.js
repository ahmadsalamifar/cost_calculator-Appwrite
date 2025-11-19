import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { switchTab } from './utils.js';

export function setupStore(refreshCallback) {
    // Store setup mostly happens in render
}

export function renderStore(refreshCallback) {
    const el = document.getElementById('store-container');
    if(!state.publicFormulas.length) { el.innerHTML = '<p class="col-span-full text-center text-slate-400 text-xs">خالی</p>'; return; }
    el.innerHTML = state.publicFormulas.map(f => `
        <div class="bg-white p-3 rounded border text-center">
            <div class="font-bold mb-2 text-sm">${f.name}</div>
            <button class="btn btn-secondary text-xs w-full btn-copy-store" data-id="${f.$id}">افزودن به لیست</button>
        </div>
    `).join('');
    
    el.querySelectorAll('.btn-copy-store').forEach(b => {
        b.onclick = async () => {
            if(!confirm('کپی شود؟')) return;
            const t = state.publicFormulas.find(x => x.$id === b.dataset.id);
            try {
                await api.create(APPWRITE_CONFIG.COLS.FORMS, {
                    name: t.name + ' (کپی)', 
                    components: t.components,
                    labor: t.labor, overhead: t.overhead, profit: t.profit, is_public: false
                });
                alert('انجام شد');
                refreshCallback();
                switchTab('formulas');
            } catch(e) { alert(e.message); }
        };
    });
}