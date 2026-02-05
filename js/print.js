import { state } from './core/config.js';
import { calculateCost } from './features/formulas/formulas_calc.js'; 
import { formatPrice, formatDate, toggleElement } from './core/utils.js';

function openModal(id) { toggleElement(id, true); }
function closeModal(id) { toggleElement(id, false); }

export function setupPrint() {
    const btnPrint = document.getElementById('btn-print');
    if(btnPrint) btnPrint.onclick = printInvoice;

    const btnClose = document.getElementById('btn-close-print');
    if(btnClose) btnClose.onclick = () => closeModal('print-modal');
    
    const buyerInput = document.getElementById('print-buyer-input');
    if(buyerInput) {
        buyerInput.oninput = (e) => {
            const el = document.getElementById('print-buyer-name');
            if(el) el.innerText = e.target.value || '---';
        };
    }

    const sellerInput = document.getElementById('print-seller-input');
    if(sellerInput) {
        sellerInput.oninput = (e) => {
            const el = document.getElementById('print-seller-name');
            if(el) el.innerText = e.target.value || 'CostWise Industries';
        };
    }
}

export function printInvoice() {
    if(!state.activeFormulaId) return;
    const f = state.formulas.find(x => x.$id === state.activeFormulaId);
    if(!f) return;

    const calc = calculateCost(f);
    let comps = [];
    try { comps = JSON.parse(f.components || '[]'); } catch(e){}
    
    const titleEl = document.getElementById('print-title');
    if(titleEl) titleEl.innerText = f.name;

    const idEl = document.getElementById('print-id');
    if(idEl) idEl.innerText = f.$id.substring(0,8).toUpperCase();

    const dateEl = document.getElementById('print-date');
    if(dateEl) dateEl.innerText = formatDate(new Date());
    
    const sellerInp = document.getElementById('print-seller-input');
    const buyerInp = document.getElementById('print-buyer-input');
    
    const sellerNameEl = document.getElementById('print-seller-name');
    const buyerNameEl = document.getElementById('print-buyer-name');

    if(sellerNameEl) sellerNameEl.innerText = (sellerInp && sellerInp.value) ? sellerInp.value : 'CostWise Industries';
    if(buyerNameEl) buyerNameEl.innerText = (buyerInp && buyerInp.value) ? buyerInp.value : 'Valued Customer';
    
    const rowsEl = document.getElementById('print-rows');
    if(rowsEl) {
        rowsEl.innerHTML = comps.map((c, idx) => {
            let name='-', unit='-';
            
            if(c.type==='mat') { 
                const m = state.materials.find(x=>x.$id===c.id); 
                if(m) {
                    name = m.display_name || m.name; 
                    unit = c.unit || m.consumption_unit || 'عدد'; 
                }
            }
            else { 
                const s = state.formulas.find(x=>x.$id===c.id); 
                name = s ? s.name : 'Sub-Product'; 
                unit = 'Count'; 
            }
            
            return `
            <tr>
                <td class="py-2 text-right w-10 text-slate-400">${idx+1}</td>
                <td class="py-2 text-right font-bold">${name}</td>
                <td class="text-center font-mono">${c.qty}</td>
                <td class="text-center text-xs text-slate-500">${unit}</td>
            </tr>`;
        }).join('');
    }
    
    const finalEl = document.getElementById('print-final');
    if(finalEl) finalEl.innerText = formatPrice(calc.final.toFixed(0));
    
    openModal('print-modal');
}