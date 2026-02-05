// لایه ارتباط با سرور
import { db, functions, ID, APPWRITE_CONFIG } from './config.js';

export const api = {
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    list: (col, queries = []) => db.listDocuments(APPWRITE_CONFIG.DB_ID, col, queries),

    runScraper: async (payload = {}) => {
        try {
            console.log("🚀 Sending Payload to Scraper:", payload);

            // ایجاد پی‌لود با تمام نام‌های ممکن برای جلوگیری از عدم تطابق در کد سرور
            const extendedPayload = {
                ...payload,
                // نام‌های استاندارد
                dbId: APPWRITE_CONFIG.DB_ID,
                databaseId: APPWRITE_CONFIG.DB_ID,
                
                // نام‌های کالکشن
                collectionId: APPWRITE_CONFIG.COLS.MATS,
                matsCollectionId: APPWRITE_CONFIG.COLS.MATS,
                
                historyId: APPWRITE_CONFIG.COLS.HISTORY,
                historyCollectionId: APPWRITE_CONFIG.COLS.HISTORY,
                
                // اضافه کردن timeout برای کلاینت (هرچند سرور محدودیت خودش را دارد)
                clientTimestamp: new Date().toISOString()
            };

            const execution = await functions.createExecution(
                APPWRITE_CONFIG.FUNCTIONS.SCRAPER, 
                JSON.stringify(extendedPayload),
                false // Async: false (یعنی منتظر پاسخ می‌مانیم)
            );
            
            console.log("📥 Execution Result:", execution);

            if (execution.status === 'completed') {
                try {
                    return JSON.parse(execution.responseBody);
                } catch (parseError) {
                    return { success: false, error: "فرمت پاسخ نامعتبر: " + execution.responseBody };
                }
            } else if (execution.status === 'failed') {
                // خطای رایج: Execution Timed Out
                return { success: false, error: "تایم‌اوت سرور: زمان اجرای اسکرپر تمام شد. لطفاً در پنل Appwrite زمان اجرای تابع را افزایش دهید." };
            } else {
                return { success: false, error: "وضعیت خطا: " + execution.status };
            }
        } catch (error) {
            console.error("Function Network Error:", error);
            throw new Error(error.message || "خطای ارتباط با سرور");
        }
    }
};