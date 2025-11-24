import { state } from '../../core/config.js';
import { formatPrice } from '../../core/utils.js';

let chartInstance = null;

export function renderStockChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    const catData = {};
    
    state.materials.forEach(m => {
        const catName = state.categories.find(c => c.$id === m.category_id)?.name || 'بدون دسته';
        if (!catData[catName]) catData[catName] = 0;
        catData[catName] += m.price || 0;
    });

    const labels = Object.keys(catData);
    const data = Object.values(catData);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'مجموع ارزش ریالی واحدها',
                data: data,
                backgroundColor: '#0d9488',
                borderRadius: 4,
                hoverBackgroundColor: '#0f766e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // این گزینه نیازمند کانتینر با ارتفاع مشخص است
            plugins: {
                legend: { display: false },
                tooltip: {
                    bodyFont: { family: 'Vazirmatn' },
                    titleFont: { family: 'Vazirmatn' },
                    callbacks: {
                        label: function(context) {
                            return formatPrice(context.raw) + ' تومان';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { font: { family: 'Vazirmatn' } }
                },
                x: {
                    ticks: { font: { family: 'Vazirmatn' } }
                }
            }
        }
    });
}