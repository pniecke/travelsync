'use client'

import React from "react";
import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import {LoginPage} from "@/pages/LoginPage";
import {SignupPage} from "@/pages/SignupPage";
import {Layout} from "@/components/Layout";
import {Dashboard} from "@/pages/Dashboard";

const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/user/me', {
                    credentials: 'include'
                })
                if (response.ok) {
                    setIsAuthenticated(true)
                }
            } catch (error) {
                console.error("Authentication check failed:", error);
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);
    return {isAuthenticated, setIsAuthenticated};
}

export default function App() {
    const {isAuthenticated} = useAuth();

    return (
        <Router>
            <div className="min-h-screen bg-slate-50">
                <Routes>
                    <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
                    <Route path="/signup" element={!isAuthenticated ? <SignupPage /> : <Navigate to="/dashboard" />} />
                    <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
                        <Route path="dashboard" element={<Dashboard />} />
                        {/*<Route path="trip/:id" element={<TripDetail />} />*/}
                        {/*<Route path="recommendations" element={<Recommendations />} />*/}
                        {/*<Route path="deals" element={<Deals />} />*/}
                        {/*<Route path="settings" element={<Settings />} />*/}
                        <Route index element={<Navigate to="/dashboard" />} />
                    </Route>
                </Routes>
            </div>
        </Router>
    )
}