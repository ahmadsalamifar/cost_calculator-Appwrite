const { Client, Databases, Query } = require('node-appwrite');
const axios = require('axios');
const cheerio = require('cheerio');
const patterns = require('./patterns'); 

// تنظیمات هدر برای شبیه‌سازی مرورگر واقعی
const REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

module.exports = async function ({ req, res, log, error }) {
    // متغیرهای محیطی
    const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const API_KEY = process.env.APPWRITE_API_KEY;
    const DB_ID = process.env.DB_ID || req.body?.dbId; // پشتیبانی از پی‌لود کلاینت
    
    // دریافت نام کالکشن‌ها از ورودی یا پیش‌فرض
    const payload = req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
    const MATS_COL = payload.collectionId || 'materials';
    const HISTORY_COL = payload.historyCollectionId || 'price_history';

    if (!PROJECT_ID || !API_KEY || !DB_ID) {
        return res.json({ success: false, error: "Server Configuration Error: Missing Env Vars" }, 500);
    }

    const client = new Client()
        .setEndpoint('https://cloud.appwrite.io/v1')
        .setProject(PROJECT_ID)
        .setKey(API_KEY);

    const db = new Databases(client);

    // --- MODE 1: SINGLE URL CHECK (تست لینک تکی) ---
    if (payload.type === 'single_check' && payload.url) {
        try {
            const mode = payload.currencyMode || 'toman';
            const factor = parseFloat(payload.factor) || 1;
            const result = await checkPrice(payload.url, factor, mode);
            return res.json({ success: result.success, data: result, error: result.error });
        } catch(e) { 
            return res.json({ success: false, error: e.message }); 
        }
    }

    // --- MODE 2: BULK UPDATE (منسوخ شده در کلاینت جدید، اما برای سازگاری نگه داشته شده) ---
    return res.json({ success: false, error: "Bulk mode is deprecated. Use client-side iterative update." });
};

// ============================================================================
// CORE LOGIC Helpers (Ported from Python Models)
// ============================================================================

/**
 * تابع اصلی مدیریت درخواست و انتخاب درایور مناسب
 */
async function checkPrice(url, factorVal, currencyMode) {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // 1. یافتن الگوی مناسب
        const sitePattern = patterns.find(p => domain.includes(p.domain)) || patterns.find(p => p.domain === '*');
        
        // 2. دانلود صفحه
        const { data: html } = await axios.get(url, { 
            timeout: 15000, 
            headers: REQUEST_HEADERS,
            validateStatus: () => true // جلوگیری از پرتاب خطا در 404
        });
        
        const $ = cheerio.load(html);
        let bestPrice = 0;

        // 3. انتخاب درایور بر اساس الگو
        const driver = sitePattern.driver || 'generic';
        
        console.log(`Using driver: ${driver} for ${domain}`);

        if (driver === 'torob') {
            bestPrice = scrapeTorob(html, $, sitePattern, currencyMode);
        } else if (driver === 'ahanonline') {
            bestPrice = scrapeAhanOnline(html, $, sitePattern);
        } else {
            bestPrice = scrapeGeneric(html, $, sitePattern, currencyMode);
        }

        // 4. اعتبارسنجی نهایی
        if (bestPrice <= 0) return { success: false, error: "قیمت یافت نشد" };

        const factor = parseFloat(factorVal) || 1;
        const finalPrice = Math.round(bestPrice * factor);

        return { 
            success: true, 
            final_price: finalPrice, 
            found_price: bestPrice 
        };

    } catch(e) {
        return { success: false, error: "Scrape Error: " + e.message };
    }
}

/**
 * درایور اختصاصی ترب (پورت شده از torob_scraper.py)
 * اصلاح شده: پشتیبانی از ایمالز با فال‌بک به سلکتورها
 */
function scrapeTorob(html, $, pattern, currencyMode) {
    let minPrice = 0;

    // استراتژی ۱: استخراج از JSON-LD (اولویت اصلی)
    $('script[type="application/ld+json"]').each((i, el) => {
        try {
            const jsonContent = $(el).html().replace(/\n/g, ' ').replace(/\r/g, '').trim();
            const data = JSON.parse(jsonContent);
            const items = Array.isArray(data) ? data : [data];
            
            for (const item of items) {
                const price = parseTorobObj(item);
                if (price > 0) {
                    // FIX: داده‌های JSON معمولاً ریال هستند. تبدیل به تومان.
                    const finalPrice = price / 10;
                    if (minPrice === 0 || finalPrice < minPrice) minPrice = finalPrice;
                }
            }
        } catch(e) { /* ignore parse errors */ }
    });

    if (minPrice > 0) return minPrice;

    // استراتژی ۲: جستجوی مستقیم Regex در متن HTML
    const regexList = [
        /"lowPrice"\s*:\s*["']?(\d+)["']?/i,
        /"price"\s*:\s*["']?(\d+)["']?/i,
        /lowPrice\s*:\s*(\d+)/i
    ];

    for (const regex of regexList) {
        const match = html.match(regex);
        if (match && match[1]) {
            const val = parsePriceText(match[1]);
            // FIX: داده‌های خام معمولاً ریال هستند.
            if (val > 0) return val / 10;
        }
    }

    // --- استراتژی ۳ (جدید): فال‌بک به سلکتورهای CSS (برای ایمالز و سایت‌های مشابه) ---
    // اگر روش‌های خاص ترب جواب نداد، از سلکتورهای تعریف شده در pattern استفاده کن
    if (pattern.selectors && pattern.selectors.length > 0) {
        let foundSelectorPrices = [];
        pattern.selectors.forEach(sel => {
            $(sel).each((i, el) => {
                const text = $(el).text().trim();
                // اینجا تقسیم بر ۱۰ نمی‌کنیم چون parsePriceText خودش واحد تومان را از متن می‌خواند
                // مگر اینکه pattern.isRial یا currencyMode روی rial باشد
                const val = parsePriceText(text, pattern.isRial || currencyMode === 'rial');
                if (val > 500) foundSelectorPrices.push(val);
            });
        });
        
        if (foundSelectorPrices.length > 0) {
            return Math.min(...foundSelectorPrices);
        }
    }

    return 0;
}

function parseTorobObj(data) {
    if (!data || typeof data !== 'object') return 0;

    const offers = data.offers;
    if (offers) {
        if (!Array.isArray(offers)) {
            const val = offers.lowPrice || offers.price || offers.highPrice;
            if (val) return parsePriceText(val);
        } 
        else if (Array.isArray(offers)) {
            let min = 0;
            for (const offer of offers) {
                const val = offer.price || offer.lowPrice;
                if (val) {
                    const p = parsePriceText(val);
                    if (p > 0 && (min === 0 || p < min)) min = p;
                }
            }
            if (min > 0) return min;
        }
    }
    return 0;
}

/**
 * درایور اختصاصی آهن آنلاین (پورت شده از ahanonline_scraper.py)
 */
function scrapeAhanOnline(html, $, pattern) {
    $('script, style, head, meta, noscript').remove();
    const cleanBodyText = $('body').text().replace(/\s+/g, ' ').trim();

    const targetRegex = /هر\s*کیلوگرم\s*([0-9,]+)\s*تومان/g;
    let match;
    const foundPrices = [];

    while ((match = targetRegex.exec(cleanBodyText)) !== null) {
        const p = parsePriceText(match[1]);
        if (p > 1000) foundPrices.push(p);
    }

    if (foundPrices.length === 0) {
        $('.text-priceCallButton').each((i, el) => {
            const text = $(el).text();
            const pMatch = text.match(/([\d,]{4,})/);
            if (pMatch) {
                const p = parsePriceText(pMatch[1]);
                if (p > 1000) foundPrices.push(p);
            }
        });
    }

    if (foundPrices.length > 0) {
        return Math.min(...foundPrices);
    }

    return 0;
}

/**
 * درایور عمومی (پورت شده از base_scraper.py)
 */
function scrapeGeneric(html, $, pattern, currencyMode) {
    let foundPrices = [];

    // استراتژی ۱: Regex روی متن
    if (pattern.regex) {
        const bodyText = $('body').text().replace(/\s+/g, ' ');
        const regex = new RegExp(pattern.regex, 'gi'); 
        let match;
        while ((match = regex.exec(bodyText)) !== null) {
            const raw = match[1] || match[0];
            const p = parsePriceText(raw, pattern.isRial || currencyMode === 'rial');
            if (p > 500) foundPrices.push(p);
        }
    }

    // استراتژی ۲: CSS Selectors
    if (foundPrices.length === 0 && pattern.selectors) {
        pattern.selectors.forEach(sel => {
            $(sel).each((i, el) => {
                const text = $(el).text().trim();
                const val = parsePriceText(text, pattern.isRial || currencyMode === 'rial');
                if (val > 500) foundPrices.push(val);
            });
        });
    }

    // استراتژی ۳: JSON-LD بازگشتی (Fallback نهایی)
    if (foundPrices.length === 0) {
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const json = JSON.parse($(el).html());
                extractRecursive(json, foundPrices, pattern.isRial || currencyMode === 'rial');
            } catch(e) {}
        });
        
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
            try { extractRecursive(JSON.parse(nextData), foundPrices, pattern.isRial || currencyMode === 'rial'); } catch(e){}
        }
    }

    if (foundPrices.length === 0) return 0;
    
    return Math.min(...foundPrices);
}

// ============================================================================
// UTILITIES (Ported from base_scraper.py methods)
// ============================================================================

function parsePriceText(text, isRial = false) {
    if (!text) return 0;
    let str = text.toString().trim().slice(0, 50);

    str = str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
             .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    
    str = str.replace(/[^0-9.,-]/g, '');

    if (!str) return 0;

    if (str.includes(',')) {
        str = str.replace(/,/g, '');
    }

    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1) {
        str = str.replace(/\./g, ''); 
    }

    let val = parseFloat(str);
    if (isNaN(val)) return 0;

    if (isRial) {
        val = val / 10.0;
    }

    return val;
}

function extractRecursive(obj, foundList, isRial, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 15) return;
    
    if (Array.isArray(obj)) { 
        obj.forEach(item => extractRecursive(item, foundList, isRial, depth + 1));
        return;
    }

    const candidates = ['lowPrice', 'price', 'amount', 'value', 'highPrice', 'current_price'];
    
    for (const key of candidates) {
        if (obj[key] !== undefined && obj[key] !== null) {
            const val = parsePriceText(obj[key], isRial);
            if (val > 500) {
                foundList.push(val);
                return;
            }
        }
    }

    for (const key in obj) {
        if (['description', 'review', 'articleBody', 'image', 'url', 'content'].includes(key)) continue;
        
        if (typeof obj[key] === 'object') {
            extractRecursive(obj[key], foundList, isRial, depth + 1);
        }
    }
}