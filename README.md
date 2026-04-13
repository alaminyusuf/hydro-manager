# Hydro Manager SaaS 🌿

Hydro Manager is a robust, multi-tenant SaaS application designed for hydroponic farm management. It empowers growers to track crop cycles, nutrient levels (pH/EC), financial performance, and team assignments within a unified platform.

## 🚀 Key Features

### 1. Multi-tenant Organization Management
- Create and manage multiple organizations.
- Role-Based Access Control (RBAC): `Owner`, `Admin`, `Manager`, and `Member` roles.
- Secure invite and member management system.

### 2. Crop Batch Lifecycle Tracking
- Track growth cycles from `Planning` to `Harvesting` and `Completed`.
- Real-time logging of pH and EC (Electrical Conductivity) readings.
- Assignment of team members to specific grow batches.

### 3. AI-Powered Insights 🤖
- **Anomaly Detection**: Automatically identifies physiological stress in plants by detecting unusual pH or EC fluctuations using statistical Z-score analysis.
- **Growth Predictions**: Estimates projected harvest dates based on crop-specific growth models and current progress.
- **System Health Scoring**: Provides an overall health percentage for active grow cycles.

### 4. Financial Analytics
- Log expenses and income (e.g., nutrients, electricity, sales).
- Categorized cost breakdown and financial summary.
- Batch-specific profit analysis.

### 5. API Documentation & Reliability
- **Swagger/OpenAPI**: Interactive API documentation available at `/api-docs`.
- **Unit Testing**: Robust backend test suite using Jest and Supertest to ensure endpoint reliability.

## 🌍 Real-World Use Case: Vertical Urban Farm

Imagine an urban vertical farm operating multiple shipping containers. 

- **Scenario**: The head grower (Owner) creates an organization for the farm. They assign container managers (Managers) and shift workers (Members).
- **Control**: Shift workers log daily pH and EC readings. If a dosing pump fails, the pH spikes. 
- **AI Insight**: The Hydro Manager Dashboard immediately flags the pH anomaly and drops the "System Health" score to 60%, signaling the need for immediate intervention before crop loss.
- **Planning**: The system predicts that the current batch of Lettuce will be ready for harvest in 5 days, allowing the sales team to coordinate with local restaurants.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Axios, Chart.js.
- **Backend**: Node.js, Express, Mongoose.
- **Database**: MongoDB.
- **Testing**: Jest, Supertest.
- **Documentation**: Swagger, Mermaid.

## 🏁 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or via Docker)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd hydro-manager
   ```

2. **Setup Server**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Setup Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **View API Docs**:
   Navigate to `http://localhost:4000/api-docs`

---

## 🏗️ Architecture

For a detailed look at the system design, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).
