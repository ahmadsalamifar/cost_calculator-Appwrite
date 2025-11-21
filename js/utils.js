// تابع تبدیل رشته (شامل کاما، نقطه و اعداد فارسی) به عدد خالص
export function parseLocaleNumber(stringNumber) {
    if (!stringNumber && stringNumber !== 0) return 0;
    let str = stringNumber.toString();
    
    // ۱. تبدیل اعداد فارسی/عربی به انگلیسی
    str = str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
             .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    
    // ۲. حذف کاما (جداکننده هزارگان استاندارد)
    str = str.replace(/,/g, '');

    // ۳. مدیریت نقطه (اگر کاربر از نقطه به عنوان جداکننده هزارگان استفاده کرده باشد)
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
        str = str.replace(/\./g, '');
    }
    
    // ۴. حذف تمام کاراکترها به جز اعداد، نقطه و منفی
    const cleanStr = str.replace(/[^0-9.-]/g, '');
    
    return parseFloat(cleanStr) || 0;
}

// تابع فرمت‌دهی قیمت (سه رقم سه رقم)
export function formatPrice(price) {
    if (price === undefined || price === null || isNaN(price)) return '';
    return Number(price).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// تابع نمایش تاریخ شمسی
export function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fa-IR');
}

export function getDateBadge(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('fa-IR', {month: 'short', day: 'numeric'}) + 
           ' ' + d.toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'});
}

// مدیریت مودال‌ها
export function openModal(id) {
    const el = document.getElementById(id);
    if(el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    }
}

export function closeModal(id) {
    const el = document.getElementById(id);
    if(el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
}

// سوییچ تب‌ها (برای منوی اصلی)
export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('bg-emerald-50', 'text-emerald-600', 'border-r-4', 'border-emerald-500');
        el.classList.add('text-slate-600');
    });

    const target = document.getElementById(tabId);
    if(target) target.classList.remove('hidden');

    const btns = document.querySelectorAll('.sidebar-item');
    btns.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.remove('text-slate-600');
            btn.classList.add('bg-emerald-50', 'text-emerald-600', 'border-r-4', 'border-emerald-500');
        }
    });
    
    if(window.innerWidth < 768) window.scrollTo({top: 0, behavior: 'smooth'});
}

// *** تابع بازگردانده شده برای جلوگیری از خطای main.js ***
export function formatInput(e) {
    // این تابع فقط برای سازگاری با کدهای قدیمی main.js نگه داشته شده است.
    // اگر رویداد "تایپ کردن" (input) باشد، کاری نمی‌کنیم تا موس نپرد.
    // اگر رویداد "خروج" (blur) باشد، فرمت می‌کنیم.
    if (e && e.target && e.type === 'blur') {
        const val = parseLocaleNumber(e.target.value);
        if (val > 0) e.target.value = formatPrice(val);
    }
}