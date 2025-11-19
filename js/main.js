import { account, state } from './config.js';
import { fetchAllData } from './api.js';
import { switchTab, formatInput } from './utils.js';
import * as Formulas from './formulas.js';
import * as Materials from './materials.js';
import * as Categories from './categories.js';
import * as Store from './store.js';
import * as Print from './print.js';

// تابع اصلی رفرش
async function refreshApp() {
    await fetchAllData();
    updateUI();
}

function updateUI() {
    // 1. رندر لیست‌ها
    Formulas.renderFormulaList();
    Materials.renderMaterials();
    Categories.renderCategories(refreshApp);
    Store.renderStore(refreshApp);
    
    // 2. پر کردن دراپ‌داون‌های فیلتر
    Formulas.updateDropdowns();
    Formulas.updateCompSelect();
    
    // 3. اگر فرمولی باز است، دوباره رندرش کن
    if (state.activeFormulaId) {
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if (f) {
            Formulas.renderFormulaDetail(f);
        } else {
            // اگر فرمول حذف شده، برگرد به حالت خالی
            state.activeFormulaId = null;
            document.getElementById('formula-detail-view').classList.add('hidden');
            document.getElementById('formula-detail-empty').classList.remove('hidden');
        }
    }
    
    // 4. دراپ‌داون مواد اولیه
    const matCat = document.getElementById('mat-category');
    if(matCat) {
        const val = matCat.value;
        const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
        matCat.innerHTML = '<option value="">بدون دسته</option>' + c;
        matCat.value = val;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Auth
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        
        // 2. Data
        await fetchAllData();
        
        // 3. Show App
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        // 4. Setup Tabs
        document.getElementById('btn-tab-formulas').onclick = () => switchTab('formulas');
        document.getElementById('btn-tab-materials').onclick = () => switchTab('materials');
        document.getElementById('btn-tab-categories').onclick = () => switchTab('categories');
        document.getElementById('btn-open-store').onclick = () => switchTab('store');
        
        // 5. Setup Modules
        Formulas.setupFormulas(refreshApp);
        Materials.setupMaterials(refreshApp);
        Categories.setupCategories(refreshApp);
        Store.setupStore(refreshApp);
        Print.setupPrint();
        
        // 6. Global Inputs
        document.querySelectorAll('.price-input').forEach(el => {
            el.addEventListener('input', () => formatInput(el));
        });

        // 7. Initial Render
        updateUI();
        switchTab('formulas');
        
    } catch (err) {
        console.error(err);
        document.getElementById('loading-text').innerText = err.message;
        document.getElementById('loading-text').style.color = 'red';
    }
});