import { db, ID, Query, APPWRITE_CONFIG, state } from './config.js';

export async function fetchAllData() {
    console.log("📡 Fetching ALL data from Appwrite...");
    try {
        const [cRes, mRes, fRes] = await Promise.all([
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.CATS, [Query.limit(100)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.MATS, [Query.limit(5000)]),
            db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.limit(500)])
        ]);
        
        console.log(`✅ Loaded: ${cRes.documents.length} Categories, ${mRes.documents.length} Materials, ${fRes.documents.length} Formulas`);

        state.categories = cRes.documents;
        state.materials = mRes.documents;
        state.formulas = fRes.documents.sort((a, b) => new Date(b.$updatedAt) - new Date(a.$updatedAt));
        
        try {
            const sRes = await db.listDocuments(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, [Query.equal('is_public', true), Query.limit(50)]);
            state.publicFormulas = sRes.documents;
        } catch(e) {}
        
        return true;
    } catch (error) {
        console.error("🔥 API Fetch Error:", error);
        throw error;
    }
}

export async function fetchSingleFormula(id) {
    try {
        console.log("📡 Fetching Single Formula:", id);
        const doc = await db.getDocument(APPWRITE_CONFIG.DB_ID, APPWRITE_CONFIG.COLS.FORMS, id);
        const idx = state.formulas.findIndex(f => f.$id === id);
        if (idx !== -1) state.formulas[idx] = doc;
        console.log("✅ Single Formula Updated:", doc);
        return doc;
    } catch (e) { console.error(e); return null; }
}

export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id)
};