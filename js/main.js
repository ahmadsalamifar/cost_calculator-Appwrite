import { account, state } from './config.js'; // state اضافه شد
import { fetchAllData } from './api.js';
import { switchTab, formatInput } from './utils.js';
import * as Formulas from './formulas.js';
import * as Materials from './materials.js';
import * as Categories from './categories.js';
import * as Store from './store.js';
import * as Print from './print.js';

async function refreshApp() {
    await fetchAllData();
    updateUI();
}

function updateUI() {
    // 1. رفرش لیست سمت راست
    Formulas.renderFormulaList();
    
    // 2. بخش مهم: اگر فرمولی باز است، جزئیاتش (شامل لیست کالاها) را دوباره رندر کن
    if (state.activeFormulaId) {
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if (f) {
            Formulas.renderFormulaDetail(f);
        } else {
            // اگر فرمول حذف شده بود، برگرد به حالت خالی
            state.activeFormulaId = null;
            document.getElementById('formula-detail-view').classList.add('hidden');
            document.getElementById('formula-detail-empty').classList.remove('hidden');
        }
    }
    
    // 3. رفرش بقیه تب‌ها
    Materials.renderMaterials();
    Categories.renderCategories(refreshApp);
    Store.renderStore(refreshApp);
    
    // 4. آپدیت دراپ‌داون‌ها
    Formulas.updateCompSelect(); 
    
    // پر کردن دراپ‌داون دسته در فرم کالا
    const matCat = document.getElementById('mat-category');
    if(matCat) {
        const currentVal = matCat.value;
        const c = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
        matCat.innerHTML = '<option value="">بدون دسته</option>' + c;
        matCat.value = currentVal; // حفظ انتخاب قبلی
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        await fetchAllData();
        
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        
        document.getElementById('btn-tab-formulas').onclick = () => switchTab('formulas');
        document.getElementById('btn-tab-materials').onclick = () => switchTab('materials');
        document.getElementById('btn-tab-categories').onclick = () => switchTab('categories');
        document.getElementById('btn-open-store').onclick = () => switchTab('store');
        
        Formulas.setupFormulas(refreshApp);
        Materials.setupMaterials(refreshApp);
        Categories.setupCategories(refreshApp);
        Store.setupStore(refreshApp);
        Print.setupPrint();
        
        document.querySelectorAll('.price-input').forEach(el => {
            el.addEventListener('input', () => formatInput(el));
        });

        updateUI();
        switchTab('formulas');
        
    } catch (err) {
        document.getElementById('loading-text').innerText = err.message;
        document.getElementById('loading-text').style.color = 'red';
    }
});