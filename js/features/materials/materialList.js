import { formatPrice, getDateBadge } from '../../core/utils.js';
import { state } from '../../core/config.js'; 
import { t } from '../../core/i18n.js';

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
    const sort = document.getElementById('sort-materials')?.value || 'update_desc';

    let list = materials.filter(m => m.name.includes(filter));

    list.sort((a, b) => {
        switch (sort) {
            case 'price_desc': return (b.price || 0) - (a.price || 0);
            case 'price_asc': return (a.price || 0) - (b.price || 0);
            case 'name_asc': return a.name.localeCompare(b.name, 'fa');
            case 'category': 
                const catA = categories.find(c => c.$id === a.category_id)?.name || '';
                const catB = categories.find(c => c.$id === b.category_id)?.name || '';
                return catA.localeCompare(catB, 'fa');
            case 'update_desc': 
            default: 
                return new Date(b.$updatedAt) - new Date(a.$updatedAt);
        }
    });

    if (!list.length) {
        container.innerHTML = `<p class="text-center text-slate-400 col-span-full mt-10">${t('search_placeholder')}</p>`;
        return;
    }

    container.innerHTML = list.map(m => createCardHTML(m, categories)).join('');

    container.querySelectorAll('.btn-edit-mat').forEach(b => 
        b.onclick = (e) => {
            e.stopPropagation(); 
            onEdit(b.dataset.id);
        }
    );
        
    container.querySelectorAll('.btn-del-mat').forEach(b => 
        b.onclick = (e) => {
            e.stopPropagation();
            onDelete(b.dataset.id);
        }
    );
}

function createCardHTML(m, categories) {
    const cat = categories.find(c => c.$id === m.category_id)?.name || '-';
    
    // محاسبه قیمت نهایی برای نمایش
    let displayPrice = m.price || 0;
    let taxLabel = '';

    if (m.has_tax) {
        displayPrice = displayPrice * 1.1; // اعمال ۱۰ درصد مالیات
        taxLabel = `<div class="text-[10px] text-rose-500 font-bold mt-0.5">+ ${t('tax_included')}</div>`;
    }
    
    const hasLink = m.scraper_url && m.scraper_url.length > 5;
    const linkIcon = hasLink ? `<a href="${m.scraper_url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1 text-lg no-underline relative z-20" title="${t('site_link')}" onclick="event.stopPropagation()">🔗</a>` : '';

    return `
    <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md transition-all group relative flex flex-col h-full">
        <div class="flex justify-between mb-1 items-start">
            <span class="text-[10px] bg-slate-50 px-2 rounded text-slate-500 border border-slate-100 truncate max-w-[100px]">${cat}</span>
            <div class="flex gap-1 pl-1">
                <button class="text-amber-500 hover:bg-amber-50 rounded px-1 btn-edit-mat" data-id="${m.$id}" title="Edit">✎</button>
                <button class="text-rose-500 hover:bg-rose-50 rounded px-1 btn-del-mat" data-id="${m.$id}" title="Delete">×</button>
            </div>
        </div>
        
        <div class="font-bold text-sm text-slate-800 mb-2 flex items-center gap-1 leading-6">
            ${linkIcon}
            <span class="line-clamp-2">${m.name}</span>
        </div>
        
        <div class="flex justify-between items-end border-t border-dashed border-slate-100 pt-2 mt-auto">
             ${getDateBadge(m.$updatedAt)}
             <div class="text-right">
                 <div class="font-bold text-teal-700 text-lg flex items-center justify-end gap-1">
                    <span>${formatPrice(displayPrice)}</span>
                    <span class="text-[10px] text-slate-400 font-normal">${t('toman')}</span>
                 </div>
                 ${taxLabel}
            </div>
        </div>
    </div>`;
}