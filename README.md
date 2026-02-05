🏭 CostWise

Smart Cost Calculation & Bill of Materials (BOM) System

CostWise is a powerful, modern web application tailored for manufacturing businesses. It streamlines the process of managing raw materials, defining complex recursive formulas, and calculating real-time production costs with automated price updates.

Built with performance and simplicity in mind using Vanilla JavaScript, Tailwind CSS, and Appwrite.

✨ Key Features

🌍 Multi-Language Support: Fully localized for English and Persian (Farsi) with RTL support.

📦 Smart Inventory: Manage raw materials with advanced unit conversion (e.g., Buy in Box, consume in Grams).

🧮 Recursive Formula Engine: Create nested product formulas (Product A inside Product B). The engine automatically detects circular dependencies to prevent errors.

🤖 Automated Price Scraper: Integrated Node.js function to scrape real-time prices from online vendors and update cost calculations instantly.

📊 Analytics Dashboard: Visual charts for stock value distribution, category breakdown, and historical price fluctuation analysis.

🖨️ Professional Invoicing: Generate clean, printable production sheets and invoices directly from the browser.

🔔 Toast Notifications: Modern, non-blocking UI notifications for a smooth user experience.

🛠️ Tech Stack

Component

Technology

Frontend

Vanilla JavaScript (ES Modules)

Styling

Tailwind CSS (CDN / Utility-first)

Backend

Appwrite (Database, Auth, Functions)

Charting

Chart.js

Icons

Native Emoji & CSS Shapes

🚀 Getting Started

1. Clone the Repository

git clone [https://github.com/your-username/costwise.git](https://github.com/your-username/costwise.git)
cd costwise


2. Appwrite Configuration

To run this project, you need an Appwrite instance (Cloud or Self-hosted).

Create a Database and the following Collections:

categories (name)

units (name)

materials (name, price, unit_relations, scraper_url, ...)

formulas (name, components, labor, overhead, profit, is_public)

price_history (material_id, price, date)

Permissions: Update Row Level Security (RLS) to allow read/write access.

3. Frontend Setup

Navigate to js/core/.

Rename config.example.js to config.js.

Fill in your Appwrite credentials:

const APPWRITE_CONFIG = {
    ENDPOINT: '[https://cloud.appwrite.io/v1](https://cloud.appwrite.io/v1)',
    PROJECT_ID: 'YOUR_PROJECT_ID',
    DB_ID: 'YOUR_DATABASE_ID',
    // ... Update Collection IDs
};


4. Run Locally

Since this project uses ES Modules, serve it using a local server:

# Using Python
python3 -m http.server 8000

# Or using VS Code "Live Server" extension


Visit http://localhost:8000.

📂 Folder Structure

CostWise/
├── css/                 # Global styles
├── js/
│   ├── core/            # Config, API wrapper, Utils, I18n
│   ├── features/        # Business logic (Materials, Formulas, etc.)
│   ├── layout/          # HTML Templates & View Components
│   └── main.js          # App Entry point
├── my-scraper/          # Node.js Appwrite Function (Optional)
└── index.html           # Main HTML


🤖 Price Scraper (Optional)

To enable the "Update Prices" feature:

Go to the my-scraper folder.

Deploy the function to Appwrite Functions (Node.js runtime).

Add the Function ID to your js/core/config.js.

🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

📝 License

This project is open-source and available under the MIT License.