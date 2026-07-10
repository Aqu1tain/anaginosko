// Mesure d'audience via Matomo auto-hébergé. Anonyme et sans cookie : IP
// anonymisée côté serveur, aucun identifiant persistant. Conforme à l'exemption
// de consentement (mesure d'audience) : aucun bandeau requis. La provenance des
// visiteurs (référent : TikTok, Google, direct…) est captée automatiquement.
//
// Tout est inerte tant que NEXT_PUBLIC_MATOMO_URL / _SITE_ID ne sont pas définis :
// la branche peut donc vivre en prod sans rien émettre avant l'installation de
// Matomo.

type Paq = unknown[][] & { push: (row: unknown[]) => void };

declare global {
  interface Window {
    _paq?: Paq;
  }
}

const RAW_URL = process.env.NEXT_PUBLIC_MATOMO_URL ?? "";
const SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID ?? "";
const BASE = RAW_URL.replace(/\/?$/, "/");

export const isAnalyticsConfigured = (): boolean => Boolean(RAW_URL && SITE_ID);

let started = false;

function paq(): Paq | null {
  if (typeof window === "undefined" || !isAnalyticsConfigured()) return null;
  window._paq = window._paq ?? ([] as unknown as Paq);
  return window._paq;
}

// Amorce Matomo une seule fois. Idempotent, sûr à appeler à chaque montage.
export function initMatomo(): void {
  const q = paq();
  if (!q || started) return;
  started = true;

  q.push(["disableCookies"]);
  q.push(["setDoNotTrack", true]);
  q.push(["enableLinkTracking"]);
  q.push(["setTrackerUrl", `${BASE}matomo.php`]);
  q.push(["setSiteId", SITE_ID]);

  const s = document.createElement("script");
  s.async = true;
  s.src = `${BASE}matomo.js`;
  document.head.appendChild(s);
}

// Vue de page (routes SPA incluses). Le référent est joint automatiquement.
export function trackPageView(title?: string): void {
  const q = paq();
  if (!q) return;
  q.push(["setCustomUrl", window.location.href]);
  q.push(["setDocumentTitle", title ?? document.title]);
  q.push(["trackPageView"]);
}

// Événement métier (audio joué, annotation créée…).
export function trackEvent(
  category: string,
  action: string,
  name?: string,
  value?: number,
): void {
  const q = paq();
  if (!q) return;
  q.push(["trackEvent", category, action, name, value]);
}
