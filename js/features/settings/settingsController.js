import { api } from '../../core/api.js';
import { state, APPWRITE_CONFIG } from '../../core/config.js';
import { showToast } from '../../core/utils.js';
import * as UI from './settingsUI.js';

// گلوبال فانکشن برای تغییر زبان که در main.js تعریف شده را صدا می‌زنیم
// یا مستقیماً از اینجا رفرش می‌کنیم

export function init(refreshCb) {
    UI.setupForms(
        (name) => addItem(APPWRITE_CONFIG.COLS.CATS, { name }, 'cat-name', refreshCb),
        (name) => addItem(APPWRITE_CONFIG.COLS.UNITS, { name }, 'unit-name', refreshCb)
    );
    
    UI.setupBackupButton(exportData);

    // --- لیسنرهای زبان (جدید) ---
    const btnFa = document.getElementById('btn-set-lang-fa');
    if (btnFa) btnFa.onclick = () => window.selectAppLang('fa');

    const btnEn = document.getElementById('btn-set-lang-en');
    if (btnEn) btnEn.onclick = () => window.selectAppLang('en');
}

export function renderSettings(refreshCb) {
    UI.renderList('category-list', state.categories, (id) => delItem(APPWRITE_CONFIG.COLS.CATS, id, refreshCb));
    UI.renderList('unit-list', state.units, (id) => delItem(APPWRITE_CONFIG.COLS.UNITS, id, refreshCb));
}

async function addItem(col, data, inputId, cb) {
    if (!data.name) return;
    try {
        await api.create(col, data);
        document.getElementById(inputId).value = '';
        cb();
        showToast('آیتم اضافه شد', 'success');
    } catch(e) { showToast(e.message, 'error'); }
}

async function delItem(col, id, cb) {
    if(!confirm('حذف شود؟')) return;
    try { 
        await api.delete(col, id); 
        cb(); 
        showToast('حذف شد', 'success');
    } catch(e) { showToast(e.message, 'error'); }
}

function exportData() {
    const data = {
        timestamp: new Date().toISOString(),
        materials: state.materials,
        formulas: state.formulas,
        categories: state.categories,
        units: state.units
    };
    const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const a = document.createElement('a');
    a.href = str;
    a.download = "backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('نسخه پشتیبان دانلود شد', 'info');
}