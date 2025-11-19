import { state } from './config.js';
import { calculateCost } from './formulas.js'; // توجه: calculateCost باید اکسپورت شده باشد
import { formatPrice, formatDate, openModal, closeModal } from './utils.js';

export function setupPrint() {
    // دکمه کلوز همیشه کار کند
    const btn = document.getElementById('btn-close-print');
    if(btn) btn.onclick = () => closeModal('print-modal');
}

// این تابع باید export شود تا در formulas.js قابل استفاده باشد
export function printFormula() {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    const calc = calculateCost(f);
    const comps = JSON.parse(f.components || '[]');
    
    document.getElementById('print-title').innerText = f.name;
    document.getElementById('print-id').innerText = f.$id.substring(0,6).toUpperCase();
    document.getElementById('print-date').innerText = formatDate(new Date());
    
    document.getElementById('print-rows').innerHTML = comps.map(c => {
        let n='-', u='-';
        if(c.type==='mat') { const m = state.materials.find(x=>x.$id===c.id); n=m?m.name:'-'; u=m?m.unit:'-'; }
        else { const s = state.formulas.find(x=>x.$id===c.id); n=s?s.name:'-'; u='عدد'; }
        return `<tr><td class="py-2 text-right">${n}</td><td class="text-center">${c.qty}</td><td class="text-center text-xs text-slate-400">${u}</td></tr>`;
    }).join('');
    
    const sub = calc.final; 
    const vat = Math.round(sub * 0.1);
    document.getElementById('print-profit').innerText = formatPrice(calc.profit);
    document.getElementById('print-subtotal').innerText = formatPrice(sub);
    document.getElementById('print-vat').innerText = formatPrice(vat);
    document.getElementById('print-final').innerText = formatPrice(sub+vat);
    
    openModal('print-modal');
}