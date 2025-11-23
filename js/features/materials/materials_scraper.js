// اصلاح آدرس‌های ایمپورت به core
import { api } from '../../core/api.js';
import { formatPrice } from '../../core/utils.js';

export function setupScraperListeners(refreshCallback) {
    setupBulkScraperButton(refreshCallback);
    setupTestLinkButton();
}

function setupBulkScraperButton(refreshCallback) {
    const btn = document.getElementById('btn-scraper-trigger');
    if (!btn) return;

    // جلوگیری از انباشت لیسنرها
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.onclick = async () => {
        if (!confirm('آیا می‌خواهید قیمت تمام کالاهای لینک‌دار را بروزرسانی کنید؟')) return;
        
        const originalHtml = newBtn.innerHTML;
        newBtn.innerHTML = '⏳ <span class="hidden sm:inline">در حال دریافت...</span>';
        newBtn.disabled = true;
        newBtn.classList.add('opacity-70');

        try {
            const result = await api.runScraper({ type: 'bulk' }); 
            if (result.success && result.report) {
                showScraperReport(result.report); 
                refreshCallback(); 
            } else {
                alert('خطا: ' + (result.error || 'پاسخ نامشخص'));
            }
        } catch(e) { 
            alert('خطا در ارتباط: ' + e.message); 
        } finally { 
            newBtn.innerHTML = originalHtml; 
            newBtn.disabled = false;
            newBtn.classList.remove('opacity-70');
        }
    };
}

function setupTestLinkButton() {
    const urlInput = document.getElementById('mat-scraper-url');
    if (!urlInput) return;
    
    if (document.getElementById('btn-test-link')) return;

    const testBtn = document.createElement('button');
    testBtn.id = 'btn-test-link';
    testBtn.type = 'button';
    testBtn.className = 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 rounded-lg h-9 text-xs font-bold shrink-0 transition-colors whitespace-nowrap';
    testBtn.innerHTML = '⚡ تست';
    
    urlInput.parentElement.appendChild(testBtn);

    testBtn.onclick = async () => {
        const url = urlInput.value;
        const anchor = document.getElementById('mat-scraper-anchor')?.value;
        const factor = parseFloat(document.getElementById('mat-scraper-factor')?.value) || 1;
        const currencyMode = document.getElementById('mat-scraper-currency')?.value || 'toman';
        
        if (!url) { alert('لطفاً لینک را وارد کنید'); return; }
        
        const originalText = testBtn.innerHTML;
        testBtn.innerHTML = '⏳';
        testBtn.disabled = true;
        
        try {
            const res = await api.runScraper({ 
                type: 'single_check', 
                url, 
                anchor, 
                factor,
                currencyMode 
            });
            
            if (res.success && res.data) {
                const p = res.data;
                const modeText = currencyMode === 'rial' ? 'ریال' : 'تومان';
                alert(`✅ قیمت نهایی با ضریب: ${formatPrice(p.final_price)} تومان\n\n(قیمت یافت شده: ${formatPrice(p.found_price)} ${modeText})`);
                
                const pInput = document.getElementById('mat-price');
                if(pInput) {
                    pInput.value = formatPrice(p.final_price);
                    pInput.classList.add('bg-green-100', 'text-green-800');
                    setTimeout(() => pInput.classList.remove('bg-green-100', 'text-green-800'), 2000);
                }
            } else {
                alert('❌ خطا: ' + (res.error || 'قیمت پیدا نشد'));
            }
        } catch(e) { 
            alert('خطا: ' + e.message); 
        } finally { 
            testBtn.innerHTML = originalText;
            testBtn.disabled = false;
        }
    };
}

function showScraperReport(report) {
    const existing = document.getElementById('report-modal');
    if (existing) existing.remove();

    let content = '';
    let successCount = 0;

    if (!report || report.length === 0) {
        content = '<p class="text-center text-slate-400 py-4">نتیجه‌ای یافت نشد.</p>';
    } else {
        report.forEach(item => {
            let style = { bg: 'bg-slate-50', border: 'border-slate-200', icon: '⚪' };
            let detail = '';

            if (item.status === 'success') {
                style = { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '✅' };
                successCount++;
                if (item.found) {
                    detail = `<div class="mt-1 text-[9px] text-slate-400">قیمت سایت: ${formatPrice(item.found)} | ${item.msg}</div>`;
                }
            }
            if (item.status === 'error') style = { bg: 'bg-rose-50', border: 'border-rose-200', icon: '❌' };
            
            content += `
            <div class="border rounded p-2 mb-1 ${style.bg} ${style.border} text-xs">
                <div class="font-bold flex justify-between text-slate-700">
                    <span class="truncate w-2/3" title="${item.name}">${style.icon} ${item.name}</span> 
                    <span class="text-[10px] opacity-70">${item.status}</span>
                </div>
                <div class="text-slate-500 mt-1 text-[10px]">${item.msg}</div>
                ${item.new ? `<div class="mt-1 font-bold text-emerald-600 text-left dir-ltr">${formatPrice(item.new)} T</div>` : ''}
                ${detail}
            </div>`;
        });
    }

    const html = `
    <div class="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" id="report-modal">
        <div class="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div class="p-3 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h3 class="font-bold text-sm text-slate-700">گزارش بروزرسانی (${successCount}/${report.length})</h3>
                <button id="btn-close-report" class="text-slate-400 hover:text-rose-500 text-xl">&times;</button>
            </div>
            <div class="p-3 overflow-y-auto flex-1 custom-scrollbar">${content}</div>
            <div class="p-3 border-t"><button id="btn-close-report-btm" class="btn btn-primary w-full text-xs">بستن</button></div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    const close = () => document.getElementById('report-modal')?.remove();
    document.getElementById('btn-close-report').onclick = close;
    document.getElementById('btn-close-report-btm').onclick = close;
}