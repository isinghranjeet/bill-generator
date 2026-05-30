# TODO - PWA conversion

## Step 1: Verify existing PWA setup
- [x] Confirm `vite-plugin-pwa` exists and basic SW generation is configured
- [x] Confirm `manifest.webmanifest` exists and has required fields
- [x] Confirm install/update UI components exist (`PwaInstallButton`, `PwaUpdateBanner`)

## Step 2: Make PWA UI global (install button + update banner)
- [x] Move `PwaInstallButton` and `PwaUpdateBanner` rendering to `src/App.tsx` so they show on all routes



## Step 3: Offline-first invoice loading consistency
- [ ] Update `AdminPortal`, `EditInvoice`, and (if needed) `CreateInvoice` to use cached invoice data when offline

## Step 4: Improve Workbox caching to satisfy Lighthouse requirements
- [ ] Update `vite.config.ts` Workbox runtime caching to better cover SPA navigation + offline fallback

## Step 5: Manifest icons & maskable support
- [x] Ensure icons meet Lighthouse PWA criteria (192/512, maskable)


## Step 6: Dependency verification
- [ ] Ensure `vite-plugin-pwa` is installed and lockfile updated

## Step 7: Build + Verify
- [x] Run `npm run build`
- [ ] Run Lighthouse PWA checks (manual)


