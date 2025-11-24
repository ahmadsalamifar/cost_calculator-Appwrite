import { state, APPWRITE_CONFIG, Query } from '../../core/config.js';
import { api } from '../../core/api.js';
import { calculateCost } from '../formulas/formulas_calc.js';
import * as UI from './impactUI.js';
import * as HistoryModule from './impactHistory.js';

export function renderImpactTool(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. رندر کردن HTML اولیه
    container.innerHTML = UI.getImpactToolHTML(state.materials);

    // 2. اتصال رویدادها
    setupListeners();
}

function setupListeners() {
    // دکمه تحلیل آنلاین
    const btnOnline = document.getElementById('btn-online-impact');
    if (btnOnline) btnOnline.onclick = handleOnlineAnalysis;

    // دکمه تاریخچه
    const btnHistory = document.getElementById('btn-load-history');
    if (btnHistory) {
        btnHistory.onclick = () => {
            const matId = document.getElementById('history-mat-select').value;
            HistoryModule.loadPriceHistory(matId);
        };
    }
}

async function handleOnlineAnalysis() {
    const btn = document.getElementById('btn-online-impact');
    if(!confirm('آیا مطمئن هستید؟ قیمت کالاها در دیتابیس بروزرسانی خواهد شد.')) return;

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '⏳ در حال اسکن و محاسبه...';
    btn.disabled = true;
    btn.classList.add('opacity-75');

    // ذخیره قیمت تمام شده محصولات قبل از آپدیت
    const preCosts = new Map();
    state.formulas.forEach(f => preCosts.set(f.$id, calculateCost(f).final));

    try {
        // اجرای اسکرپر
        const scraperResult = await api.runScraper({ type: 'bulk' });
        
        if (!scraperResult.success) throw new Error(scraperResult.error || 'خطا در ارتباط با سرور');

        // رفرش کردن متریال‌ها از دیتابیس برای دریافت قیمت‌های جدید
        const m = await api.list(APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]);
        state.materials = m.documents;

        // محاسبه تأثیرات
        const impacts = [];
        state.formulas.forEach(f => {
            const oldCost = preCosts.get(f.$id) || 0;
            const newCost = calculateCost(f).final; // محاسبه با قیمت‌های جدید state
            
            // فقط اگر تغییر قابل توجهی (بیشتر از 1 تومان) بود
            if (Math.abs(newCost - oldCost) > 1) {
                impacts.push({
                    name: f.name,
                    old: oldCost,
                    new: newCost,
                    diff: newCost - oldCost,
                    percent: oldCost > 0 ? ((newCost - oldCost) / oldCost) * 100 : 0
                });
            }
        });

        UI.renderResultsTable(impacts);
        
        const count = scraperResult.report ? scraperResult.report.filter(r => r.new).length : 0;
        if(count === 0) alert('هیچ تغییر قیمتی در سایت‌ها یافت نشد.');
        else alert(`✅ قیمت ${count} کالا بروزرسانی شد و تأثیرات محاسبه گردید.`);

    } catch (e) {
        alert('خطا: ' + e.message);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.classList.remove('opacity-75');
    }
}
