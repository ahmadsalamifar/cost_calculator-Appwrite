import { db, functions, ID, Query, APPWRITE_CONFIG, state } from './config.js';

export async function fetchAllData() {
    console.log("📡 API: دریافت داده‌های اولیه...");
    try {
        // اضافه شدن درخواست واحدها (uRes)
        const [cRes, uRes, mRes, fRes] = await Promise.all([
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.UNITS, [Query.limit(100)]), // <--- دریافت واحدها
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
        ]);
        
        state.categories = cRes.documents;
        state.units = uRes.documents; // <--- ذخیره در استیت
        state.materials = mRes.documents;
        state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
        
        try {
            const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.equal('is_public', true), Query.limit(50)]);
            state.publicFormulas = sRes.documents;
        } catch(e) { console.warn("Store fetch failed", e); }
        
        return true;
    } catch (error) {
        console.error("🔥 API Error:", error);
        throw error;
    }
}

export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    runScraper: async () => {
        console.log("Simulation: Scraper Function Triggered");
        return new Promise(r => setTimeout(r, 1000));
    }
};
