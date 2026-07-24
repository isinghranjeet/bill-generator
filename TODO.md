# Integration Plan

## Step 1: Backend - Add bankDetails to Zod schema ✅
- `backend/server/src/controllers/settingsController.js` - Add `bankDetails` to `settingsUpsertSchema`

## Step 2: Backend - Update upsertSettings controller ✅
- `backend/server/src/controllers/settingsController.js` - Assign bankDetails in upsertSettings

## Step 3: Frontend - Fix settingsApi.ts ✅
- Add `updateBankDetails` and fix types

## Step 4: Frontend - Fix useSettings.ts hook ✅
- Fix type mapping to match flat API response

## Step 5: Frontend - Add Settings button to AdminPortal ✅
- Import SettingsDrawer, add Settings button in header, manage state
- Added `settingsDrawerOpen` state variable
- Added `Settings` icon button between Reports and New Invoice dropdowns
- Added `<SettingsDrawer>` component rendered before the Report Dialog

## Step 6: Frontend - Add Bank Details to SettingsDrawer ✅
- Add form fields and save handler

## Step 7: Frontend - Fix ProfessionalInvoice bank details ✅
- Replace hardcoded values with dynamic company props

## Step 8: Frontend - Fix CreateInvoice fallbacks + remarks chips ✅
- Fix DEFAULT_COMPANY values
- Add selectable remarks chips
- Save only selected remarks

## Step 9: Validation ✅
- npm run lint && npm run build

