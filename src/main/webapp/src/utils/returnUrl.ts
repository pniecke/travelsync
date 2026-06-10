// Helpers for preserving a "where the user was headed" path across the
// login / signup detour — used by the invite-link flow so a non-user who
// opens /trips/join/{token} lands back there after authenticating.

const KEY = 'postLoginReturnUrl';

/**
 * Accept only same-origin relative paths ("/trips/join/abc"). Anything else —
 * absolute URLs, protocol-relative "//evil.com" — collapses to /dashboard to
 * prevent open-redirects.
 */
export function safeReturnUrl(raw: string | null | undefined): string {
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/dashboard';
}

/**
 * Stash a return path for flows that round-trip through an external redirect
 * (Google OAuth always lands back on "/"), where a query param can't survive.
 */
export function stashReturnUrl(url: string): void {
    if (typeof window !== 'undefined' && url !== '/dashboard') {
        sessionStorage.setItem(KEY, url);
    }
}

/** Read and clear a stashed return path; null if absent or unsafe. */
export function consumeReturnUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const v = sessionStorage.getItem(KEY);
    if (v) sessionStorage.removeItem(KEY);
    return v && v.startsWith('/') && !v.startsWith('//') ? v : null;
}
