import { state } from '../../core/config.js';

let chartInstance = null;

export function renderCategoryChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    const catCounts = {};
    state.materials.forEach(m => {
        const catName = state.categories.find(c => c.$id === m.category_id)?.name || 'بدون دسته';
        catCounts[catName] = (catCounts[catName] || 0) + 1;
    });

    const labels = Object.keys(catCounts);
    const data = Object.values(catCounts);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#0d9488', '#f59e0b', '#f43f5e', '#3b82f6', '#8b5cf6', '#64748b', '#ec4899', '#14b8a6'
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // این گزینه نیازمند کانتینر با ارتفاع مشخص است
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { font: { family: 'Vazirmatn' } }
                },
                tooltip: {
                    bodyFont: { family: 'Vazirmatn' }
                }
            }
        }
    });
}