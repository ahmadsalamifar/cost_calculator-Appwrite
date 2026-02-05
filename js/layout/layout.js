import { getHeaderHTML, getTabsHTML } from './header.js';
import { getMaterialsTabHTML } from './materials.js';
import { getFormulasTabHTML } from './formulas.js';
import { getReportsTabHTML } from './reports.js'; 
import { getOtherTabsHTML } from './others.js';
import { getModalsHTML, getLoadingHTML } from './modals.js';
import { openModal } from '../core/utils.js';

export function injectAppLayout() {
    const appHTML = `
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

            <!-- فوتر اضافه شده با نام نویسنده -->
            <footer class="text-center py-2 text-[10px] text-slate-400 border-t bg-white shrink-0 z-20">
                <div class="flex items-center justify-center gap-1">
                    Developed with ❤️ by 
                    <a href="https://github.com/ahmadsalamifar" target="_blank" class="font-bold text-slate-500 hover:text-teal-600 transition-colors flex items-center gap-1">
                        Ahmad Salamifar 
                        <span class="text-lg leading-none">GitHub</span>
                    </a>
                </div>
            </footer>
        </div>

        ${getModalsHTML()}
    `;

    document.body.innerHTML = appHTML;
    setupLayoutEvents();
}

function setupLayoutEvents() {
    // دکمه فرمول جدید
    const btnOpenNewFormula = document.getElementById('btn-open-new-formula');
    if (btnOpenNewFormula) {
        btnOpenNewFormula.onclick = () => openModal('new-formula-modal');
    }
}