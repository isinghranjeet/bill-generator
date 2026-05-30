type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<unknown>;
};

let deferredPrompt: BeforeInstallPromptEvent | null;



export function setupInstallPrompt(onAvailable?: () => void) {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    deferredPrompt = e as unknown as BeforeInstallPromptEvent;
    onAvailable?.();
  });
}


export async function triggerInstall() {
  if (!deferredPrompt) return false;
  const promptResult = await deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  await promptResult;
  deferredPrompt = null;
  return true;
}

