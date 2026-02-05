🏭 CostWise

Smart Production Management, Cost Calculation & Online Price Inquiry System

CostWise is a powerful, modern web application tailored for manufacturing businesses. It streamlines the process of managing raw materials, defining nested formulas (BOM), and calculating real-time production costs using automated price updates.

Built with performance and simplicity in mind, using Vanilla JavaScript, Tailwind CSS, and Appwrite.

✨ Key Features

🌍 Multi-Language Support: Fully localized for English (LTR) and Persian (RTL).

📦 Smart Inventory: Manage raw materials with advanced unit conversions (e.g., Buy in Box, Consume in Grams).

🧮 Recursive Formula Engine: Create nested product formulas (Product A inside Product B). The engine automatically detects and handles circular dependencies.

🤖 Automated Price Scraper: Integrated with cloud functions (Appwrite Functions) to fetch real-time prices from websites like Torob, Emalls, AhanOnline, and WooCommerce stores.

📊 Analytics Dashboard: Visual charts for stock value distribution, category breakdown, and historical price fluctuation analysis.

🖨️ Professional Invoicing: Generate clean, printable production sheets and invoices directly from the browser.

🔔 Notification System (Toasts): Non-blocking, beautiful UI notifications for status updates.

🛠️ Tech Stack

Component

Technology

Description

Frontend

Vanilla JavaScript (ES Modules)

Bundler-free, fast, and lightweight

Styling

Tailwind CSS

CDN version for rapid development (Utility-first)

Backend

Appwrite

Database, Auth, and Cloud Functions (Backend-as-a-Service)

Scraper

Node.js (Appwrite Functions)

Runs in an isolated server environment to bypass CORS and handle heavy processing

Charting

Chart.js

Interactive and beautiful charts

Icons

Native Emoji & CSS

No dependencies on heavy icon libraries

🚀 Getting Started

1. Clone the Repository

First, clone the repository:

git clone [https://github.com/ahmadsalamifar/costwise.git](https://github.com/ahmadsalamifar/costwise.git)
cd costwise


2. Appwrite Configuration

To run this project, you need an Appwrite instance (Cloud or Self-hosted).

Create a Project and the following Database Collections:

categories (Fields: name)

units (Fields: name)

materials (Fields: name, price, unit_relations, scraper_url, ...)

formulas (Fields: name, components, labor, overhead, profit, is_public)

price_history (Fields: material_id, price, date)

Note: Set Collection Permissions to Any (or configure based on your needs) to allow read/write access.

3. Frontend Configuration

Navigate to js/core/.
Rename config.example.js to config.js and enter your Appwrite credentials:

const APPWRITE_CONFIG = {
    ENDPOINT: '[https://cloud.appwrite.io/v1](https://cloud.appwrite.io/v1)',
    PROJECT_ID: 'YOUR_PROJECT_ID',
    DB_ID: 'YOUR_DATABASE_ID',
    COLS: {
        CATS: 'categories', // Categories Collection ID
        MATS: 'materials',  // Materials Collection ID
        FORMS: 'formulas',  // Formulas Collection ID
        UNITS: 'units',     // Units Collection ID
        HISTORY: 'price_history' // History Collection ID
    },
    FUNCTIONS: {
        SCRAPER: 'YOUR_FUNCTION_ID' // Scraper Function ID (Optional)
    }
};


4. Running the Project

Since this project uses ES Modules, you must run it on a local server (opening the HTML file directly won't work).

# Using Python
python3 -m http.server 8000

# Or using "Live Server" extension in VS Code


Then open http://localhost:8000 in your browser.

🤖 Scraper Setup Guide (Server-side)

Note: The scraper code is located in the my-scraper folder. This code is NOT part of the client-side application and must be deployed separately to Appwrite Functions.

Zip the contents of the my-scraper folder or push to a separate git repository.

In the Appwrite Console, under Functions, create a new function with Node.js runtime.

Upload or connect the code.

In the function Settings, set the following Environment Variables:

APPWRITE_API_KEY: An API Key with Database Read/Write access.

APPWRITE_FUNCTION_PROJECT_ID: Your Project ID.

DB_ID: Your Database ID.

After deployment, copy the Function ID and paste it into the application config file (js/core/config.js).

Supported Websites:

✅ Torob

✅ Emalls

✅ AhanOnline

✅ MarkazAhan

✅ Most WooCommerce websites (General)

📂 File Structure

CostWise/
├── css/                 # Global Styles (UI)
├── js/                  # Client-side Code (Frontend)
│   ├── core/            # Config, API Wrapper, Utils, I18n
│   ├── features/        # Business Logic (Materials, Formulas, Reports)
│   ├── layout/          # HTML Templates & View Components
│   └── main.js          # Entry Point
├── my-scraper/          # ⚠️ Server-side Code (Appwrite Function) - Must be deployed separately
└── index.html           # Main HTML File


👨‍💻 Author

Ahmad Salamifar

GitHub: github.com/ahmadsalamifar

🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

📝 License

This project is open-source and available under the MIT License.