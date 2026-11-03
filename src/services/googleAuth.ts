// src/services/googleAuth.ts
// Robust Google Identity Services (GSI) loader and official button manager

export interface GoogleAuthPayload {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

export type GoogleCredentialCallback = (response: GoogleAuthPayload) => void | Promise<void>;

let scriptLoadingPromise: Promise<any> | null = null;
let activeCallback: GoogleCredentialCallback | null = null;
let activeClientId: string | null = null;
let isInitialized = false;

/**
 * Loads the official Google Identity Services client script (https://accounts.google.com/gsi/client)
 * Handles already-present tags, delayed script execution, and network/adblocker timeouts.
 */
export function loadGoogleScript(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not available'));
  }

  const w = window as any;
  if (w.google?.accounts?.id) {
    return Promise.resolve(w.google);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    let timeoutId: any;
    let pollInterval: any;

    const cleanup = () => {
      clearTimeout(timeoutId);
      clearInterval(pollInterval);
    };

    // 8-second timeout for privacy tools/adblockers that sinkhole accounts.google.com
    timeoutId = setTimeout(() => {
      cleanup();
      scriptLoadingPromise = null;
      reject(
        new Error(
          'Google authentication script loading timed out. If you are using an adblocker or privacy extension, please allow accounts.google.com, or sign in with email and password.'
        )
      );
    }, 8000);

    pollInterval = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        cleanup();
        resolve((window as any).google);
      }
    }, 100);

    // Check if script element already exists in document
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google?.accounts?.id) {
          cleanup();
          resolve((window as any).google);
        }
      };
      script.onerror = () => {
        cleanup();
        scriptLoadingPromise = null;
        reject(
          new Error(
            'Failed to load Google Identity Services. Please check your network connection or sign in with email and password.'
          )
        );
      };
      document.head.appendChild(script);
    }
  });

  return scriptLoadingPromise;
}

/**
 * Initializes Google Identity Services once per clientId.
 * Employs a delegated callback dispatcher so component re-renders or unmounts never
 * overwrite Google's internal listeners with stale closures.
 */
export function initGoogleIdentity(clientId: string, callback: GoogleCredentialCallback): void {
  activeCallback = callback;

  if (typeof window === 'undefined') return;
  const google = (window as any).google;
  if (!google?.accounts?.id) return;

  if (isInitialized && activeClientId === clientId) {
    return;
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: GoogleAuthPayload) => {
      if (activeCallback) {
        activeCallback(response);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  isInitialized = true;
  activeClientId = clientId;
}

/**
 * Renders Google's official, real clickable button directly into the container element.
 */
export function renderGoogleButton(
  container: HTMLElement,
  options: {
    mode?: 'signin' | 'signup';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    width?: number;
  } = {}
): void {
  if (typeof window === 'undefined') return;
  const google = (window as any).google;
  if (!google?.accounts?.id || !container) return;

  try {
    container.innerHTML = '';
    google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: options.theme || 'outline',
      size: options.size || 'large',
      text: options.mode === 'signup' ? 'signup_with' : 'signin_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: options.width || 360,
    });
  } catch (err) {
    console.warn('Google Identity button rendering notice:', err);
  }
}

/**
 * Programmatically triggers Google Identity Services One Tap / Credential prompt.
 * Handles notification callbacks, suppression, and dismissal gracefully.
 */
export function triggerGooglePrompt(
  onNotification?: (notification: { isNotDisplayed: boolean; isDismissed: boolean; reason?: string }) => void
): void {
  if (typeof window === 'undefined') return;
  const google = (window as any).google;
  if (!google?.accounts?.id) {
    if (onNotification) {
      onNotification({ isNotDisplayed: true, isDismissed: false, reason: 'script_not_loaded' });
    }
    return;
  }

  try {
    google.accounts.id.prompt((notification: any) => {
      const isNotDisplayed = typeof notification?.isNotDisplayed === 'function' ? notification.isNotDisplayed() : false;
      const isDismissed = typeof notification?.isDismissedMoment === 'function' ? notification.isDismissedMoment() : false;
      const reason = typeof notification?.getNotDisplayedReason === 'function' ? notification.getNotDisplayedReason() : undefined;

      if (onNotification) {
        onNotification({ isNotDisplayed, isDismissed, reason });
      }
    });
  } catch (err) {
    console.warn('Google Identity prompt notice:', err);
    if (onNotification) {
      onNotification({ isNotDisplayed: true, isDismissed: false, reason: 'prompt_exception' });
    }
  }
}

/**
 * Unregisters a callback when its component unmounts.
 */
export function unregisterGoogleCallback(cb: GoogleCredentialCallback): void {
  if (activeCallback === cb) {
    activeCallback = null;
  }
}
