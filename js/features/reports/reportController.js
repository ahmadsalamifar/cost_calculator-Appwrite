// js/features/reports/reportController.js
// کنترلر اصلی که تمام گزارش‌ها را مدیریت می‌کند

import { renderImpactTool } from './impactReport.js';
import { renderStockChart } from './stockChart.js';
import { renderCategoryChart } from './categoryChart.js';

export function init() {
    // اگر در آینده نیاز به لیسنرهای کلی برای تب گزارشات بود، اینجا اضافه می‌شود
}

export function renderReports() {
    // 1. ابزار تحلیل نوسان قیمت
    // (مطمئن شوید که فایل impactReport.js که در مرحله قبل ساختید وجود دارد)
    try {
        renderImpactTool('impact-analysis-container');
    } catch (e) { console.warn("Impact tool error:", e); }

    // 2. نمودار ارزش انبار
    renderStockChart('chart-stock-value');

    // 3. نمودار توزیع دسته‌بندی
    renderCategoryChart('chart-categories');
}