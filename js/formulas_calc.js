import { state } from './config.js';

// تابع کمکی برای دریافت ضریب تبدیل واحد
export function getUnitFactor(material, unitName) {
    if (!material || !unitName) return 1;
    try {
        const rels = JSON.parse(material.unit_relations || '{}');
        // اگر واحد مصرف همان واحد پایه باشد
        if (unitName === rels.base) return 1;
        
        // جستجو در لیست تبدیل‌ها
        const found = (rels.others || []).find(u => u.name === unitName);
        if (found && found.qtyUnit !== 0) {
            return found.qtyBase / found.qtyUnit;
        }
        return 1;
    } catch (e) { return 1; }
}

// محاسبه قیمت تمام شده یک فرمول
export function calculateCost(f) {
    if(!f) return {matCost:0, sub:0, profit:0, final:0};
    
    let matCost = 0;
    const comps = JSON.parse(f.components || '[]');
    
    comps.forEach(c => {
        if(c.type === 'mat') {
            const m = state.materials.find(x => x.$id === c.id);
            if(m) {
                let currentPrice = m.price;
                // اعمال مالیات اگر کالا مشمول باشد
                if(m.has_tax) currentPrice *= 1.10;

                const rels = JSON.parse(m.unit_relations || '{}');
                // واحد خرید کالا (یا واحد پایه)
                const priceUnit = m.purchase_unit || rels.price_unit || m.unit || 'عدد';
                
                const priceFactor = getUnitFactor(m, priceUnit);
                const selectedFactor = getUnitFactor(m, c.unit);
                
                if(priceFactor !== 0) {
                    // فرمول: (قیمت / ضریب خرید) * ضریب مصرف * تعداد
                    matCost += (currentPrice / priceFactor) * selectedFactor * c.qty;
                }
            }
        } else {
            // محاسبه بازگشتی برای زیر-فرمول‌ها
            const sub = state.formulas.find(x => x.$id === c.id);
            if(sub) matCost += calculateCost(sub).final * c.qty;
        }
    });

    const sub = matCost + (f.labor || 0) + (f.overhead || 0);
    const profit = (f.profit || 0) / 100 * sub;
    
    return {
        matCost, 
        sub, 
        profit, 
        final: sub + profit
    };
}
