'use client'

import {
    AlertCircle,
    Bug,
    CheckCircle2,
    ChevronLeft,
    Eye,
    EyeOff,
    KeyRound,
    Mail,
    Pencil,
    User as UserIcon,
    X,
} from "lucide-react";
import React, {useState} from "react";
import {GetServerSideProps} from "next";
import Link from "next/link";
import {AxiosError} from "axios";
import {AuthProvider, User} from "@/types";
import {createServerApiClient} from "@/services/apiClient";
import {getLoggedInUser} from "@/services/userService";
import apiClient, {ensureCsrf} from "@/services/apiClient";

interface SettingsPageProps {
    user: User
}

export const getServerSideProps: GetServerSideProps<SettingsPageProps> = async (ctx) => {
    const cookieHeader = ctx.req.headers.cookie
    if (!cookieHeader) {
        return {redirect: {destination: '/login', permanent: false}}
    }
    const ssrClient = createServerApiClient(cookieHeader)
    try {
        const user = await getLoggedInUser(ssrClient);
        return {props: {user}}
    } catch {
        return {redirect: {destination: '/login', permanent: false}}
    }
}

type ProfileFormState = Pick<User, "username" | "firstName" | "lastName" | "email" | "mobile" | "locale">;

function providerLabel(p: AuthProvider): string {
    switch (p) {
        case AuthProvider.Google: return "Google";
        case AuthProvider.Apple: return "Apple";
        default: return "your identity provider";
    }
}

function toProfileForm(u: User): ProfileFormState {
    return {
        username: u.username,
        firstName: u.firstName ?? "",
        lastName: u.lastName ?? "",
        email: u.email ?? "",
        mobile: u.mobile ?? "",
        locale: u.locale ?? "",
    };
}

export default function Settings({user: initialUser}: SettingsPageProps) {
    const [user, setUser] = useState<User>(initialUser);

    // For OAuth-linked accounts, username and email are owned by the upstream
    // identity provider — diverging them locally breaks future logins.
    const isIdentityLockedByIdp =
        !!user.authProvider && user.authProvider !== AuthProvider.Database;
    const identityLockHint = isIdentityLockedByIdp
        ? `Managed by ${providerLabel(user.authProvider!)}.`
        : "";

    // Profile edit state
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState<ProfileFormState>(toProfileForm(initialUser));
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

    // Password state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const startEditProfile = () => {
        setProfileForm(toProfileForm(user));
        setProfileError(null);
        setProfileSuccess(null);
        setIsEditingProfile(true);
    };

    const cancelEditProfile = () => {
        setIsEditingProfile(false);
        setProfileForm(toProfileForm(user));
        setProfileError(null);
    };

    const handleProfileChange = (field: keyof ProfileFormState) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setProfileForm(prev => ({...prev, [field]: e.target.value}));
        };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError(null);
        setProfileSuccess(null);
        setIsSavingProfile(true);
        try {
            await ensureCsrf();
            // Send only fields that changed
            const payload: Partial<ProfileFormState> = {};
            (Object.keys(profileForm) as Array<keyof ProfileFormState>).forEach(k => {
                const newVal = (profileForm[k] ?? "").trim();
                const oldVal = (toProfileForm(user)[k] ?? "").trim();
                if (newVal !== oldVal) payload[k] = newVal;
            });
            if (Object.keys(payload).length === 0) {
                setIsEditingProfile(false);
                return;
            }
            const response = await apiClient.patch<User>('/user/me', payload);
            setUser(response.data);
            setProfileSuccess("Profile updated.");
            setIsEditingProfile(false);
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                const status = err.response?.status;
                const apiMsg = err.response?.data?.error as string | undefined;
                if (status === 409) {
                    setProfileError(apiMsg || "Username or email is already taken.");
                } else if (status === 400) {
                    setProfileError(apiMsg || "Invalid input. Please check the fields.");
                } else {
                    setProfileError("Could not update profile. Please try again.");
                }
            } else {
                setProfileError("Could not update profile. Please try again.");
            }
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (newPassword !== confirmPassword) {
            setErrorMsg("New password and confirmation do not match.");
            return;
        }
        if (newPassword === currentPassword) {
            setErrorMsg("New password must differ from current password.");
            return;
        }

        setIsSubmitting(true);
        try {
            await ensureCsrf();
            await apiClient.post('/auth/change-password', {currentPassword, newPassword});
            setSuccessMsg("Password updated successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: unknown) {
            if (err instanceof AxiosError) {
                const status = err.response?.status;
                const apiMsg = err.response?.data?.error as string | undefined;
                if (status === 401) {
                    setErrorMsg("Current password is incorrect.");
                } else if (status === 400) {
                    setErrorMsg(apiMsg || "Invalid password. Please check the requirements.");
                } else {
                    setErrorMsg("Could not update password. Please try again.");
                }
            } else {
                setErrorMsg("Could not update password. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const bugReportHref = (() => {
        const subject = encodeURIComponent("[TravelSync] Bug report");
        const body = encodeURIComponent(
            `Describe the bug:\n\nSteps to reproduce:\n\nExpected behavior:\n\n---\nReporter: ${user.username}${user.email ? ` (${user.email})` : ""}`
        );
        return `mailto:pniecke@gmail.com?subject=${subject}&body=${body}`;
    })();

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <Link
                    href="/dashboard"
                    className="flex items-center text-gray-300 hover:text-blue-400 transition-colors group"
                >
                    <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform"/>
                    <span className="font-medium">Back to Dashboard</span>
                </Link>
            </div>

            {/* Page Title */}
            <div className="mb-8 pl-4 border-l-4 border-blue-500">
                <h1 className="text-3xl font-bold text-gray-100 mb-2">Settings</h1>
                <p className="text-gray-300 font-medium">Manage your account and preferences</p>
            </div>

            {/* Profile Section */}
            <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 mb-6">
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <UserIcon className="w-5 h-5 text-blue-400"/>
                        <h2 className="text-lg font-semibold text-gray-100">Profile</h2>
                    </div>
                    {!isEditingProfile && (
                        <button
                            onClick={startEditProfile}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
                        >
                            <Pencil className="w-4 h-4"/>
                            Edit
                        </button>
                    )}
                </div>

                {profileSuccess && !isEditingProfile && (
                    <div
                        className="mx-6 mt-4 flex items-start gap-2 p-3 bg-emerald-900/30 border border-emerald-700 text-emerald-300 rounded-lg text-sm"
                        role="status"
                        aria-live="polite"
                    >
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true"/>
                        <span>{profileSuccess}</span>
                    </div>
                )}

                {!isEditingProfile ? (
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ProfileField label="Username" value={user.username}/>
                        <ProfileField label="Email" value={user.email}/>
                        <ProfileField label="First name" value={user.firstName}/>
                        <ProfileField label="Last name" value={user.lastName}/>
                        <ProfileField label="Mobile" value={user.mobile}/>
                        <ProfileField label="Locale" value={user.locale}/>
                    </div>
                ) : (
                    <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                        {profileError && (
                            <div
                                className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm"
                                role="alert"
                                aria-live="polite"
                            >
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true"/>
                                <span>{profileError}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextField
                                id="username"
                                label="Username"
                                value={profileForm.username}
                                onChange={handleProfileChange("username")}
                                required
                                minLength={3}
                                maxLength={64}
                                pattern="^[A-Za-z0-9._-]+$"
                                title="3–64 characters: letters, digits, dot, underscore, or hyphen."
                                disabled={isIdentityLockedByIdp}
                                hint={isIdentityLockedByIdp ? identityLockHint : undefined}
                            />
                            <TextField
                                id="email"
                                label="Email"
                                type="email"
                                autoComplete="email"
                                value={profileForm.email ?? ""}
                                onChange={handleProfileChange("email")}
                                maxLength={254}
                                disabled={isIdentityLockedByIdp}
                                hint={isIdentityLockedByIdp ? identityLockHint : undefined}
                            />
                            <TextField
                                id="firstName"
                                label="First name"
                                autoComplete="given-name"
                                value={profileForm.firstName ?? ""}
                                onChange={handleProfileChange("firstName")}
                                maxLength={100}
                            />
                            <TextField
                                id="lastName"
                                label="Last name"
                                autoComplete="family-name"
                                value={profileForm.lastName ?? ""}
                                onChange={handleProfileChange("lastName")}
                                maxLength={100}
                            />
                            <TextField
                                id="mobile"
                                label="Mobile"
                                type="tel"
                                autoComplete="tel"
                                value={profileForm.mobile ?? ""}
                                onChange={handleProfileChange("mobile")}
                                maxLength={32}
                                pattern="^[+0-9 ()\-]*$"
                                title="Digits, spaces, +, (, ), or -. Leave empty to clear."
                            />
                            <TextField
                                id="locale"
                                label="Locale"
                                placeholder="e.g. en-US, de-CH"
                                value={profileForm.locale ?? ""}
                                onChange={handleProfileChange("locale")}
                                maxLength={16}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={cancelEditProfile}
                                className="flex items-center gap-1 px-4 py-2 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-4 h-4"/>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingProfile || !profileForm.username?.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:bg-gray-600 disabled:text-gray-400"
                            >
                                {isSavingProfile ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </form>
                )}
            </section>

            {/* Change Password Section — hidden for accounts whose password
                is managed by an external IdP (e.g. Google). We only hide when
                authProvider is explicitly non-DATABASE so legacy users with a
                null provider keep seeing the form. */}
            {user.authProvider && user.authProvider !== AuthProvider.Database ? (
                <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 mb-6">
                    <div className="p-6 border-b border-gray-700 flex items-center gap-3">
                        <KeyRound className="w-5 h-5 text-blue-400"/>
                        <h2 className="text-lg font-semibold text-gray-100">Password</h2>
                    </div>
                    <div className="p-6 text-sm text-gray-300 max-w-md">
                        Your password is managed by {providerLabel(user.authProvider)}. To change it, update it
                        through {providerLabel(user.authProvider)} and use “Sign in with {providerLabel(user.authProvider)}” next time.
                    </div>
                </section>
            ) : (
            <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 mb-6">
                <div className="p-6 border-b border-gray-700 flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-blue-400"/>
                    <h2 className="text-lg font-semibold text-gray-100">Change Password</h2>
                </div>
                <form onSubmit={handleChangePassword} className="p-6 space-y-4 max-w-md">
                    {successMsg && (
                        <div
                            className="flex items-start gap-2 p-3 bg-emerald-900/30 border border-emerald-700 text-emerald-300 rounded-lg text-sm"
                            role="status"
                            aria-live="polite"
                        >
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true"/>
                            <span>{successMsg}</span>
                        </div>
                    )}
                    {errorMsg && (
                        <div
                            className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm"
                            role="alert"
                            aria-live="polite"
                        >
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true"/>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <PasswordInput
                        id="currentPassword"
                        label="Current password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={setCurrentPassword}
                        show={showCurrent}
                        onToggleShow={() => setShowCurrent(s => !s)}
                    />
                    <PasswordInput
                        id="newPassword"
                        label="New password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={setNewPassword}
                        show={showNew}
                        onToggleShow={() => setShowNew(s => !s)}
                    />
                    <PasswordInput
                        id="confirmPassword"
                        label="Confirm new password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        show={showNew}
                        onToggleShow={() => setShowNew(s => !s)}
                    />

                    <div className="flex items-center justify-between pt-2">
                        <Link href="/forgot-password"
                              className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            Forgot password?
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:bg-gray-600 disabled:text-gray-400"
                        >
                            {isSubmitting ? "Updating..." : "Update password"}
                        </button>
                    </div>
                </form>
            </section>
            )}

            {/* Report Bug Section */}
            <section className="bg-gray-800 rounded-xl shadow-lg border border-gray-700">
                <div className="p-6 border-b border-gray-700 flex items-center gap-3">
                    <Bug className="w-5 h-5 text-blue-400"/>
                    <h2 className="text-lg font-semibold text-gray-100">Report a Bug</h2>
                </div>
                <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-gray-300 text-sm">
                        Spotted something off? Send us the details and we&apos;ll take a look.
                    </p>
                    <a
                        href={bugReportHref}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                    >
                        <Mail className="w-4 h-4"/>
                        Report a bug
                    </a>
                </div>
            </section>
        </div>
    );
}

interface TextFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
    required?: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    title?: string;
    disabled?: boolean;
    hint?: string;
}

function TextField({id, label, value, onChange, type = "text", autoComplete, placeholder, required, pattern, minLength, maxLength, title, disabled, hint}: TextFieldProps) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
                {label}
            </label>
            <input
                id={id}
                name={id}
                type={type}
                autoComplete={autoComplete}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
                pattern={pattern}
                minLength={minLength}
                maxLength={maxLength}
                title={title}
                disabled={disabled}
                aria-describedby={hint ? `${id}-hint` : undefined}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100 disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
            {hint && (
                <p id={`${id}-hint`} className="text-xs text-gray-400 mt-1">{hint}</p>
            )}
        </div>
    );
}

function ProfileField({label, value}: { label: string; value?: string }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{label}</p>
            <p className="text-gray-100">{value || <span className="text-gray-500">—</span>}</p>
        </div>
    );
}

interface PasswordInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggleShow: () => void;
    autoComplete: string;
}

function PasswordInput({id, label, value, onChange, show, onToggleShow, autoComplete}: PasswordInputProps) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    id={id}
                    name={id}
                    type={show ? "text" : "password"}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-100"
                    required
                />
                <button
                    type="button"
                    onClick={onToggleShow}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={show ? "Hide password" : "Show password"}
                >
                    {show ? <EyeOff className="w-4 h-4 text-gray-400"/> : <Eye className="w-4 h-4 text-gray-400"/>}
                </button>
            </div>
        </div>
    );
}
