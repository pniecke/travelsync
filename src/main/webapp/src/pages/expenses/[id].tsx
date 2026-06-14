'use client'

import {GetServerSideProps} from "next";
import {useRouter} from "next/router";
import Link from "next/link";
import {useRef, useState} from "react";
import {
    ArrowLeft,
    Calendar,
    FileText,
    Loader2,
    Paperclip,
    Pencil,
    Receipt,
    Trash2,
    Upload,
    User as UserIcon,
} from "lucide-react";
import {createServerApiClient} from "@/services/apiClient";
import {getLoggedInUser} from "@/services/userService";
import {getTripById} from "@/services/tripService";
import {
    deleteExpense,
    deleteReceipt,
    getExpense,
    receiptUrl,
    uploadReceipt,
} from "@/services/expenseService";
import {Expense, ExpenseShareType, Trip, User} from "@/types";
import {formatDate, formatRelative} from "@/utils/date";
import ExpenseEditDialog from "@/components/ExpenseEditDialog";

interface PageProps {
    user: User;
    expense: Expense;
    trip: Trip;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
    const cookieHeader = ctx.req.headers.cookie;
    if (!cookieHeader) {
        return {redirect: {destination: '/login', permanent: false}};
    }
    const expenseId = ctx.params?.id as string | undefined;
    if (!expenseId) {
        return {notFound: true};
    }
    const ssrClient = createServerApiClient(cookieHeader);
    try {
        const user = await getLoggedInUser(ssrClient);
        const expense = await getExpense(expenseId, ssrClient);
        const trip = await getTripById(expense.tripId, ssrClient);
        return {props: {user, expense, trip}};
    } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 403) return {notFound: true};
        console.error("Error loading expense detail:", e);
        return {redirect: {destination: '/login', permanent: false}};
    }
};

const userLabel = (u?: User): string => u?.firstName || u?.username || "Unknown";

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];

const isImageReceipt = (filename?: string): boolean => {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return IMAGE_EXTENSIONS.includes(ext);
};

const SHARE_TYPE_LABEL: Record<ExpenseShareType, string> = {
    [ExpenseShareType.Equal]: 'Split equally',
    [ExpenseShareType.Exact]: 'Exact amounts',
    [ExpenseShareType.Percent]: 'By percentage',
};

export default function ExpenseDetailPage({user, expense: initialExpense, trip}: PageProps) {
    const router = useRouter();
    const [expense, setExpense] = useState<Expense>(initialExpense);
    const [editOpen, setEditOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [receiptBusy, setReceiptBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Bump on every receipt change so the <img> bypasses the browser cache.
    const [receiptVersion, setReceiptVersion] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isCreator = !!expense.createdBy?.id && expense.createdBy.id === user.id;
    const tripId = expense.tripId;

    const total = expense.amount || 0;
    const shares = expense.shares ?? [];
    const shareType = shares[0]?.shareType;

    const handleDelete = async () => {
        if (!expense.id) return;
        if (!confirm("Delete this expense? This cannot be undone.")) return;
        setBusy(true);
        setError(null);
        try {
            await deleteExpense(expense.id);
            await router.push(`/trips/${tripId}?tab=expenses`);
        } catch {
            setError("Failed to delete expense.");
            setBusy(false);
        }
    };

    const handleFilePicked = async (file: File | undefined) => {
        if (!file || !expense.id) return;
        setReceiptBusy(true);
        setError(null);
        try {
            const updated = await uploadReceipt(expense.id, file);
            setExpense(updated);
            setReceiptVersion(v => v + 1);
        } catch (err: unknown) {
            const apiMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(apiMessage || "Failed to upload receipt.");
        } finally {
            setReceiptBusy(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveReceipt = async () => {
        if (!expense.id) return;
        if (!confirm("Remove this receipt?")) return;
        setReceiptBusy(true);
        setError(null);
        try {
            const updated = await deleteReceipt(expense.id);
            setExpense(updated);
            setReceiptVersion(v => v + 1);
        } catch {
            setError("Failed to remove receipt.");
        } finally {
            setReceiptBusy(false);
        }
    };

    const src = expense.id ? `${receiptUrl(expense.id)}?v=${receiptVersion}` : '';
    const hasReceipt = !!expense.receiptFilename;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Back link */}
            <Link
                href={`/trips/${tripId}?tab=expenses`}
                className="inline-flex items-center text-sm text-gray-400 hover:text-gray-200 mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1"/>
                Back to {trip.name || trip.destination}
            </Link>

            {/* Header */}
            <div className="mb-6 pl-4 border-l-4 border-blue-500">
                <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-100">
                        {expense.description || "Untitled expense"}
                    </h1>
                    <span className="shrink-0 text-2xl font-bold text-gray-100 tabular-nums">
                        {total.toFixed(2)} {expense.currency}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                    <Link
                        href={`/trips/${tripId}?tab=expenses`}
                        className="flex items-center hover:text-gray-200 transition-colors"
                    >
                        <Receipt className="w-4 h-4 mr-1"/>
                        {trip.name || trip.destination}
                    </Link>
                    <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1"/>
                        {formatDate(expense.dateOfExpense)}
                    </span>
                    <span className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1"/>
                        Paid by {userLabel(expense.paidBy)}
                        {expense.paidBy?.id === user.id && " (You)"}
                    </span>
                    {hasReceipt && (
                        <span className="flex items-center text-blue-400">
                            <Paperclip className="w-4 h-4 mr-1"/>
                            Receipt attached
                        </span>
                    )}
                </div>
            </div>

            {/* Action bar */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
                {isCreator ? (
                    <>
                        <button
                            onClick={() => setEditOpen(true)}
                            disabled={busy}
                            className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg text-sm transition-colors"
                        >
                            <Pencil className="w-4 h-4 mr-2"/>
                            Edit
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={busy}
                            className="flex items-center px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors ml-auto"
                        >
                            <Trash2 className="w-4 h-4 mr-2"/>
                            Delete
                        </button>
                    </>
                ) : (
                    <p className="text-sm text-gray-500 italic">
                        Only {userLabel(expense.createdBy)} (who created this expense) can edit or delete it.
                    </p>
                )}
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Split breakdown */}
                <div className="lg:col-span-2 bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-100">Split breakdown</h2>
                        {shareType && (
                            <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                                {SHARE_TYPE_LABEL[shareType]}
                            </span>
                        )}
                    </div>

                    {shares.length === 0 ? (
                        <p className="text-gray-400 text-sm">No split recorded for this expense.</p>
                    ) : (
                        <div className="space-y-3">
                            {shares.map(share => {
                                const pct = total > 0 ? (share.amount / total) * 100 : 0;
                                const isYou = share.user.id === user.id;
                                return (
                                    <div key={share.user.id ?? share.user.username}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-gray-200">
                                                {userLabel(share.user)}
                                                {isYou && <span className="text-blue-400"> (You)</span>}
                                            </span>
                                            <span className="tabular-nums text-gray-300">
                                                {share.amount.toFixed(2)} {expense.currency}
                                                <span className="text-gray-500 ml-2">{pct.toFixed(0)}%</span>
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-gray-700 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isYou ? 'bg-blue-500' : 'bg-gray-500'}`}
                                                style={{width: `${Math.min(100, Math.max(0, pct))}%`}}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-700 text-sm font-semibold">
                                <span className="text-gray-200">Total</span>
                                <span className="tabular-nums text-gray-100">
                                    {total.toFixed(2)} {expense.currency}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Meta */}
                    <dl className="grid grid-cols-2 gap-y-2 gap-x-4 mt-6 pt-6 border-t border-gray-700 text-sm">
                        <dt className="text-gray-400">Created by</dt>
                        <dd className="text-gray-200 text-right">{userLabel(expense.createdBy)}</dd>
                        {expense.lastModified && (
                            <>
                                <dt className="text-gray-400">Last modified</dt>
                                <dd className="text-gray-200 text-right">{formatRelative(expense.lastModified)}</dd>
                            </>
                        )}
                    </dl>
                </div>

                {/* Receipt */}
                <div className="bg-gray-800 rounded-xl shadow-md border border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-100 mb-4">Receipt</h2>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFilePicked(e.target.files?.[0])}
                    />

                    {hasReceipt ? (
                        <div className="space-y-3">
                            <a href={src} target="_blank" rel="noopener noreferrer" className="block">
                                {isImageReceipt(expense.receiptFilename) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={src}
                                        alt={expense.receiptFilename ?? "Receipt"}
                                        className="w-full rounded-lg border border-gray-700 object-contain max-h-72 bg-gray-900 hover:border-blue-500 transition-colors"
                                    />
                                ) : (
                                    <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 bg-gray-900 hover:border-blue-500 transition-colors">
                                        <FileText className="w-8 h-8 text-gray-400 shrink-0"/>
                                        <span className="text-sm text-gray-200 truncate">
                                            {expense.receiptFilename}
                                        </span>
                                    </div>
                                )}
                            </a>
                            <p className="text-xs text-gray-500 truncate">{expense.receiptFilename}</p>
                            {isCreator && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={receiptBusy}
                                        className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-100 rounded-lg text-sm transition-colors"
                                    >
                                        {receiptBusy
                                            ? <Loader2 className="w-4 h-4 animate-spin"/>
                                            : <><Upload className="w-4 h-4 mr-2"/>Replace</>}
                                    </button>
                                    <button
                                        onClick={handleRemoveReceipt}
                                        disabled={receiptBusy}
                                        className="flex items-center justify-center px-3 py-2 bg-gray-700 hover:bg-red-700/50 disabled:opacity-50 text-gray-100 rounded-lg text-sm transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            {isCreator ? (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={receiptBusy}
                                    className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-600 hover:border-blue-500 disabled:opacity-50 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    {receiptBusy ? (
                                        <Loader2 className="w-6 h-6 animate-spin"/>
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6"/>
                                            <span className="text-sm">Upload a receipt</span>
                                            <span className="text-xs text-gray-500">JPEG, PNG, WebP, HEIC or PDF · up to 10 MB</span>
                                        </>
                                    )}
                                </button>
                            ) : (
                                <p className="text-sm text-gray-500">No receipt attached.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isCreator && (
                <ExpenseEditDialog
                    isOpen={editOpen}
                    onCloseAction={() => setEditOpen(false)}
                    user={user}
                    trip={trip}
                    expense={expense}
                    onSavedAction={(updated) => setExpense(updated)}
                />
            )}
        </div>
    );
}
