export function formatPrice(n) {
    if (n === undefined || n === null) return '0';
    return Number(n).toLocaleString('en-US');
}

export function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('fa-IR') : '';
}

export function getDateBadge(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const diffTime = Math.abs(new Date() - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // زیر ۷ روز = سبز (جدید)، بیشتر = نارنجی (قدیمی)
    const colorClass = diffDays < 7 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        : 'bg-orange-100 text-orange-700 border-orange-200';
    
    return `<span class="text-[10px] px-1.5 py-0.5 rounded border ${colorClass}">${formatDate(dateString)}</span>`;
}

export function formatInput(el) {
    const r = el.value.replace(/[^0-9.]/g, '');
    el.value = r ? parseFloat(r).toLocaleString('en-US') : '';
}

export function switchTab(id) {
    ['formulas', 'materials', 'categories', 'store'].forEach(t => {
        const el = document.getElementById('tab-' + t);
        const btn = document.getElementById('btn-tab-' + t);
        if (el) el.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });
    const target = document.getElementById('tab-' + id);
    const targetBtn = document.getElementById('btn-tab-' + id);
    if (target) target.classList.remove('hidden');
    if (targetBtn) targetBtn.classList.add('active');
}

export function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        el.style.display = 'flex';
    }
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
    }
}