import React from "react";
import Link from "next/link";
import {Compass, Home} from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
                    <div className="flex items-center justify-center mb-6">
                        <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center">
                            <Compass className="w-7 h-7 text-sky-500" aria-hidden="true"/>
                        </div>
                    </div>

                    <p className="text-5xl font-bold text-slate-800 mb-2">404</p>
                    <h1 className="text-lg font-semibold text-slate-800 mb-2">
                        This page took a wrong turn
                    </h1>
                    <p className="text-sm text-slate-600 mb-6">
                        We couldn&#39;t find the page you&#39;re looking for. It may have been moved,
                        or the link might be out of date.
                    </p>

                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 w-full bg-sky-500 text-white py-2 px-4 rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-colors"
                    >
                        <Home className="w-4 h-4" aria-hidden="true"/>
                        Back to dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
