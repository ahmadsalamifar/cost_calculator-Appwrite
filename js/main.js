import { account, state } from './config.js';
import { fetchAllData } from './api.js';
import { switchTab, formatPrice, parseLocaleNumber } from './utils.js';
import * as Formulas from './formulas.js';
import * as Materials from './materials.js';
import * as Categories from './categories.js';
import * as Store from './store.js';
import * as Print from './print.js';

async function refreshApp() {
    try { await fetchAllData(); updateUI(); } catch (e) { console.error("Refresh failed:", e); }
}

function updateUI() {
    Formulas.renderFormulaList();
    Materials.renderMaterials();
    Categories.renderCategories(refreshApp);
    Store.renderStore(refreshApp);
    
    if (state.activeFormulaId) {
        const f = state.formulas.find(x => x.$id === state.activeFormulaId);
        if (f) Formulas.renderFormulaDetail(f);
        else {
            state.activeFormulaId = null;
            document.getElementById('formula-detail-view')?.classList.add('hidden');
            document.getElementById('formula-detail-view')?.classList.remove('flex');
            document.getElementById('formula-detail-empty')?.classList.remove('hidden');
        }
    }
    Formulas.updateDropdowns();
    Formulas.updateCompSelect();
    updateMatCatDropdown();
    
    // آپدیت نمودارها اگر تب گزارشات باز باشد
    const reportsTab = document.getElementById('tab-reports');
    if (reportsTab && !reportsTab.classList.contains('hidden')) {
        renderReports();
    }
}

function updateMatCatDropdown() {
    const matCat = document.getElementById('mat-category');
    if (!matCat) return;
    const val = matCat.value;
    const options = state.categories.map(x => `<option value="${x.$id}">${x.name}</option>`).join('');
    matCat.innerHTML = '<option value="">بدون دسته</option>' + options;
    matCat.value = val;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        try { await account.get(); } catch { await account.createAnonymousSession(); }
        await fetchAllData();
        
        const loading = document.getElementById('loading-screen');
        if (loading) loading.classList.add('hidden');
        document.getElementById('app-content')?.classList.remove('hidden');
        
        // Tab Management - با بررسی دقیق وجود دکمه‌ها
        ['formulas', 'materials', 'categories', 'reports'].forEach(t => {
             const btn = document.getElementById('btn-tab-' + t);
             if (btn) {
                 btn.onclick = () => { 
                     switchTab(t); 
                     if(t === 'reports' && typeof renderReports === 'function') renderReports(); 
                 };
             } else {
                 console.warn(`Warning: Tab button 'btn-tab-${t}' not found in HTML.`);
             }
        });
        
        const btnStore = document.getElementById('btn-open-store');
        if (btnStore) btnStore.onclick = () => switchTab('store');

        Formulas.setupFormulas(refreshApp);
        Materials.setupMaterials(refreshApp);
        Categories.setupCategories(refreshApp);
        Store.setupStore(refreshApp);
        Print.setupPrint();
        
        setupGlobalPriceInputs();
        updateUI();
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
             if (val !== 0 || e.target.value.trim() !== '') e.target.value = formatPrice(val);
        });
    });
}

// --- منطق گزارشات و نمودار (Chart.js) ---
let stockChart = null;
let categoryChart = null;

function renderReports() {
    const ctxStock = document.getElementById('chart-stock-value');
    const ctxCat = document.getElementById('chart-categories');
    
    // اگر کتابخانه چارت لود نشده یا المان‌ها نیستند، بیخیال شو
    if (typeof Chart === 'undefined' || !ctxStock || !ctxCat) return;

    // داده‌های موجودی انبار
    const topStock = state.materials
        .map(m => ({ name: m.name, value: (m.stock || 0) * (m.avg_price || 0) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // 10 تای اول

    // داده‌های دسته‌بندی
    const catStats = {};
    state.materials.forEach(m => {
        const catName = state.categories.find(c => c.$id === m.category_id)?.name || 'سایر';
        catStats[catName] = (catStats[catName] || 0) + 1;
    });

    if (stockChart) stockChart.destroy();
    stockChart = new Chart(ctxStock, {
        type: 'bar',
        data: {
            labels: topStock.map(x => x.name),
            datasets: [{
                label: 'ارزش موجودی (تومان)',
                data: topStock.map(x => x.value),
                backgroundColor: '#0d9488',
                borderRadius: 5
            }]
        },
        options: { responsive: true, fontFamily: 'Vazirmatn' }
    });

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catStats),
            datasets: [{
                data: Object.values(catStats),
                backgroundColor: ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa']
            }]
        },
        options: { responsive: true, fontFamily: 'Vazirmatn' }
    });
}