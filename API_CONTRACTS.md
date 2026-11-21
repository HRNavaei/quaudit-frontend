# QuAudit Frontend API Contracts & Assumptions

This document describes the API architecture, existing backend integration, and contract specifications for endpoints that are currently supported by the centralized service layer and mock adapter.

---

## 1. Authentication & Security

- **Authentication Method**: JWT Bearer Token.
- **Storage**: The access token is stored under `localStorage.getItem('quaudit_token')`.
- **Authorization Header**: Sent automatically via Axios request interceptor:
  ```http
  Authorization: Bearer <jwt-token>
  ```
- **Session Expiration (401 Handling)**:
  - Intercepted by Axios response interceptor in `src/api/client.ts`.
  - Clears `quaudit_token` and `quaudit_user` from local storage.
  - Emits `auth:unauthorized` window event, redirecting the user to `/login`.

---

## 2. API Mode & Seamless Fallback

- The application supports both **Live Backend API** mode and **In-Memory Reactive Mock** mode.
- Controlled via UI Header switch or `localStorage.getItem('quaudit_use_mock')`.
- If an endpoint in live mode returns `404` or server error because the backend controller is not yet built, the centralized service layer gracefully falls back to the local reactive repository (`mockStorage.ts`) to ensure 100% functionality and testability.

---

## 3. Implemented Backend Endpoints

These endpoints exist in the NestJS backend (`/Project/src/`):

### Auth
- `POST /api/auth/login`
  - Body: `{ email: string, password: string }`
  - Response: `{ access_token: string }`
- `POST /api/auth/register`
  - Body: `{ email: string, password: string, firstName: string, lastName: string }`
  - Response: `{ access_token: string }`

### Users
- `GET /api/users/me`
  - Headers: `Authorization: Bearer <token>`
  - Response: `User` object (excluding password)

### Suppliers (Implemented in backend controller)
- `POST /api/suppliers`: Create supplier profile
- `GET /api/suppliers`: List all suppliers (Admin & Supervisor)
- `GET /api/suppliers/me`: Current user supplier profile
- `GET /api/suppliers/:id`: Get supplier by UUID
- `PATCH /api/suppliers/:id`: Update supplier
- `DELETE /api/suppliers/:id`: Delete supplier

### Products (Implemented in backend controller)
- `POST /api/products`: Create product
- `GET /api/products?supplierId=<uuid>`: List products
- `GET /api/products/:id`: Get product details
- `PATCH /api/products/:id`: Update product
- `DELETE /api/products/:id`: Delete product

---

## 4. Assumed Endpoints (Mock Layer Ready for Production Replacement)

The following endpoints match the Prisma schema and technical decisions (`technical-decisions.md`):

### Questionnaires
- `GET /api/questionnaires`
  - Returns array of questionnaires with version, status, and questions.
- `GET /api/questionnaires/:id`
  - Returns single questionnaire with questions and options.
- `POST /api/questionnaires`
  - Body: `{ title: string, description?: string, questions: QuestionDto[], status: 'DRAFT' | 'PUBLISHED' }`
- `PATCH /api/questionnaires/:id`
  - Body: Partial questionnaire updates and questions.
- `DELETE /api/questionnaires/:id`
  - Deletes draft questionnaires.

### Assignments
- `GET /api/assignments?supplierId=<uuid>&questionnaireId=<uuid>`
  - Returns assignments matching filters.
- `POST /api/assignments`
  - Body: `{ questionnaireId: string, supplierId: string, productId?: string | null }`
  - Enforces constraint: partial unique index on `(questionnaireId, supplierId, productId)`.
- `PATCH /api/assignments/:id/status`
  - Body: `{ status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' }`
- `POST /api/assignments/:id/answers`
  - Body: `{ answers: AnswerDto[], submit: boolean }`
  - If `submit: true`, status changes to `SUBMITTED`, `submittedAt` is timestamped, and notifications are sent to supervisors.

### Notifications
- `GET /api/notifications`
  - Returns notifications for authenticated receiver.
- `PATCH /api/notifications/:id/read`
  - Marks notification as read.
- `PATCH /api/notifications/read-all`
  - Marks all notifications for user as read.

### Analytics
- `GET /api/analytics/questionnaires/:id`
  - Returns completion rate, option breakdown counts/percentages for choices, and average/min/max for numeric questions.

---

## 5. Business Rules & Constraints

1. **Immutable Submissions (TD-004)**: Once an assignment status is `SUBMITTED`, the supplier cannot alter answers. Re-opening must be initiated by a supervisor.
2. **Cycle Detection for Conditional Logic (TD-007)**: The frontend DFS engine (`src/utils/conditionalLogic.ts`) prevents circular follow-up dependencies both in the builder UI and on submission.
3. **Unique Assignments (TD-010)**: Prevents assigning the same questionnaire twice to the same supplier for the same product.
