import {AuthFormData} from "@/types";
import {ChevronLeft, ChevronRight, Eye, EyeOff, FolderSyncIcon as Sync, Plane} from "lucide-react"
import React, {useState} from "react";
import {Link} from "react-router-dom";
import {AnimatedBackground} from "@/components/AnimatedBackground";

interface SignupFormData extends AuthFormData {
    confirmPassword: string;
    name: string;
    bio: string;
    interests: string[];
}

export const SignupPage: React.FC = () => {
    const [currentStep, setCurrentStep] = React.useState(1);
    const [formData, setFormData] = useState<SignupFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        bio: '',
        interests: []
    })
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25
        if (/[0-9]/.test(password)) strength += 25
        if (/[^A-Za-z0-9]/.test(password)) strength += 25
        return strength
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}))

        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value))
        }
    }

    const handleInterestToggle = (interest: string) => {
        setFormData((prev) => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter((i) => i !== interest)
                : [...prev.interests, interest],
        }))
    }
    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3))
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

    const interests = [
        "Adventure",
        "Culture",
        "Food",
        "Nature",
        "Photography",
        "History",
        "Beach",
        "Mountains",
        "Cities",
        "Nightlife",
        "Shopping",
        "Art",
    ]

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
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
                                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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

                            {formData.password && (
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
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                required
                            />
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                            )}
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-1">
                                Bio (Optional)
                            </label>
                            <textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                                placeholder="Tell us a bit about yourself..."
                            />
                        </div>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-medium text-slate-800 mb-3">What interests you?</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Select your travel interests to get personalized recommendations
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                {interests.map((interest) => (
                                    <button
                                        key={interest}
                                        type="button"
                                        onClick={() => handleInterestToggle(interest)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            formData.interests.includes(interest)
                                                ? "bg-sky-500 text-white"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative">
            <AnimatedBackground/>

            <div className="relative z-10 w-full max-w-md p-8">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    {/* Logo */}
                    <div className="flex items-center justify-center mb-8">
                        <div className="flex items-center space-x-2">
                            <div className="relative">
                                <Plane className="w-8 h-8 text-sky-500"/>
                                <Sync className="w-4 h-4 text-teal-500 absolute -bottom-1 -right-1"/>
                            </div>
                            <span className="text-2xl font-bold text-slate-800">TravelSync</span>
                        </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-center mb-6">
                        {[1, 2, 3].map((step) => (
                            <React.Fragment key={step}>
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        step <= currentStep ? "bg-sky-500 text-white" : "bg-slate-200 text-slate-500"
                                    }`}
                                >
                                    {step}
                                </div>
                                {step < 3 && <div
                                    className={`w-12 h-1 mx-2 ${step < currentStep ? "bg-sky-500" : "bg-slate-200"}`}/>}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step Content */}
                    <form className="space-y-6">
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

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
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
                            <Link to="/login" className="text-sky-500 hover:text-sky-600 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
