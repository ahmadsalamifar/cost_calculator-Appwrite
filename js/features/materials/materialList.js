// مدیریت نمایش لیست کارت‌های مواد
// وظیفه: فقط تولید HTML و مدیریت رویدادهای جستجو

import { formatPrice, getDateBadge } from '../../core/utils.js';

export function setupSearchListeners(renderCallback) {
    const searchInp = document.getElementById('search-materials');
    if (searchInp) searchInp.oninput = (e) => renderCallback();

    const sortSel = document.getElementById('sort-materials');
    if (sortSel) sortSel.onchange = () => renderCallback();
}

export function renderGrid(materials, categories, onDelete, onEdit) {
    const container = document.getElementById('materials-container');
    if (!container) return;

    const filter = document.getElementById('search-materials')?.value || '';
    const filtered = materials.filter(m => m.name.includes(filter));

    if (!filtered.length) {
        container.innerHTML = '<p class="text-center text-slate-400 col-span-full mt-10">موردی یافت نشد</p>';
        return;
    }

    container.innerHTML = filtered.map(m => createCardHTML(m, categories)).join('');

    // اتصال رویدادها پس از رندر
    container.querySelectorAll('.btn-edit-mat').forEach(b => 
        b.onclick = () => onEdit(b.dataset.id));
        
    container.querySelectorAll('.btn-del-mat').forEach(b => 
        b.onclick = () => onDelete(b.dataset.id));
}

function createCardHTML(m, categories) {
    const cat = categories.find(c => c.$id === m.category_id)?.name || '-';
    const taxInfo = m.has_tax ? `<div class="text-[10px] text-rose-500 font-bold">با مالیات: ${formatPrice(m.price * 1.1)}</div>` : '';
    
    // --- منطق اضافه شده برای لینک اسکرپر ---
    const hasLink = m.scraper_url && m.scraper_url.length > 5;
    // از event.stopPropagation استفاده می‌کنیم تا کلیک روی لینک باعث باز شدن فرم ویرایش نشود (اگر کارت کلیک‌خور باشد)
    const linkIcon = hasLink ? `<a href="${m.scraper_url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1 text-lg no-underline" title="مشاهده لینک منبع" onclick="event.stopPropagation()">🔗</a>` : '';
    // ---------------------------------------

    return `
    <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md transition-all group relative">
        <div class="flex justify-between mb-1 items-start">
            <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500 border border-slate-100 truncate max-w-[100px]">${cat}</span>
            <div class="flex gap-1 pl-1">
                <button class="text-amber-500 hover:bg-amber-50 rounded px-1 btn-edit-mat" data-id="${m.$id}">✎</button>
                <button class="text-rose-500 hover:bg-rose-50 rounded px-1 btn-del-mat" data-id="${m.$id}">×</button>
            </div>
        </div>
        
        <div class="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1">
            ${linkIcon}
            <span class="truncate">${m.name}</span>
        </div>
        
        <div class="flex justify-between items-end border-t border-dashed border-slate-100 pt-2 mt-auto">
             ${getDateBadge(m.$updatedAt)}
             <div class="text-right">
                 <div class="font-bold text-teal-700 text-lg flex items-center justify-end gap-1">
                    <span>${formatPrice(m.price)}</span>
                    <span class="text-[10px] text-slate-400 font-normal">تومان</span>
                 </div>
                 ${taxInfo}
            </div>
        </div>
    </div>`;
}