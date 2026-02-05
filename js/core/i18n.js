// سیستم مدیریت زبان و ترجمه (Internationalization)

const translations = {
    fa: {
        direction: 'rtl',
        font: 'Vazirmatn',
        app_name: 'CostWise', // نام جدید
        online: 'آنلاین',
        formula_bank: 'بانک فرمول',
        
        // Tabs
        tab_formulas: 'محصولات',
        tab_materials: 'انبار و خرید',
        tab_reports: 'گزارشات',
        tab_settings: 'تنظیمات',
        
        // Materials Tab
        new_material: 'کالای جدید',
        get_prices: 'دریافت قیمت‌ها',
        search_placeholder: 'جستجو...',
        sort_newest: 'جدیدترین',
        sort_expensive: 'گران‌ترین',
        sort_cheap: 'ارزان‌ترین',
        sort_alphabet: 'الفبا',
        sort_category: 'دسته‌بندی',
        
        // Material Form
        manage_material: 'مدیریت کالا',
        category_label: 'دسته‌بندی...',
        name_placeholder: 'نام کالا...',
        display_name_placeholder: 'نام نمایشی (اختیاری)',
        units_header: 'واحدها',
        base_unit: 'پایه:',
        add_unit_relation: '+ تبدیل واحد',
        price_inquiry: 'قیمت روز (استعلامی)',
        tax_included: 'مشمول مالیات (۱۰٪)',
        site_link: 'لینک سایت',
        anchor_placeholder: 'Anchor',
        toman: 'تومان',
        rial: 'ریال',
        cancel: 'لغو',
        save_material: 'ذخیره کالا',
        
        // Modals
        loading: 'در حال بارگذاری...',
        select_lang: 'Select Language / انتخاب زبان',
        lang_fa: 'فارسی',
        lang_en: 'English'
    },
    en: {
        direction: 'ltr',
        font: 'sans-serif',
        app_name: 'CostWise', // نام جدید
        online: 'Online',
        formula_bank: 'Formula Bank',
        
        // Tabs
        tab_formulas: 'Products',
        tab_materials: 'Inventory & Buy',
        tab_reports: 'Reports',
        tab_settings: 'Settings',
        
        // Materials Tab
        new_material: 'New Item',
        get_prices: 'Update Prices',
        search_placeholder: 'Search...',
        sort_newest: 'Newest',
        sort_expensive: 'Most Expensive',
        sort_cheap: 'Cheapest',
        sort_alphabet: 'A-Z',
        sort_category: 'Category',
        
        // Material Form
        manage_material: 'Manage Item',
        category_label: 'Category...',
        name_placeholder: 'Item Name...',
        display_name_placeholder: 'Display Name (Opt)',
        units_header: 'Units',
        base_unit: 'Base:',
        add_unit_relation: '+ Add Conversion',
        price_inquiry: 'Current Price',
        tax_included: 'Tax Included (10%)',
        site_link: 'Website Link',
        anchor_placeholder: 'Anchor',
        toman: 'Toman',
        rial: 'Rial',
        cancel: 'Cancel',
        save_material: 'Save Item',

        // Modals
        loading: 'Loading...',
        select_lang: 'Select Language',
        lang_fa: 'Persian',
        lang_en: 'English'
    }
};

export function getLanguage() {
    return localStorage.getItem('app_lang');
}

export function setLanguage(lang) {
    if (translations[lang]) {
        localStorage.setItem('app_lang', lang);
        return true;
    }
    return false;
}

export function t(key) {
    const lang = getLanguage() || 'fa';
    return translations[lang][key] || key;
}

export function getDir() {
    const lang = getLanguage() || 'fa';
    return translations[lang].direction;
}

export function initLanguage() {
    const lang = getLanguage();
    if (lang) {
        document.documentElement.dir = translations[lang].direction;
        document.documentElement.lang = lang;
        if(lang === 'en') {
            document.body.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';
        }
    }
}