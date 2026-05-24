import type {AppProps} from 'next/app';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import '@/app/globals.css';
import {AuthProvider} from '@/context/AuthProvider';
import {AnimatedBackground} from "@/components/AnimatedBackground";
import NavBar from "@/components/NavBar";

const queryClient = new QueryClient();

export default function MyApp({Component, pageProps}: AppProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <div className="relative min-h-screen">
                    <AnimatedBackground/>
                    <div className="relative z-10">
                        <NavBar/>
                        <Component {...pageProps} />
                    </div>
                </div>
            </AuthProvider>
        </QueryClientProvider>
    );
}
