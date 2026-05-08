import {AlertCircle, ChevronLeft, ChevronRight, Eye, EyeOff, Plane} from "lucide-react"
import React, {useEffect, useState} from "react";
import {AnimatedBackground} from "@/components/AnimatedBackground";
import Link from "next/link";
import {useAuth} from "@/context/AuthProvider";
import {useRouter} from "next/router";
import apiClient, {ensureCsrf} from "@/services/apiClient";
import {SignUpRequest} from "@/types/models/SignUpRequest";
import {AxiosError} from "axios";

const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

interface SignupFormData {
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
    firstName: string;
    lastName: string;
}

export const Signup: React.FC = () => {
    const {user, loading} = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.replace('/dashboard')
        }
    }, [user, loading, router]);

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<SignupFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        username: '',
        firstName: '',
        lastName: '',
    })
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 12) strength += 40;
        if (password.length >= 16) strength += 20;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 10;
        if (/[^A-Za-z0-9]/.test(password)) strength += 10;
        return Math.min(strength, 100);
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}))

        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value))
        }
    }

    const nextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (currentStep === 1) {
            if (formData.password.length < 12) {
                setErrorMsg("Password must be at least 12 characters long.");
                return;
            }
            if (formData.password.length > 72) {
                setErrorMsg("Password is too long. Please use 72 characters or fewer.");
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setErrorMsg("Passwords do not match.");
                return;
            }
        }

        setCurrentStep((prev) => Math.min(prev + 1, 2));
    }

    const prevStep = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (formData.password !== formData.confirmPassword) {
            setErrorMsg("Passwords do not match.");
            setCurrentStep(1);
            return;
        }
        if (!USERNAME_PATTERN.test(formData.username)) {
            setErrorMsg("Username may only contain letters, numbers, dots, dashes, and underscores.");
            return;
        }
        if (formData.username.length < 3 || formData.username.length > 64) {
            setErrorMsg("Username must be between 3 and 64 characters.");
            return;
        }

        const signUpRequest: SignUpRequest = {
            username: formData.username.trim(),
            password: formData.confirmPassword,
            email: formData.email,
            firstName: formData.firstName.trim() || undefined,
            lastName: formData.lastName.trim() || undefined,
        }

        try {
            await ensureCsrf();
            await apiClient.post('/auth/signup', signUpRequest);
            router.replace('/login?signupSuccess=1');
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                const errorMessage = err?.response?.data?.error;
                if (err?.response?.status === 409) {
                    setErrorMsg(errorMessage || "We couldn't create your account with the provided details.");
                } else if (err?.response?.status === 429) {
                    const retryAfter = err.response?.data?.retryAfterSeconds as number | undefined;
                    const minutes = retryAfter ? Math.ceil(retryAfter / 60) : null;
                    setErrorMsg(
                        minutes
                            ? `Too many signup attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
                            : (errorMessage || "Too many signup attempts. Please try again later.")
                    );
                } else if (err?.response?.status === 400) {
                    setErrorMsg(errorMessage || "Invalid input. Please check your information.");
                } else {
                    setErrorMsg("Sign up failed. Please try again.");
                }
            } else {
                setErrorMsg("Sign up failed. Please try again.");
            }
        }
    }

    const getPasswordStrengthColor = () => {
        if (passwordStrength < 25) return "bg-red-500"
        if (passwordStrength < 50) return "bg-orange-500"
        if (passwordStrength < 75) return "bg-yellow-500"
        return "bg-green-500"
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
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
                                    minLength={12}
                                    maxLength={72}
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

                            {formData.password ? (
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                                        <span>Password strength</span>
                                        <span>{passwordStrength}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                                            style={{width: `${passwordStrength}%`}}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-1 text-xs text-slate-500">At least 12 characters.</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800"
                                required
                            />
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">Passwords don&#39;t match</p>
                            )}
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                pattern="[A-Za-z0-9._\-]+"
                                minLength={3}
                                maxLength={64}
                                autoComplete="username"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800"
                                placeholder="e.g. paul.niecke"
                                required
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                3–64 characters. Letters, numbers, and <code>. - _</code> only — no spaces.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                                    First name
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    maxLength={100}
                                    autoComplete="given-name"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800"
                                    placeholder="Paul"
                                />
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
                                    Last name
                                </label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    maxLength={100}
                                    autoComplete="family-name"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800"
                                    placeholder="Niecke"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">First and last name are optional — you can add them later in settings.</p>
                    </div>
                )

            default:
                return null
        }
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

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center mb-6">
                        {[1, 2].map((step) => (
                            <React.Fragment key={step}>
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        step <= currentStep ? "bg-sky-500 text-white" : "bg-slate-200 text-slate-500"
                                    }`}
                                >
                                    {step}
                                </div>
                                {step < 2 && <div
                                    className={`w-12 h-1 mx-2 ${step < currentStep ? "bg-sky-500" : "bg-slate-200"}`}/>}
                            </React.Fragment>
                        ))}
                    </div>

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

                    {/* Step Content */}
                    <form onSubmit={currentStep === 2 ? handleSubmit : nextStep} className="space-y-6">
                        {renderStep()}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between">
                            {currentStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="flex items-center px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1"/>
                                    Back
                                </button>
                            ) : (
                                <div/>
                            )}

                            {currentStep < 2 ? (
                                <button
                                    type="submit"
                                    className="flex items-center px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1"/>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                                >
                                    Create Account
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-600">
                            Already have an account?{" "}
                            <Link href="/login" className="text-sky-500 hover:text-sky-600 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Signup;
