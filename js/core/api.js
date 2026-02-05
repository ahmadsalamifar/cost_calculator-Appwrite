// لایه ارتباط با سرور
// وظیفه: فقط ارسال و دریافت داده خام و مدیریت ارتباط با Appwrite Functions

import { db, functions, ID, APPWRITE_CONFIG } from './config.js';

export const api = {
    // عملیات CRUD پایه
    create: (col, data) => db.createDocument(APPWRITE_CONFIG.DB_ID, col, ID.unique(), data),
    
    update: (col, id, data) => db.updateDocument(APPWRITE_CONFIG.DB_ID, col, id, data),
    
    delete: (col, id) => db.deleteDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    get: (col, id) => db.getDocument(APPWRITE_CONFIG.DB_ID, col, id),
    
    list: (col, queries = []) => db.listDocuments(APPWRITE_CONFIG.DB_ID, col, queries),

    // اجرای تابع اسکرپر در سمت سرور
    runScraper: async (payload = {}) => {
        try {
            // تزریق کانفیگ‌های ضروری به پی‌لود تابع
            // این بخش بسیار حیاتی است تا تابع سمت سرور بداند با کدام دیتابیس کار کند
            const extendedPayload = {
                ...payload,
                dbId: APPWRITE_CONFIG.DB_ID,
                collectionId: APPWRITE_CONFIG.COLS.MATS,        // کالکشن کالاها
                historyCollectionId: APPWRITE_CONFIG.COLS.HISTORY // کالکشن تاریخچه
            };

            const execution = await functions.createExecution(
                APPWRITE_CONFIG.FUNCTIONS.SCRAPER, 
                JSON.stringify(extendedPayload)
            );
            
            if (execution.status === 'completed') {
                try {
                    return JSON.parse(execution.responseBody);
                } catch (parseError) {
                    return { success: false, error: "خطا در پردازش پاسخ سرور: " + execution.responseBody };
                }
            } else {
                return { success: false, error: "وضعیت اجرای تابع: " + execution.status };
            }
        } catch (error) {
            console.error("Function Network Error:", error);
            // نمایش خطای دقیق‌تر به کاربر
            const msg = error.message || "خطای ناشناخته در ارتباط با سرور";
            throw new Error("خطای اسکرپر: " + msg);
        }
    }
};