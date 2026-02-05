// نقطه ورود برنامه
import { account, state, APPWRITE_CONFIG, Query } from './core/config.js';
import { api } from './core/api.js';
import { switchTab, toggleElement, showToast } from './core/utils.js';
import { setupPrint } from './print.js'; 
import { injectAppLayout } from './layout/layout.js';
import { getLanguage, setLanguage, initLanguage } from './core/i18n.js'; 

import * as MaterialController from './features/materials/materialController.js';
import * as FormulaController from './features/formulas/formulaController.js';
import * as SettingsController from './features/settings/settingsController.js';
import * as StoreController from './features/store/storeController.js';
import * as ReportController from './features/reports/reportController.js';

// تابع گلوبال برای تغییر زبان (قابل استفاده در دکمه‌ها)
window.selectAppLang = function(lang) {
    if(setLanguage(lang)) {
        location.reload(); 
    }
};

async function initApp() {
    // 1. بررسی وضعیت زبان
    const savedLang = getLanguage();
    
    // اگر زبانی ذخیره نشده، پیش‌فرض فارسی شود اما یک نوتیفیکیشن برای انتخاب بدهد
    if (!savedLang) {
        setLanguage('fa'); 
        initLanguage();
        // نمایش نوتیفیکیشن انتخاب زبان (مدت زمان 15 ثانیه)
        showToast(`
            <div class="flex flex-col gap-2">
                <p>زبان پیش‌فرض: <b>فارسی</b></p>
                <p class="text-[10px] font-normal opacity-80">Default Language: Persian</p>
                <div class="flex gap-2 mt-1">
                    <button class="bg-white/20 border border-white/30 px-3 py-1 rounded text-xs hover:bg-white/30 transition-colors" onclick="selectAppLang('en')">
                        Change to English
                    </button>
                    <button class="bg-white text-slate-800 font-bold px-3 py-1 rounded text-xs hover:bg-slate-200 transition-colors" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">
                        تایید (OK)
                    </button>
                </div>
            </div>
        `, 'info', 15000);
    } else {
        initLanguage();
    }
    
    // 2. تزریق HTML
    injectAppLayout();

    try {
        // 3. Auth
        try { await account.get(); } 
        catch { await account.createAnonymousSession(); }

        // 4. Data
        await refreshData();
        
        // 5. Modules
        FormulaController.init(refreshApp);
        MaterialController.init(refreshApp);
        SettingsController.init(refreshApp);
        if(StoreController.init) StoreController.init(refreshApp);
        ReportController.init();
        
        setupPrint(); 

        // 6. UI
        toggleElement('loading-screen', false);
        toggleElement('app-content', true);
        
        setupTabs();
        switchTab('formulas');
        
        updateAllUI();

    } catch (err) {
        console.error(err);
        const loadingText = document.getElementById('loading-text');
        if(loadingText) loadingText.innerText = "Error: " + err.message;
        else showToast(err.message, 'error');
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
    
    if(!document.getElementById('loading-screen').classList.contains('hidden')) return;
    updateAllUI();
}

function updateAllUI() {
    MaterialController.renderMaterials();
    FormulaController.renderFormulaList();
    SettingsController.renderSettings(refreshApp);
    StoreController.renderStore(refreshApp);
    ReportController.renderReports();
}

function setupTabs() {
    ['formulas', 'materials', 'reports', 'categories'].forEach(t => {
        const btn = document.getElementById('btn-tab-' + t);
        if(btn) btn.onclick = () => {
            switchTab(t);
            if (t === 'reports') ReportController.renderReports();
        };
    });
    const btnStore = document.getElementById('btn-open-store');
    if(btnStore) btnStore.onclick = () => switchTab('store');
}

async function refreshApp() {
    await refreshData();
}

document.addEventListener('DOMContentLoaded', initApp);