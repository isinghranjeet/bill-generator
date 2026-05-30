type RefreshCallback = () => void;

export function setupPwaUpdate(onNewVersionAvailable?: RefreshCallback) {
  if (!('serviceWorker' in navigator)) return () => {};

  let swRegistration: ServiceWorkerRegistration | null = null;
  let refreshing = false;

  const handler = () => {
    if (refreshing) return;
    refreshing = true;

    if (typeof onNewVersionAvailable === 'function') {
      onNewVersionAvailable();
    }
  };

  navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      swRegistration = reg;
      if (!swRegistration) return;

      swRegistration.addEventListener('updatefound', () => {
        const installing = swRegistration?.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          // When the new service worker has been installed and is ready to activate
          if (installing.state === 'installed') {
            // If there's already a controller, then it's an update
            const isUpdate = !!navigator.serviceWorker.controller;
            if (isUpdate) handler();
          }
        });
      });
    })
    .catch(() => {
      // ignore
    });

  return () => {
    // no-op cleanup (listener removal not supported across browsers here)
    swRegistration = null;
  };
}

