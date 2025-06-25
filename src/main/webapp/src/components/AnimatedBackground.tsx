import type React from "react"

export const AnimatedBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
                    </linearGradient>
                </defs>
                <path
                    d="M0,400 C300,300 600,500 900,400 C1050,350 1200,400 1200,400 L1200,800 L0,800 Z"
                    fill="url(#wave-gradient)"
                    className="animate-pulse"
                />
                <path
                    d="M0,500 C300,400 600,600 900,500 C1050,450 1200,500 1200,500 L1200,800 L0,800 Z"
                    fill="url(#wave-gradient)"
                    className="animate-pulse"
                    style={{ animationDelay: "1s" }}
                />
            </svg>
        </div>
    )
}
