import { api } from '../../core/api.js';
import { formatPrice, showToast } from '../../core/utils.js';
import { APPWRITE_CONFIG, state } from '../../core/config.js';

export function setupScraperListeners(refreshCallback) {
    setupBulkScraperButton(refreshCallback);
    setupTestLinkButton();
}

/**
 * راه‌اندازی دکمه بروزرسانی گروهی
 * تغییر: تبدیل از حالت Bulk سروری به حالت Iterative کلاینتی (مرحله‌به‌مرحله)
 */
function setupBulkScraperButton(refreshCallback) {
    const btn = document.getElementById('btn-scraper-trigger');
    if (!btn) return;

    // کلون کردن دکمه برای اطمینان از حذف لیسنرهای قبلی
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.onclick = async () => {
        // 1. شناسایی کالاهای دارای لینک
        const targets = state.materials.filter(m => m.scraper_url && m.scraper_url.length > 5);
        
        if (targets.length === 0) {
            return showToast('هیچ کالایی دارای لینک معتبر برای بروزرسانی نیست.', 'error');
        }

        if (!confirm(`آیا می‌خواهید قیمت ${targets.length} کالا را به‌صورت مرحله‌به‌مرحله بروزرسانی کنید؟\n(این روش دقیق‌تر است اما بسته به تعداد کالاها زمان می‌برد)`)) return;
        
        // ذخیره وضعیت دکمه
        const originalHtml = newBtn.innerHTML;
        newBtn.disabled = true;
        newBtn.classList.add('opacity-70');
        
        let successCount = 0;
        let failCount = 0;
        const report = []; // جمع‌آوری گزارش برای نمایش در پایان

        try {
            showToast('شروع بروزرسانی مرحله‌به‌مرحله...', 'info');

            // 2. حلقه روی کالاها (Step-by-Step Execution)
            for (let i = 0; i < targets.length; i++) {
                const item = targets[i];
                
                // نمایش پیشرفت روی دکمه
                const percent = Math.round(((i + 1) / targets.length) * 100);
                newBtn.innerHTML = `<span class="font-mono text-[10px] ml-1">(${i + 1}/${targets.length})</span> ⏳ ${percent}%`;

                try {
                    // استخراج تنظیمات ارز (تومان/ریال)
                    let currency = 'toman';
                    try {
                        const rels = typeof item.unit_relations === 'string' ? JSON.parse(item.unit_relations) : item.unit_relations;
                        if (rels && rels.scraper_currency) currency = rels.scraper_currency;
                    } catch(e) {}

                    // 3. ارسال درخواست تکی (Single Check)
                    // چون درخواست تکی سریع است، تایم‌اوت نمی‌خورد
                    const result = await api.runScraper({ 
                        type: 'single_check', 
                        url: item.scraper_url, 
                        anchor: item.scraper_anchor, 
                        factor: item.scraper_factor || 1, 
                        currencyMode: currency 
                    });

                    if (result.success && result.data) {
                        const newPrice = result.data.final_price;
                        
                        // 4. ذخیره در دیتابیس (آپدیت کالا + ثبت تاریخچه)
                        // تغییر مهم: دریافت خروجی آپدیت برای داشتن تاریخ بروزرسانی جدید
                        const [updatedDoc] = await Promise.all([
                            api.update(APPWRITE_CONFIG.COLS.MATS, item.$id, { price: newPrice }),
                            api.create(APPWRITE_CONFIG.COLS.HISTORY, {
                                material_id: item.$id,
                                price: newPrice,
                                date: new Date().toISOString()
                            })
                        ]);

                        // آپدیت استیت لوکال با داده‌های واقعی سرور (شامل تاریخ بروزرسانی جدید)
                        // این خط باعث می‌شود تاریخ در UI بلافاصله درست شود
                        if (updatedDoc) {
                            Object.assign(item, updatedDoc);
                        } else {
                            // حالت Fallback اگر به هر دلیلی داکیومنت برنگشت
                            item.price = newPrice;
                            item.$updatedAt = new Date().toISOString();
                        }
                        
                        report.push({ 
                            status: 'success', 
                            name: item.name, 
                            new: newPrice, 
                            found: result.data.found_price, 
                            msg: 'بروزرسانی شد' 
                        });
                        successCount++;
                    } else {
                        throw new Error(result.error || 'قیمت در صفحه یافت نشد');
                    }

                } catch (itemError) {
                    console.error(`خطا در کالا ${item.name}:`, itemError);
                    report.push({ status: 'error', name: item.name, msg: itemError.message });
                    failCount++;
                }

                // یک وقفه کوتاه (300ms) برای تنفس شبکه و جلوگیری از بلاک شدن UI
                await new Promise(r => setTimeout(r, 300));
            }

            // 5. پایان عملیات
            showScraperReport(report);
            refreshCallback(); // رندر مجدد لیست کالاها با داده‌های آپدیت شده
            showToast(`عملیات پایان یافت. ${successCount} موفق، ${failCount} ناموفق.`, 'success');

        } catch (globalError) {
            console.error(globalError);
            showToast('خطای کلی در فرآیند: ' + globalError.message, 'error');
        } finally {
            // بازگرداندن دکمه به حالت اول
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
        
        if (!url) { showToast('لطفاً لینک را وارد کنید', 'error'); return; }
        
        const originalText = testBtn.innerHTML;
        testBtn.innerHTML = '⏳';
        testBtn.disabled = true;
        
        try {
            const res = await api.runScraper({ 
                type: 'single_check', url, anchor, factor, currencyMode 
            });
            
            if (res.success && res.data) {
                const p = res.data;
                const modeText = currencyMode === 'rial' ? 'ریال' : 'تومان';
                showToast(`قیمت یافت شد: ${formatPrice(p.found_price)} ${modeText}`, 'success');
                
                const pInput = document.getElementById('mat-price');
                if(pInput) {
                    pInput.value = formatPrice(p.final_price);
                    pInput.classList.add('bg-green-100', 'text-green-800');
                    setTimeout(() => pInput.classList.remove('bg-green-100', 'text-green-800'), 2000);
                }
            } else {
                showToast('خطا: ' + (res.error || 'قیمت پیدا نشد'), 'error');
            }
        } catch(e) { 
            showToast('خطا: ' + e.message, 'error'); 
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