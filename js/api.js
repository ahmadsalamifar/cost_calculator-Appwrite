import { db, functions, ID, Query, APPWRITE_CONFIG, state } from './config.js';

export async function fetchAllData() {
    console.log("📡 API: دریافت داده‌های اولیه...");
    try {
        // دریافت همزمان تمام اطلاعات مورد نیاز
        const [cRes, uRes, mRes, fRes] = await Promise.all([
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.UNITS, [Query.limit(100)]), 
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
        ]);
        
        state.categories = cRes.documents;
        state.units = uRes.documents;
        state.materials = mRes.documents;
        state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
        
        // دریافت فرمول‌های عمومی (اختیاری)
        try {
            const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.equal('is_public', true), Query.limit(50)]);
            state.publicFormulas = sRes.documents;
        } catch(e) { console.warn("Store fetch failed", e); }
        
        return true;
    } catch (error) {
        console.error("🔥 API Fetch Error:", error);
        throw error;
    }
}

export async function fetchSingleFormula(id) {
    try {
        const doc = await db.getDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, id);
        const idx = state.formulas.findIndex(f => f.$id === id);
        if (idx !== -1) state.formulas[idx] = doc;
        return doc;
    } catch (e) { console.error(e); return null; }
}

export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    // اجرای اسکرپر واقعی روی سرور
    runScraper: async () => {
        console.log("🚀 Executing Scraper Function...");
        try {
            const execution = await functions.createExecution(
                APPWRITE_CONFIG.FUNCTIONS.SCRAPER, 
                '' // بدنه درخواست (خالی)
            );
            
            if (execution.status === 'completed') {
                try {
                    return JSON.parse(execution.responseBody);
                } catch (e) {
                    return { success: false, error: "خطا در تحلیل پاسخ سرور" };
                }
            } else {
                return { success: false, error: "اجرای فانکشن با مشکل مواجه شد: " + execution.status };
            }
        } catch (error) {
            console.error("Function Error:", error);
            throw { message: "خطای ارتباط با سرور اسکرپر (بررسی کنید ID فانکشن در config.js صحیح باشد)" };
        }
    }
};