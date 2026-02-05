import { t } from '../core/i18n.js';

export function getMaterialsTabHTML() {
    return `
    <div id="tab-materials" class="tab-content hidden h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
        <!-- ستون لیست -->
        <div class="w-full lg:w-2/3 order-1 lg:order-2 flex flex-col h-full overflow-hidden">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div class="p-3 border-b flex flex-wrap gap-2 items-center bg-slate-50 rounded-t-2xl shrink-0">
                    <button id="btn-new-mat-plus" class="bg-emerald-600 text-white rounded-xl px-3 h-10 flex items-center justify-center text-sm font-bold shadow hover:bg-emerald-700 transition-colors gap-1 shrink-0"><span>+</span> <span class="hidden sm:inline">${t('new_material')}</span></button>
                    <button id="btn-scraper-trigger" class="h-10 text-xs text-blue-600 bg-blue-50 px-3 rounded-xl border border-blue-200 hover:bg-blue-100 whitespace-nowrap font-bold flex items-center gap-1 shrink-0"><span>🔄</span> <span class="">${t('get_prices')}</span></button>
                    <div class="relative flex-grow min-w-[120px]">
                        <input type="text" id="search-materials" placeholder="${t('search_placeholder')}" class="input-field h-10 text-xs w-full pl-8">
                        <span class="absolute left-2 top-2.5 text-slate-400 text-xs">🔍</span>
                    </div>
                    <select id="sort-materials" class="input-field w-32 text-xs h-10 shrink-0">
                        <option value="update_desc">${t('sort_newest')}</option>
                        <option value="price_desc">${t('sort_expensive')}</option>
                        <option value="price_asc">${t('sort_cheap')}</option>
                        <option value="name_asc">${t('sort_alphabet')}</option>
                        <option value="category">${t('sort_category')}</option>
                    </select>
                </div>
                <div id="materials-container" class="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 custom-scrollbar content-start"></div>
            </div>
        </div>
        <!-- ستون فرم -->
        <div class="w-full lg:w-1/3 order-2 lg:order-1 h-fit lg:h-full flex flex-col overflow-hidden shrink-0">
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 h-full overflow-y-auto custom-scrollbar">
                    <h3 class="font-bold text-slate-700 mb-3 text-sm border-b pb-2 flex items-center gap-2 sticky top-0 bg-white z-10"><span class="bg-emerald-100 text-emerald-600 p-1 rounded">✏️</span> ${t('manage_material')}</h3>
                    <form id="material-form" class="space-y-3 pb-4">
                    <input type="hidden" id="mat-id">
                    <select id="mat-category" class="input-field bg-slate-50 text-xs"><option value="">${t('category_label')}</option></select>
                    <input type="text" id="mat-name" class="input-field text-xs font-bold" placeholder="${t('name_placeholder')}" required>
                    <input type="text" id="mat-display-name" class="input-field text-xs" placeholder="${t('display_name_placeholder')}">
                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div class="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1"><span class="text-amber-500">📐</span> ${t('units_header')}</div>
                        <div class="flex items-center gap-2 mb-2 bg-white p-2 rounded border border-slate-100">
                            <span class="text-[11px] w-16 shrink-0 text-slate-500 font-bold">${t('base_unit')}</span>
                            <select id="mat-base-unit-select" class="input-field text-xs bg-slate-50 flex-grow font-bold border-none shadow-none p-0 h-6"></select>
                        </div>
                        <div id="unit-relations-container" class="space-y-1.5 mb-2"></div>
                        <!-- ID این دکمه حیاتی است -->
                        <button type="button" id="btn-add-relation" class="text-[10px] text-slate-500 bg-white hover:bg-slate-100 px-2 py-2 rounded border border-slate-200 w-full border-dashed transition-colors">${t('add_unit_relation')}</button>
                    </div>
                    <div class="bg-teal-50 p-3 rounded-xl border border-teal-100">
                        <label class="text-[10px] text-teal-800 mb-1 block font-bold">${t('price_inquiry')}</label>
                        <div class="flex gap-2 items-center">
                            <input type="text" id="mat-price" class="input-field text-sm text-teal-700 font-bold w-2/3 border-teal-200 h-10 ltr text-left" placeholder="0" required>
                            <div class="w-1/3 relative"><select id="mat-price-unit" class="input-field text-[10px] bg-white h-10 pt-1 font-bold text-slate-600 border-teal-200 truncate"></select></div>
                        </div>
                        <div class="mt-2 flex items-center gap-2 bg-white p-2 rounded border border-teal-100/50">
                            <input type="checkbox" id="mat-has-tax" class="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500 cursor-pointer">
                            <label for="mat-has-tax" class="text-[11px] text-teal-800 cursor-pointer select-none">${t('tax_included')}</label>
                        </div>
                    </div>
                    <div class="pt-2 border-t border-dashed mt-2">
                        <div class="flex justify-between items-center mb-2"><label class="text-[10px] font-bold text-slate-500 flex items-center gap-1"><span>🌐</span> ${t('site_link')}</label></div>
                        <div class="flex flex-col gap-2">
                            <div class="flex gap-2 items-center">
                                    <input type="url" id="mat-scraper-url" class="input-field text-xs text-left ltr w-full" placeholder="https://...">
                                    <div class="currency-toggle shrink-0 w-24">
                                    <button type="button" class="currency-btn active" data-val="toman">${t('toman')}</button>
                                    <button type="button" class="currency-btn" data-val="rial">${t('rial')}</button>
                                    </div>
                                    <input type="hidden" id="mat-scraper-currency" value="toman">
                            </div>
                            <input type="text" id="mat-scraper-anchor" class="input-field text-xs w-full hidden" placeholder="${t('anchor_placeholder')}">
                            <div class="flex gap-2 mt-1">
                                <div class="w-1/2"><select id="mat-scraper-unit" class="input-field text-[10px] text-slate-600 bg-white w-full h-8"></select></div>
                                <div class="w-1/2"><input type="number" step="any" id="mat-scraper-factor" class="input-field text-xs w-full h-8 text-center font-bold dir-ltr" value="1"><div id="scraper-factor-hint" class="text-[10px] text-slate-400 mt-1 text-center"></div></div>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-4 pt-2 border-t sticky bottom-0 bg-white pb-2">
                        <button type="button" id="mat-cancel-btn" class="btn btn-secondary flex-1 text-xs h-10 hidden">${t('cancel')}</button>
                        <button type="submit" id="mat-submit-btn" class="btn btn-primary flex-[2] text-xs h-10 shadow-md">${t('save_material')}</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `;
}