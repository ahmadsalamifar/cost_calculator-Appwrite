// سیستم نمایش نوتیفیکیشن (Toast)
// جایگزینی زیبا برای alert() با استفاده از Tailwind CSS

let toastContainer = null;

function createContainer() {
    if (document.getElementById('toast-container')) return;
    
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
}

/**
 * نمایش پیام
 * @param {string} message - متن پیام (می‌تواند HTML باشد)
 * @param {string} type - نوع پیام (success, error, info)
 * @param {number} duration - مدت زمان نمایش به میلی‌ثانیه (پیش‌فرض ۴۰۰۰، برای ماندگاری دائم -1 بگذارید)
 */
export function showToast(message, type = 'info', duration = 4000) {
    if (!toastContainer) createContainer();

    const toast = document.createElement('div');
    
    // استایل‌های پایه
    let bgClass = 'bg-slate-800';
    let icon = 'ℹ️';

    if (type === 'success') {
        bgClass = 'bg-emerald-600';
        icon = '✅';
    } else if (type === 'error') {
        bgClass = 'bg-rose-600';
        icon = '⚠️';
    } else if (type === 'info') {
        bgClass = 'bg-slate-700'; // کمی روشن‌تر برای اطلاعات
    }

    toast.className = `
        ${bgClass} text-white px-4 py-3 rounded-lg shadow-lg 
        flex items-start gap-3 min-w-[300px] max-w-sm
        transform transition-all duration-300 translate-y-10 opacity-0
        pointer-events-auto font-bold text-sm border border-white/10
    `;

    toast.innerHTML = `
        <span class="text-lg mt-0.5">${icon}</span>
        <div class="flex-1 leading-tight flex flex-col gap-2">${message}</div>
    `;

    toastContainer.appendChild(toast);

    // انیمیشن ورود
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    // حذف خودکار (اگر duration منفی نباشد)
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
    
    // دکمه بستن دستی (برای حالت‌های طولانی)
    if (duration > 5000 || duration === -1) {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.className = 'text-white/50 hover:text-white text-lg leading-none px-1';
        closeBtn.onclick = () => removeToast(toast);
        toast.firstChild.nextSibling.appendChild(closeBtn); // افزودن به هدر
    }
}

function removeToast(toast) {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
}