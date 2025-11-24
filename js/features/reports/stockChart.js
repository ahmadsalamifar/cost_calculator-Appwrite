// js/features/reports/stockChart.js
import { state } from '../../core/config.js';
import { formatPrice } from '../../core/utils.js';

let chartInstance = null;

export function renderStockChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');

    // محاسبه داده‌ها: جمع قیمت کالاها به تفکیک دسته‌بندی
    const catData = {};
    
    state.materials.forEach(m => {
        const catName = state.categories.find(c => c.$id === m.category_id)?.name || 'بدون دسته';
        if (!catData[catName]) catData[catName] = 0;
        // فرض بر این است که قیمت واحد معیار ارزش است (چون فیلد تعداد در انبار نداریم)
        catData[catName] += m.price || 0;
    });

    const labels = Object.keys(catData);
    const data = Object.values(catData);

    // حذف نمودار قبلی برای جلوگیری از روی هم افتادن
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'مجموع ارزش ریالی واحدها',
                data: data,
                backgroundColor: '#0d9488', // رنگ teal-600
                borderRadius: 4,
                hoverBackgroundColor: '#0f766e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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