import {useEffect} from 'react';
import {useRouter} from 'next/router';
import {useAuth} from '@/context/AuthProvider';

export default function Index() {
    const {user, loading} = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading || router.pathname !== '/') return;

        if (!user) {
            router.replace('/login');
        } else {
            router.replace('/dashboard');
        }
    }, [user, loading, router]);

    return <p>Loading…</p>;
}