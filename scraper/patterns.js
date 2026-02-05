module.exports = [
    {
        domain: 'torob',
        driver: 'torob', // اشاره به درایور اختصاصی ترب
        // رجکس‌های فال‌بک (مشابه Python)
        regex: '"lowPrice"\\s*:\\s*["\']?(\\d+)["\']?|"price"\\s*:\\s*["\']?(\\d+)["\']?|lowPrice\\s*:\\s*(\\d+)',
        selectors: [],
        isRial: false
    },
    {
        domain: 'emalls',
        driver: 'torob', // ایمالز هم ساختاری مشابه ترب دارد
        selectors: ['.price', '.shop-price'],
        isRial: false
    },
    {
        domain: 'ahanonline', 
        driver: 'ahanonline', // اشاره به درایور اختصاصی آهن آنلاین
        regex: 'هر\\s*کیلوگرم\\s*([0-9,]+)\\s*تومان',
        selectors: ['.text-priceCallButton', 'td:nth-child(4)', '.product-price'],
        isRial: false
    },
    {
        domain: 'markazahan',
        driver: 'generic',
        selectors: ['.price-value', 'td[data-title="قیمت"]'],
        isRial: true
    },
    {
        // الگوی عمومی (مشابه BaseScraper در پایتون)
        domain: '*', 
        driver: 'generic',
        // اولویت ۱: جستجوی دقیق متنی
        regex: '([0-9,٫]+)\\s*تومان', 
        
        selectors: [
            // سلکتورهای دقیق ووکامرس
            '.summary.entry-summary .price',       
            '.product-info .price',                
            '.single_variation_wrap .price',       
            '.price > .amount',
            '.woocommerce-Price-amount',
            
            // سلکتورهای عمومی‌تر
            '[itemprop="price"]',
            '.product-price',
            '.price',
            'span:contains("تومان")'
        ],
        isRial: false
    }
];