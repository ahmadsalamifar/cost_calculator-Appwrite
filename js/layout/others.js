export function getOtherTabsHTML() {
    return `
    <div id="tab-categories" class="tab-content hidden h-full overflow-y-auto p-2 md:p-4">
        <div class="max-w-4xl mx-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-700 text-center mb-4 border-b pb-2 text-sm">گروه‌بندی کالاها</h3>
                <form id="category-form" class="flex gap-2 mb-4"><input type="text" id="cat-name" class="input-field text-xs" placeholder="نام گروه..." required><button class="btn btn-primary px-3 text-lg" type="submit">+</button></form>
                <div id="category-list" class="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar"></div>
            </div>
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-700 text-center mb-4 border-b pb-2 text-sm">واحدهای اندازه‌گیری</h3>
                <form id="unit-form" class="flex gap-2 mb-4"><input type="text" id="unit-name" class="input-field text-xs" placeholder="نام واحد..." required><button class="btn btn-primary px-3 text-lg" type="submit">+</button></form>
                <div id="unit-list" class="space-y-1 max-h-80 overflow-y-auto pr-1 custom-scrollbar"></div>
            </div>
        </div>
    </div>
    
    <div id="tab-store" class="tab-content hidden h-full overflow-y-auto p-4"><div id="store-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div></div>
    `;
}