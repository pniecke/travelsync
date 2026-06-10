import {useEffect} from 'react';
import {useRouter} from 'next/router';
import {useAuth} from '@/context/AuthProvider';
import {consumeReturnUrl} from '@/utils/returnUrl';

export default function Index() {
    const {user, loading} = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading || router.pathname !== '/') return;

        if (!user) {
            router.replace('/login');
        } else {
            // Google OAuth lands back on "/"; honor a stashed invite/return path.
            router.replace(consumeReturnUrl() ?? '/dashboard');
        }
    }, [user, loading, router]);

    return <p>Loading…</p>;
}