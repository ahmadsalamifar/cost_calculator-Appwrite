import { getHeaderHTML, getTabsHTML } from './header.js';
import { getMaterialsTabHTML } from './materials.js';
import { getFormulasTabHTML } from './formulas.js';
import { getReportsTabHTML } from './reports.js'; 
import { getOtherTabsHTML } from './others.js';
import { getModalsHTML, getLoadingHTML, getLanguageModalHTML } from './modals.js'; // Import language modal
import { openModal } from '../core/utils.js';

export function injectAppLayout() {
    const appHTML = `
        ${getLanguageModalHTML()} <!-- Language Modal first -->
        ${getLoadingHTML()}

        <div id="app-content" class="hidden h-screen flex flex-col overflow-hidden bg-slate-50">
            ${getHeaderHTML()}
            ${getTabsHTML()}

            <main class="flex-1 overflow-hidden p-2 md:p-4 relative">
                ${getFormulasTabHTML()}
                ${getMaterialsTabHTML()}
                ${getReportsTabHTML()}
                ${getOtherTabsHTML()}
            </main>
        </div>

        ${getModalsHTML()}
    `;

    document.body.innerHTML = appHTML;
    setupLayoutEvents();
}

function setupLayoutEvents() {
    const btnOpenNewFormula = document.getElementById('btn-open-new-formula');
    if (btnOpenNewFormula) {
        btnOpenNewFormula.onclick = () => openModal('new-formula-modal');
    }
}