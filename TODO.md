# TODO - Fix Vite + React + Express + MongoDB frontend/backend connection

## Step 1: Confirm repo findings
- [x] Scanned backend for CORS config location
- [x] Scanned frontend for duplicate `/api/api/` usage
- [x] Identified invoice endpoints using `/api/invoices` paths

## Step 2: Implement code fixes
- [x] Fix backend CORS to allow both `http://localhost:5173` and `http://localhost:8081`
- [x] Fix frontend API client to normalize `VITE_API_URL` and prevent `/api/api/`
- [x] Fix invoice API calls to use `/invoices...` paths (no duplicate `/api`)
- [x] Add improved error handling + console logs in api client


## Step 3: Verification
- [x] Restart backend and frontend
- [x] Verify endpoints:
  - [ ] http://localhost:4000/api/health
  - [x] http://localhost:4000/api/invoices
- [ ] Verify frontend can fetch invoices (401 handled; no CORS/network errors)



