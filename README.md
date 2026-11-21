# QuAudit Frontend

Frontend web application for the **Supplier Monitoring and Questionnaire Management System (QuAudit)**.

Built with **React**, **TypeScript**, **Vite**, **Ant Design**, **React Router**, **TanStack Query**, and **Axios**.

---

## 🌟 Key Features

1. **Role-Based Navigation & Access Control**:
   - **SUPERVISOR**: Questionnaire authoring with dynamic branching logic, product & supplier monitoring, assignment dispatching, response audit & re-opening, quality analytics.
   - **SUPPLIER**: Product registration, assigned compliance audits, dynamic questionnaire completion, progress tracking, and notifications.

2. **Dynamic Conditional Questionnaire Engine**:
   - **Question Types**: `TEXT`, `YES_NO`, `SINGLE_CHOICE`, `NUMBER`.
   - **Conditional Follow-up Branching**: Answering options (e.g. Yes vs No, or specific choice) dynamically reveals or hides dependent follow-up questions.
   - **Visual Branching Map**: Interactive decision tree preview in the builder.
   - **Cycle Safety**: Cycle detection algorithms prevent infinite loops in branching logic.
   - **Interactive Simulator**: Supervisors can preview and test their questionnaire forms in real-time within the builder.

3. **Backend Integration & Mock Service Layer**:
   - Centralized Axios API service with JWT authentication and 401 automatic redirect.
   - TanStack Query for cache invalidation and server-state management.
   - Switchable In-Memory Reactive Mock layer with pre-configured seed data for instant testing without requiring active database migrations.

4. **Response Analytics & Visualization**:
   - Donut charts for assignment completion rates.
   - Horizontal bar charts for choice option distributions.
   - Numeric KPI cards (average, minimum, maximum) for quantitative audit questions.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18
- npm >= 9

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

---

## 👥 Pre-Configured Test Accounts

You can click any of the **Quick Test Account** buttons on the Login page (`/login`) or use the role switcher in the top navigation header:

| Role | Email | Password | Description |
|---|---|---|---|
| **SUPERVISOR** | `supervisor@quaudit.com` | `Supervisor@123456` | Questionnaire authoring & audit management |
| **SUPPLIER** | `supplier@quaudit.com` | `Supplier@123456` | Pars Home Electronics representative |

---

## 📁 Project Architecture

```
frontend/
├── src/
│   ├── api/             # Centralized Axios client and API modules
│   ├── components/      # Common UI, layouts, and dynamic questionnaire renderers
│   ├── context/         # AuthContext and NotificationContext
│   ├── mock/            # Mock storage, reactive state, and appliance domain seed data
│   ├── pages/           # Application views (Auth, Dashboard, Builder, Assignments, Analytics...)
│   ├── routes/          # ProtectedRoute definitions and routing table
│   ├── types/           # TypeScript interfaces matching Prisma schema
│   ├── utils/           # Conditional logic and graph cycle detection
│   ├── App.tsx          # Ant Design theme provider and QueryClient setup
│   └── main.tsx         # Application entry point
├── API_CONTRACTS.md     # Backend API contracts and endpoint documentation
└── package.json
```
