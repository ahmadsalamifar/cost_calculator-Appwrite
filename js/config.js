// تنظیمات اتصال به Appwrite
export const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '691c9337000c1532f26a',
    DB_ID: '691c956400150133e319',
    COLS: {
        CATS: 'categories',
        MATS: 'materials',
        FORMS: 'formulas',
        UNITS: 'units' // <--- کالکشن جدید
    },
    FUNCTIONS: {
        SCRAPER: '65a1234567890abcdef'
    }
};

if (typeof Appwrite === 'undefined') console.error("Appwrite SDK Error: Script not loaded");

const { Client, Account, Databases, ID, Query, Functions } = Appwrite;

const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.ENDPOINT)
    .setProject(APPWRITE_CONFIG.PROJECT_ID);

const account = new Account(client);
const db = new Databases(client);
const functions = new Functions(client);

const state = { 
    categories: [], 
    units: [], // <--- آرایه جدید برای واحدها
    materials: [], 
    formulas: [], 
    activeFormulaId: null, 
    publicFormulas: [] 
};

export { client, account, db, functions, ID, Query, state };
