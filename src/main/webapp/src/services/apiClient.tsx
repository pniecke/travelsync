import axios, {AxiosInstance, InternalAxiosRequestConfig} from "axios";

const isServer = typeof window === 'undefined';

/**
 * Base URL rules:
 * - Browser: use Next rewrite via `/api` => Spring `/api`
 * - Server (SSR/ getServerSideProps): call backend directly via env var
 */
const baseURL = isServer
    ? `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/api`
    : "/api";

function createApiClient(): AxiosInstance {
    const client = axios.create({
        baseURL,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
        },
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
    });

    // Request interceptor to add CSRF token
    client.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            // For non-GET requests, ensure CSRF token is present
            if (!isServer && config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
                const token = getCsrfTokenFromCookie();
                if (token && config.headers) {
                    config.headers['X-XSRF-TOKEN'] = token;
                }
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Global response error handling (browser only)
    client.interceptors.response.use(
        (r) => r,
        async (error) => {
            const status = error?.response?.status;
            const config = error?.config;

            if (!isServer) {
                // Handle CSRF token missing - retry once
                if (status === 403 && !config?._retry) {
                    config._retry = true;
                    try {
                        await ensureCsrf();
                        return client(config);
                    } catch (retryError) {
                        return Promise.reject(retryError);
                    }
                }

                // Handle 401 Unauthorized
                if (status === 401) {
                    const url: string = config?.url ?? "";
                    const isMeProbe =
                        url.endsWith("/user/me") || url.endsWith("/api/user/me");
                    const isAuthEndpoint =
                        url.includes("/auth/signin") || url.includes("/auth/signup");

                    // Don't redirect on these endpoints
                    if (!isMeProbe && !isAuthEndpoint && window.location.pathname !== "/login") {
                        console.warn("Unauthorized request, redirecting to login");
                        window.location.href = "/login";
                    }
                }
            }
            return Promise.reject(error);
        }
    )
    return client;
}

const apiClient = createApiClient();

/**
 * Create a per-request axios instance for SSR (`getServerSideProps`).
 * Never mutate the shared `apiClient` with the incoming user's cookie:
 * it is a module-level singleton shared across all in-flight SSR
 * requests in the Node process and would leak cookies between users.
 */
export function createServerApiClient(cookieHeader: string): AxiosInstance {
    return axios.create({
        baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/api`,
        withCredentials: true,
        headers: {
            'Content-Type': 'application/json',
            Cookie: cookieHeader,
        },
    });
}

function getCsrfTokenFromCookie(): string | null {
    if (isServer) return null;

    const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="));

    if (!cookie) return null;

    const value = cookie.split("=").splice(1).join("=");
    return value ? decodeURIComponent(value) : null;
}

// Ensure CSRF cookie exists
export async function ensureCsrf(): Promise<string> {
    const existing = getCsrfTokenFromCookie();
    if (existing) return existing;

    await apiClient.get("/auth/csrf");

    const token = getCsrfTokenFromCookie();
    if (!token) {
        throw new Error("CSRF token cookie `XSRF-TOKEN` was not set by the server.");
    }
    return token;
}

export default apiClient;

