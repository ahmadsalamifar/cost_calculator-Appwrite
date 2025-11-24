// js/features/reports/impactReport.js
import { state } from '../../core/config.js';
import { formatPrice, parseLocaleNumber } from '../../core/utils.js';
import { calculateCost } from '../formulas/formulas_calc.js';

export function renderImpactTool(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // ساختار اولیه HTML
    container.innerHTML = `
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
            <h3 class="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span class="bg-indigo-100 text-indigo-600 p-1 rounded">📉</span>
                تحلیل نوسان قیمت (Impact Analysis)
            </h3>
            
            <div class="flex flex-col md:flex-row gap-4 items-end mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div class="w-full md:w-1/3">
                    <label class="text-[10px] font-bold text-slate-500 mb-1 block">انتخاب کالا</label>
                    <select id="impact-mat-select" class="input-field text-xs h-10 bg-white"></select>
                </div>
                
                <div class="w-1/2 md:w-1/4">
                    <label class="text-[10px] font-bold text-slate-500 mb-1 block">قیمت فعلی</label>
                    <input type="text" id="impact-current-price" class="input-field text-xs h-10 bg-slate-100 text-slate-500" disabled>
                </div>

                <div class="w-1/2 md:w-1/4">
                    <label class="text-[10px] font-bold text-indigo-600 mb-1 block">قیمت فرضی (جدید)</label>
                    <input type="text" id="impact-new-price" class="input-field text-xs h-10 font-bold text-indigo-700 border-indigo-200" placeholder="قیمت جدید...">
                </div>

                <div class="w-full md:w-auto">
                    <button id="btn-calc-impact" class="btn btn-primary h-10 text-xs w-full shadow-lg shadow-indigo-500/20">محاسبه تأثیر</button>
                </div>
            </div>

            <div id="impact-results" class="hidden">
                <div class="text-xs text-slate-500 mb-2">فرمول‌های متأثر از این تغییر:</div>
                <div class="overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full text-xs text-right">
                        <thead class="bg-slate-50 text-slate-600 font-bold">
                            <tr>
                                <th class="p-2 border-b">نام محصول</th>
                                <th class="p-2 border-b text-center">قیمت قبل</th>
                                <th class="p-2 border-b text-center text-indigo-600">قیمت بعد</th>
                                <th class="p-2 border-b text-center text-rose-600">اختلاف</th>
                                <th class="p-2 border-b text-center">تغییر ٪</th>
                            </tr>
                        </thead>
                        <tbody id="impact-table-body" class="divide-y divide-slate-100"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    setupListeners();
}

function setupListeners() {
    const select = document.getElementById('impact-mat-select');
    const currentInput = document.getElementById('impact-current-price');
    const newInput = document.getElementById('impact-new-price');
    const btn = document.getElementById('btn-calc-impact');

    // پر کردن لیست کالاها
    select.innerHTML = '<option value="">یک کالا انتخاب کنید...</option>' + 
        state.materials.sort((a,b) => a.name.localeCompare(b.name)).map(m => 
            `<option value="${m.$id}" data-price="${m.price}">${m.name}</option>`
        ).join('');

    // تغییر کالا
    select.onchange = () => {
        const id = select.value;
        if(!id) {
            currentInput.value = '';
            newInput.value = '';
            return;
        }
        const m = state.materials.find(x => x.$id === id);
        if(m) {
            currentInput.value = formatPrice(m.price);
            newInput.value = ''; // خالی کردن برای ورود دستی
            newInput.focus();
        }
    };

    // دکمه محاسبه
    btn.onclick = () => {
        const matId = select.value;
        const newPrice = parseLocaleNumber(newInput.value);
        
        if(!matId || isNaN(newPrice)) return alert('لطفاً کالا و قیمت جدید را مشخص کنید');
        
        calculateImpact(matId, newPrice);
    };
}

function calculateImpact(matId, newPrice) {
    const mat = state.materials.find(m => m.$id === matId);
    if (!mat) return;

    const originalPrice = mat.price;
    const results = [];

    // ۱. محاسبه قیمت تمام فرمول‌ها با قیمت فعلی (کش شده یا واقعی)
    // برای اطمینان، یک بار محاسبه می‌کنیم
    const oldCosts = state.formulas.map(f => ({ id: f.$id, cost: calculateCost(f).final }));

    // ۲. تغییر موقت قیمت در State (هک هوشمندانه برای استفاده مجدد از موتور محاسبه)
    mat.price = newPrice;

    // ۳. محاسبه مجدد و یافتن اختلاف
    state.formulas.forEach((f, idx) => {
        const newCost = calculateCost(f).final;
        const oldCost = oldCosts[idx].cost;

        if (Math.abs(newCost - oldCost) > 1) { // اگر تغییری بیشتر از ۱ تومان داشت
            results.push({
                name: f.name,
                old: oldCost,
                new: newCost,
                diff: newCost - oldCost,
                percent: ((newCost - oldCost) / oldCost) * 100
            });
        }
    });

    // ۴. بازگرداندن قیمت اصلی
    mat.price = originalPrice;

    // ۵. نمایش نتایج
    renderTable(results);
}

function renderTable(list) {
    const container = document.getElementById('impact-results');
    const tbody = document.getElementById('impact-table-body');
    
    container.classList.remove('hidden');
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">این تغییر قیمت تأثیری بر هیچ فرمولی ندارد.</td></tr>';
        return;
    }

    // مرتب‌سازی بر اساس بیشترین اختلاف قیمت
    list.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    tbody.innerHTML = list.map(item => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="p-2 font-bold text-slate-700">${item.name}</td>
            <td class="p-2 text-center text-slate-500">${formatPrice(item.old)}</td>
            <td class="p-2 text-center font-bold text-indigo-700">${formatPrice(item.new)}</td>
            <td class="p-2 text-center dir-ltr font-mono ${item.diff > 0 ? 'text-rose-600' : 'text-emerald-600'}">
                ${item.diff > 0 ? '+' : ''}${formatPrice(item.diff)}
            </td>
            <td class="p-2 text-center text-slate-400 text-[10px]">%${item.percent.toFixed(2)}</td>
        </tr>
    `).join('');
}