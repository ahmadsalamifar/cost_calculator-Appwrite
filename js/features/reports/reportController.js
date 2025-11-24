import { renderImpactTool } from './impactReport.js';
import { renderStockChart } from './stockChart.js';
import { renderCategoryChart } from './categoryChart.js';

export function init() {}

export function renderReports() {
    try {
        renderImpactTool('impact-analysis-container');
    } catch (e) { console.warn("Impact tool error:", e); }

    renderStockChart('chart-stock-value');
    renderCategoryChart('chart-categories');
}