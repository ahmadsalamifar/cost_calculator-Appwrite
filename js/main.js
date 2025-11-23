// نقطه ورود برنامه
import { account, state, APPWRITE_CONFIG, Query } from './core/config.js';
import { api } from './core/api.js';
import { switchTab, toggleElement } from './core/utils.js';
import { setupPrint } from './print.js'; 

import * as MaterialController from './features/materials/materialController.js';
import * as FormulaController from './features/formulas/formulaController.js';
import * as SettingsController from './features/settings/settingsController.js';
import * as StoreController from './features/store/storeController.js';

async function initApp() {
    try {
        // 1. احراز هویت
        try { await account.get(); } 
        catch { await account.createAnonymousSession(); }

        // 2. دریافت دیتا
        await refreshData();
        
        // 3. راه‌اندازی ماژول‌ها و تزریق HTML
        FormulaController.init(refreshApp);
        MaterialController.init(refreshApp);
        SettingsController.init(refreshApp);
        if(StoreController.init) StoreController.init(refreshApp);
        
        setupPrint(); 

        // 4. نمایش UI و تب‌ها
        toggleElement('loading-screen', false);
        toggleElement('app-content', true);
        
        setupTabs();
        switchTab('formulas');
        
        // 5. رفرش اولیه لیست‌ها (مطمئن می‌شویم بعد از نمایش UI پر شوند)
        updateAllUI();

    } catch (err) {
        console.error(err);
        document.getElementById('loading-text').innerText = "خطا: " + err.message;
    }
}

async function refreshData() {
    const [c, u, m, f] = await Promise.all([
        api.list(APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
        api.list(APPWRITE_CONFIG.COLS.UNITS, [Query.limit(100)]),
        api.list(APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
        api.list(APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
    ]);

    state.categories = c.documents;
    state.units = u.documents;
    state.materials = m.documents;
    state.formulas = f.documents;
    
    // اگر UI قبلا ساخته شده، آن را آپدیت کن
    if(!document.getElementById('loading-screen').classList.contains('hidden')) return;
    updateAllUI();
}

function updateAllUI() {
    MaterialController.renderMaterials();
    FormulaController.renderFormulaList();
    SettingsController.renderSettings(refreshApp);
    StoreController.renderStore(refreshApp);
}

function setupTabs() {
    ['formulas', 'materials', 'categories'].forEach(t => {
        const btn = document.getElementById('btn-tab-' + t);
        if(btn) btn.onclick = () => switchTab(t);
    });
    const btnStore = document.getElementById('btn-open-store');
    if(btnStore) btnStore.onclick = () => switchTab('store');
}

async function refreshApp() {
    await refreshData();
}

document.addEventListener('DOMContentLoaded', initApp);