'use client'

import React, {useEffect, useState} from "react";
import {AlertCircle, CheckCircle2, Eye, EyeOff, Plane} from "lucide-react";
import {AnimatedBackground} from "@/components/AnimatedBackground";
import Link from "next/link";
import {useAuth} from "@/context/AuthProvider";
import {useRouter, useSearchParams} from "next/navigation";
import apiClient, {ensureCsrf} from "@/services/apiClient";
import {SignInRequest} from "@/types/models/SignInRequest";
import {AxiosError} from "axios";
import {safeReturnUrl, stashReturnUrl} from "@/utils/returnUrl";

interface LoginFormData {
    identifier: string;
    password: string;
    rememberMe: boolean;
}

export const Login: React.FC = () => {
    const {user, loading, refetch} = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = safeReturnUrl(searchParams?.get('returnUrl'));
    const signupHref = returnUrl !== '/dashboard'
        ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}`
        : '/signup';

    useEffect(() => {
        if (!loading && user) {
            router.replace(returnUrl)
        }
    }, [user, loading, router, returnUrl]);

    const [formData, setFormDate] = useState<LoginFormData>({
        identifier: "",
        password: "",
        rememberMe: false,
    })
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (searchParams?.get('signupSuccess') === '1') {
            setSuccessMsg("Account created. Please sign in to continue.");
            // Clean the URL but keep returnUrl so the post-login redirect still works.
            router.replace(returnUrl !== '/dashboard'
                ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
                : '/login');
        }
    }, [searchParams, router, returnUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const signInRequest: SignInRequest = {
            identifier: formData.identifier,
            password: formData.password
        };

        try {
            await ensureCsrf();
            await apiClient.post('/auth/signin', signInRequest);

            // Refetch user data to update AuthProvider
            await refetch();

            router.replace(returnUrl);
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                const errorMessage = err?.response?.data?.error;
                if (err?.response?.status === 401) {
                    setErrorMsg("The email, username, or password you entered is incorrect. Please try again.");
                } else if (err?.response?.status === 403) {
                    setErrorMsg("Request blocked (CSRF). Please refresh and try again.")
                } else if (err?.response?.status === 429) {
                    const retryAfter = err.response?.data?.retryAfterSeconds as number | undefined;
                    const minutes = retryAfter ? Math.ceil(retryAfter / 60) : null;
                    setErrorMsg(
                        minutes
                            ? `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
                            : (errorMessage || "Too many failed attempts. Try again later.")
                    );
                } else if (err?.response?.status === 400) {
                    setErrorMsg(errorMessage || "Invalid request. Please check your input.");
                } else {
                    setErrorMsg("Sign in failed. Please try again.");
                }
            } else {
                setErrorMsg("Sign in failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value, type, checked} = e.target;
        setFormDate((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    if (loading) return <p>Loading...</p>

    return (
        <div className="min-h-screen flex items-center justify-center relative">
            <AnimatedBackground/>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    {/* Logo */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="flex items-center space-x-2">
                            <Plane className="w-8 h-8 text-sky-500"/>
                            <span className="text-2xl font-bold text-slate-800">TravelSync</span>
                        </div>
                    </div>

                    {/* Show success message if exists */}
                    {successMsg && (
                        <div
                            className="mb-4 flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm"
                            role="status"
                            aria-live="polite"
                        >
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true"/>
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Show error message if exists */}
                    {errorMsg && (
                        <div
                            className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
                            role="alert"
                            aria-live="polite"
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true"/>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* OAuth Buttons */}
                    <div className="space-y-3 mb-6">
                        <button
                            type="button"
                            className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-800"
                            onClick={() => {
                                // OAuth round-trips through Google and lands back on "/",
                                // so a query param can't survive — stash it instead.
                                stashReturnUrl(returnUrl);
                                window.location.href = "/api/oauth2/authorization/google";
                            }}
                        >
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continue with Google
                        </button>

                        <button
                            type="button"
                            disabled
                            title="Apple Sign-In is not yet available"
                            className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-lg text-slate-400 cursor-not-allowed opacity-60">
                            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="#9CA3AF">
                                <path
                                    d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                            </svg>
                            Continue with Apple (coming soon)
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-300"/>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Or continue with email or username</span>
                        </div>
                    </div>

                    {/* Identifier/Password Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1">
                                Email or username
                            </label>
                            <input
                                type="text"
                                id="identifier"
                                name="identifier"
                                autoComplete="username"
                                value={formData.identifier}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4 text-slate-400"/>
                                    ) : (
                                        <Eye className="w-4 h-4 text-slate-400"/>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                name="rememberMe"
                                checked={formData.rememberMe}
                                onChange={handleInputChange}
                                className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-slate-300 rounded"
                            />
                            <label htmlFor="rememberMe" className="ml-2 block text-sm text-slate-700">
                                Remember me
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-sky-500 text-white py-2 px-4 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-600">
                            Don&#39;t have an account?{" "}
                            <Link href={signupHref} className="text-sky-500 hover:text-sky-600 font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Login;