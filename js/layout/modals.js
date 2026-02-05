import { t } from '../core/i18n.js';

export function getLoadingHTML() {
    return `
    <div id="loading-screen">
        <div class="spinner"></div>
        <h2 class="text-xl font-bold mb-2">${t('app_name')}</h2>
        <p class="text-xs text-slate-400" id="loading-text">${t('loading')}</p>
    </div>
    `;
}

// تابع getLanguageModalHTML حذف شد چون دیگر استفاده نمی‌شود.

export function getModalsHTML() {
    return `
    <div id="new-formula-modal" class="modal-overlay hidden">
        <div class="modal-content max-w-sm p-6 m-4">
            <h3 class="font-bold text-slate-800 mb-4">محصول جدید</h3>
            <input type="text" id="new-formula-name" class="input-field mb-6 text-center font-bold" placeholder="نام محصول...">
            <div class="flex gap-3"><button id="btn-create-formula" class="btn btn-primary flex-1" type="button">ایجاد</button><button id="btn-cancel-formula" class="btn btn-secondary flex-1" type="button">لغو</button></div>
        </div>
    </div>
    
    <div id="print-modal" class="modal-overlay hidden z-50">
        <div class="modal-content max-w-4xl h-[90vh] m-4">
             <div class="bg-slate-100 p-4 border-b flex flex-col md:flex-row gap-4 no-print shrink-0">
                <input type="text" id="print-seller-input" placeholder="نام فروشنده" class="input-field text-xs" value="گروه صنعتی سیمرغ">
                <input type="text" id="print-buyer-input" placeholder="نام خریدار" class="input-field text-xs">
                <div class="flex gap-2 mr-auto w-full md:w-auto">
                    <button onclick="window.print()" class="btn btn-primary text-xs px-4 flex-1 md:flex-none" type="button">🖨 چاپ</button>
                    <button id="btn-close-print" class="btn btn-secondary text-xs flex-1 md:flex-none" type="button">بستن</button>
                </div>
            </div>
            <div class="p-4 md:p-12 bg-white text-slate-900 overflow-y-auto h-full" id="print-area">
                <div class="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                    <div><h1 class="text-xl md:text-2xl font-black text-slate-800" id="print-seller-name">سیمرغ گستر پویا</h1></div>
                    <div class="text-left"><div class="text-2xl md:text-3xl font-black text-slate-200">INVOICE</div><div class="text-sm font-mono text-slate-500 mt-1"><span id="print-date">---</span></div></div>
                </div>
                <div class="bg-slate-50 p-4 rounded border border-slate-200 mb-8 flex justify-between"><div id="print-title" class="font-bold text-lg"></div><div id="print-buyer-name" class="font-bold"></div></div>
                <table class="w-full text-sm mb-8"><thead><tr class="border-b-2 border-slate-800"><th class="text-right py-2">شرح</th><th class="text-center">تعداد</th><th class="text-center">واحد</th></tr></thead><tbody id="print-rows"></tbody></table>
                <div class="flex justify-end"><div class="w-1/2 md:w-1/3"><div class="flex justify-between font-bold text-xl border-t pt-2"><span>جمع:</span><span id="print-final">0</span></div></div></div>
            </div>
        </div>
    </div>
    `;
}