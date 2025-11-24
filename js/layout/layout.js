// چون این فایل‌ها کنار همین فایل هستند، نیازی به ذکر نام پوشه نیست
import { getHeaderHTML, getTabsHTML } from './header.js';
import { getMaterialsTabHTML } from './materials.js';
import { getFormulasTabHTML } from './formulas.js';
import { getOtherTabsHTML } from './others.js';
import { getModalsHTML, getLoadingHTML } from './modals.js';

// فایل utils در پوشه core است، باید یک مرحله به عقب برگردید
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
                ${getOtherTabsHTML()}
            </main>
        </div>

        ${getModalsHTML()}
    `;

    document.body.innerHTML = appHTML;

    // اتصال رویدادهای اولیه که مربوط به خود لی‌اوت هستند (مثل دکمه‌های مدال)
    setupLayoutEvents();
}

function setupLayoutEvents() {
    const btnOpenNewFormula = document.getElementById('btn-open-new-formula');
    if (btnOpenNewFormula) {
        btnOpenNewFormula.onclick = () => openModal('new-formula-modal');
    }
}