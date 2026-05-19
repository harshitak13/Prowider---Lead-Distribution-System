# Prowider — Mini Lead Distribution System (MongoDB)

Next.js + MongoDB (Mongoose) lead distribution system with real-time provider dashboards.

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB database — free options below

### 2. Get a MongoDB URI
**MongoDB Atlas (free, recommended):**
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → sign up free
2. Create a free M0 cluster
3. Database Access → add a user with password
4. Network Access → Allow Access from Anywhere (0.0.0.0/0)
5. Connect → Drivers → copy the connection string:
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/prowider?retryWrites=true&w=majority`

### 3. Install & configure
```bash
cp .env.example .env
# Paste your MongoDB URI into .env as MONGODB_URI=...

npm install
```

### 4. Seed the database
```bash
npm run db:seed
```

### 5. Run
```bash
npm run dev
# Open http://localhost:3000
```

---

## Routes

| Route | Description |
|---|---|
| `/` | Home |
| `/request-service` | Customer enquiry form |
| `/dashboard` | Live provider dashboard (SSE real-time) |
| `/test-tools` | Webhook simulation, concurrency, idempotency testing |

---

## Architecture

### Allocation algorithm
1. **Mandatory providers** assigned first (per service rules).
2. **Remaining slots** (up to 3 total) filled via round-robin from the fair pool.
3. Rotation position stored in `AllocationCursor` collection — persists across restarts.

### Concurrency (MongoDB optimistic locking)
MongoDB has no `SELECT FOR UPDATE`. Instead we use **optimistic concurrency on the cursor document**:
- Read the cursor's current value and `__v` (version).
- Compute next index, then `findOneAndUpdate` with `__v` in the filter.
- If another request advanced the cursor first, the update returns `null` → retry (up to 10×).
- This correctly serialises concurrent leads without transactions.

### Webhook idempotency
The `WebhookEvent._id` IS the idempotency key. MongoDB's unique `_id` constraint rejects duplicate inserts. A race between check→insert is handled by catching `code 11000` on the insert itself.

### Real-time dashboard
Server-Sent Events via `/api/sse`. In-process pub/sub (swap for Redis pub/sub on multi-instance deployments).

### Duplicate lead rule
`LeadSchema.index({ phone: 1, serviceNumber: 1 }, { unique: true })` — enforced at DB level, returns 409 on violation.

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
