import { account, state } from './config.js';
import { fetchAllData } from './api.js';
import { switchTab, formatPrice, parseLocaleNumber } from './utils.js';
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
    } catch (e) { console.error("Refresh failed:", e); }
}

function updateUI() {
    // رفرش کردن لیست‌ها
    Formulas.renderFormulaList();
    Materials.renderMaterials();
    Categories.renderCategories(refreshApp);
    Store.renderStore(refreshApp);
    
    // اگر فرمولی باز بود، رفرش شود
    if (state.activeFormulaId) {
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if (f) {
            Formulas.renderFormulaDetail(f);
        } else {
            // اگر فرمول باز شده حذف شده باشد، پنل را ببند
            state.activeFormulaId = null;
            document.getElementById('formula-detail-view')?.classList.add('hidden');
            document.getElementById('formula-detail-view')?.classList.remove('flex');
            document.getElementById('formula-detail-empty')?.classList.remove('hidden');
        }
    }
    
    Formulas.updateDropdowns();
    Formulas.updateCompSelect();
    updateMatCatDropdown();
}

function updateMatCatDropdown() {
    const matCat = document.getElementById('mat-category');
    if (!matCat) return;
    
    const val = matCat.value;
    const options = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    matCat.innerHTML = '<option value="">بدون دسته</option>' + options;
    matCat.value = val;
}

// --- شروع برنامه ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // ورود خودکار (Anonymous)
        try { 
            await account.get(); 
        } catch { 
            await account.createAnonymousSession(); 
        }
        
        await fetchAllData();
        
        // نمایش UI پس از لود دیتا
        const loadingScreen = document.getElementById('loading-screen');
        if(loadingScreen) loadingScreen.classList.add('hidden');
        
        const appContent = document.getElementById('app-content');
        if(appContent) appContent.classList.remove('hidden');
        
        // --- اصلاح خطا: مدیریت تب‌ها ---
        // 'store' را از این لیست حذف کردیم چون دکمه تب ندارد (دکمه جداگانه دارد)
        const tabs = ['formulas', 'materials', 'categories']; 
        
        tabs.forEach(t => {
             const btn = document.getElementById('btn-tab-' + t);
             // چک کردن وجود دکمه برای جلوگیری از خطای Cannot set properties of null
             if (btn) {
                 btn.onclick = () => switchTab(t);
             }
        });

        // دکمه فروشگاه جداگانه هندل می‌شود
        const btnStore = document.getElementById('btn-open-store');
        if (btnStore) {
            btnStore.onclick = () => switchTab('store');
        }

        // راه‌اندازی ماژول‌ها
        Formulas.setupFormulas(refreshApp);
        Materials.setupMaterials(refreshApp);
        Categories.setupCategories(refreshApp);
        Store.setupStore(refreshApp);
        Print.setupPrint();
        
        // فرمت‌دهی اینپوت‌های قیمت در کل برنامه
        setupGlobalPriceInputs();

        updateUI();
        
        // تب پیش‌فرض
        switchTab('formulas');
        
    } catch (err) {
        console.error(err);
        const loadingText = document.getElementById('loading-text');
        if(loadingText) {
            loadingText.innerText = "خطا در اتصال: " + err.message;
            loadingText.className = 'text-rose-500 text-sm font-bold';
        }
    }
});

function setupGlobalPriceInputs() {
    document.querySelectorAll('.price-input').forEach(el => {
        el.addEventListener('focus', (e) => {
            const val = parseLocaleNumber(e.target.value);
            e.target.value = val !== 0 ? val : '';
            e.target.select();
        });
        
        el.addEventListener('blur', (e) => {
             const val = parseLocaleNumber(e.target.value);
             if (val !== 0 || e.target.value.trim() !== '') {
                 e.target.value = formatPrice(val);
             }
        });
    });
}