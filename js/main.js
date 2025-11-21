import { account, state } from './config.js';
import { fetchAllData } from './api.js';
import { switchTab, formatPrice, parseLocaleNumber } from './utils.js'; // formatInput حذف شد
import * as Formulas from './formulas.js';
import * as Materials from './materials.js';
import * as Categories from './categories.js';
import * as Store from './store.js';
import * as Print from './print.js';

// --- مدیریت اصلی وضعیت برنامه ---

async function refreshApp() {
    try {
        await fetchAllData();
        updateUI();
    } catch (e) { console.error(e); }
}

function updateUI() {
    // رفرش کردن همه ماژول‌ها
    Formulas.renderFormulaList();
    Materials.renderMaterials();
    Categories.renderCategories(refreshApp);
    Store.renderStore(refreshApp);
    
    // اگر فرمولی باز بود، رفرش شود
    if (state.activeFormulaId) {
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if (f) {
            Formulas.renderFormulaDetail(f, refreshApp);
        } else {
            state.activeFormulaId = null;
            document.getElementById('formula-detail-view').classList.add('hidden');
            document.getElementById('formula-detail-empty').classList.remove('hidden');
        }
    }
    
    Formulas.updateDropdowns();
    Formulas.updateCompSelect();
    updateMatCatDropdown();
}

function updateMatCatDropdown() {
    const matCat = document.getElementById('mat-category');
    if(matCat) {
        const val = matCat.value;
        const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
        matCat.innerHTML = '<option value="">بدون دسته</option>' + c;
        matCat.value = val;
    }
}

// --- شروع برنامه ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // ورود خودکار (Anonymous)
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        
        await fetchAllData();
        
        // نمایش UI
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        // تب‌ها
        document.getElementById('btn-tab-formulas').onclick = () => switchTab('formulas');
        document.getElementById('btn-tab-materials').onclick = () => switchTab('materials');
        document.getElementById('btn-tab-categories').onclick = () => switchTab('categories');
        document.getElementById('btn-open-store').onclick = () => switchTab('store');
        
        // راه‌اندازی ماژول‌ها
        Formulas.setupFormulas(refreshApp);
        Materials.setupMaterials(refreshApp);
        Categories.setupCategories(refreshApp);
        Store.setupStore(refreshApp);
        Print.setupPrint();
        
        // --- اصلاح سیستم فرمت‌دهی قیمت‌ها (جایگزین formatInput) ---
        // این بخش برای اینپوت‌های دستمزد و سربار در تب فرمول‌ها استفاده می‌شود
        document.querySelectorAll('.price-input').forEach(el => {
            // وقتی کاربر کلیک کرد: عدد خام نشان بده (بدون ویرگول)
            el.addEventListener('focus', (e) => {
                const val = parseLocaleNumber(e.target.value);
                e.target.value = val !== 0 ? val : '';
                e.target.select();
            });
            
            // وقتی کاربر خارج شد: فرمت پول اعمال کن (۳ رقم ۳ رقم)
            el.addEventListener('blur', (e) => {
                 const val = parseLocaleNumber(e.target.value);
                 // اگر مقدار داشت فرمت کن، وگرنه خالی بگذار یا صفر (بسته به نیاز)
                 if(val !== 0 || e.target.value.trim() !== '') {
                     e.target.value = formatPrice(val);
                 }
            });
        });

        updateUI();
        switchTab('formulas');
        
    } catch (err) {
        console.error(err);
        document.getElementById('loading-text').innerText = "خطا در اتصال: " + err.message;
        document.getElementById('loading-text').className = 'text-rose-500 text-sm font-bold';
    }
});
