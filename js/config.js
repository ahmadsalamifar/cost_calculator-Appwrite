const APPWRITE_CONFIG = {
    ENDPOINT: 'https://cloud.appwrite.io/v1',
    PROJECT_ID: '691c9337000c1532f26a', 
    DB_ID: '691c956400150133e319',
    COLS: {
        CATS: 'categories',
        MATS: 'materials',
        FORMS: 'formulas'
    }
};

if (typeof Appwrite === 'undefined') console.error("Appwrite SDK Error");

const { Client, Account, Databases, ID, Query } = Appwrite;
const client = new Client().setEndpoint(APPWRITE_CONFIG.ENDPOINT).setProject(APPWRITE_CONFIG.PROJECT_ID);
const account = new Account(client);
const db = new Databases(client);

// این آبجکت نباید هرگز Re-assign شود
const state = { 
    categories: [], 
    materials: [], 
    formulas: [], 
    activeFormulaId: null, 
    publicFormulas: [] 
};

export { APPWRITE_CONFIG, client, account, db, ID, Query, state };