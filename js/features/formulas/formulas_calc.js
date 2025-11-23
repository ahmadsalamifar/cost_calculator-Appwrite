// موتور محاسباتی فرمول‌ها
// وظیفه: محاسبات ریاضی خالص بدون هیچ وابستگی به DOM یا HTML.

import { state } from '../../core/config.js';

/**
 * دریافت ضریب تبدیل واحد برای یک متریال خاص
 * @param {object} material - آبجکت کالا
 * @param {string} unitName - نام واحد مورد نظر (مثلاً گرم)
 * @returns {number} ضریب تبدیل
 */
export function getUnitFactor(material, unitName) {
    if (!material || !unitName) return 1;
    
    try {
        let rels = material.unit_relations;
        // اگر رشته است پارس کن، اگر آبجکت است خودشو استفاده کن
        if (typeof rels === 'string') rels = JSON.parse(rels);
        if (!rels) rels = {};

        // اگر واحد مصرف همان واحد پایه باشد
        if (unitName === rels.base) return 1;
        
        // جستجو در لیست تبدیل‌ها
        const found = (rels.others || []).find(u => u.name === unitName);
        if (found && found.qtyUnit !== 0) {
            // فرمول: مقدار پایه / مقدار واحد فرعی
            return found.qtyBase / found.qtyUnit;
        }
        
        // اگر واحد خرید انتخاب شده بود و در لیست نبود
        if (unitName === material.purchase_unit) {
             return 1;
        }

        return 1;
    } catch (e) { 
        console.warn(`Error calculating unit factor for ${material.name}:`, e);
        return 1; 
    }
}

export function calculateCost(f) {
    if(!f) return { matCost:0, sub:0, profit:0, final:0 };
    
    let matCost = 0;
    let comps = parseComponents(f.components);

    comps.forEach(c => {
        if (c.type === 'mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if (m) {
                // 1. قیمت پایه (با مالیات یا بدون مالیات)
                let currentPrice = m.price || 0;
                if (m.has_tax) currentPrice *= 1.10;

                // 2. یافتن ضریب واحد خرید (چون قیمت کالا بر اساس واحد خرید است)
                let rels = {};
                try { rels = typeof m.unit_relations === 'string' ? JSON.parse(m.unit_relations) : m.unit_relations; } catch(e){}
                
                const priceUnit = m.purchase_unit || rels?.price_unit || m.unit || 'عدد';
                
                const priceFactor = getUnitFactor(m, priceUnit); // ضریب واحدی که پول دادیم
                const consumptionFactor = getUnitFactor(m, c.unit); // ضریب واحدی که مصرف کردیم
                
                if (priceFactor !== 0) {
                    // قیمت واحد پایه = قیمت خرید / ضریب خرید
                    const baseUnitPrice = currentPrice / priceFactor;
                    // قیمت مصرفی = قیمت پایه * ضریب واحد مصرف * تعداد
                    matCost += baseUnitPrice * consumptionFactor * c.qty;
                } else {
                     matCost += currentPrice * c.qty;
                }
            }
        } else if (c.type === 'form') {
            const sub = state.formulas.find(x => x.$id === c.id);
            // جلوگیری از لوپ بی‌نهایت
            if (sub && sub.$id !== f.$id) {
                 matCost += calculateCost(sub).final * c.qty;
            }
        }
    });

    const labor = f.labor || 0;
    const overhead = f.overhead || 0;
    const subTotal = matCost + labor + overhead;
    const profit = (f.profit || 0) / 100 * subTotal;
    
    return {
        matCost, 
        sub: subTotal, 
        profit, 
        final: subTotal + profit
    };
}

function parseComponents(data) {
    try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}