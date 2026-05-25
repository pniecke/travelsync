import {GetServerSideProps} from "next";

// Legacy URL — the balances view is now a tab on the trip detail page.
// Preserve old links (notifications, bookmarks) by redirecting here.
export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const tripId = ctx.params?.id as string | undefined;
    if (!tripId) {
        return {notFound: true};
    }
    return {
        redirect: {
            destination: `/trips/${tripId}?tab=balances`,
            permanent: false,
        },
    };
};

export default function LegacyTripBalancesRedirect() {
    return null;
}
