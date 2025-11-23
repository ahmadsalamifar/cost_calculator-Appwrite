import { api } from './api.js';
import { state, APPWRITE_CONFIG } from './config.js';
import { switchTab } from './utils.js';

export function setupStore(refreshCallback) {
    // منطق در رندر هندل می‌شود
}

export function renderStore(refreshCallback) {
    const el = document.getElementById('store-container');
    
    // --- اصلاح حیاتی: اگر المنت پیدا نشد، بدون خطا خارج شو ---
    if (!el) {
        console.warn("Store container not found in HTML");
        return;
    }
    
    if(!state.publicFormulas || !state.publicFormulas.length) { 
        el.innerHTML = '<p class="col-span-full text-center text-slate-400 text-xs">بانک فرمول خالی است</p>'; 
        return; 
    }
    
    el.innerHTML = state.publicFormulas.map(f => `
        <div class="bg-white p-4 rounded-2xl border shadow-sm text-center hover:shadow-md transition-shadow">
            <div class="font-black text-lg text-slate-700 mb-2">${f.name}</div>
            <div class="text-xs text-slate-400 mb-4">شامل ${safeParseComponents(f.components)} جزء</div>
            <button class="btn btn-secondary text-xs w-full btn-copy-store py-2 hover:bg-teal-50 hover:text-teal-700" data-id="${f.$id}">📥 افزودن به لیست من</button>
        </div>
    `).join('');
    
    el.querySelectorAll('.btn-copy-store').forEach(b => {
        b.onclick = async () => {
            const t = state.publicFormulas.find(x => x.$id === b.dataset.id);
            if(!confirm(`فرمول "${t.name}" به لیست شما اضافه شود؟`)) return;
            try {
                await api.create(APPWRITE_CONFIG.COLS.FORMS, {
                    name: t.name, 
                    components: t.components,
                    labor: t.labor, overhead: t.overhead, profit: t.profit, is_public: false
                });
                alert('با موفقیت اضافه شد');
                refreshCallback();
                switchTab('formulas');
            } catch(e) { alert(e.message); }
        };
    });
}

function safeParseComponents(json) {
    try { return JSON.parse(json || '[]').length; } catch { return 0; }
}