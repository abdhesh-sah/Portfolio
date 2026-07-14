import { useState } from "react";
import { useTestimonials } from "#src/hooks/use-portfolio";
import { apiFetch } from "#src/lib/api-helpers";
import { clearQueryCache } from "#src/lib/query-cache-persister";
import type { Testimonial } from "#shared/schema";
import { useToast } from "#src/hooks/use-toast";
import {
    Quote, Plus, Trash2, Edit3, X, User,
    Building2, Briefcase,
    Save, Hash, Users, MessageSquareQuote, Mail
} from "lucide-react";
import { Linkedin } from "#src/components/icons/brand-icons";
import { motion, AnimatePresence } from "framer-motion";
import { FormField, FormTextarea, EmptyState, AdminButton, LoadingSkeleton, FormSelect } from "#src/components/admin/AdminShared";
import { OptimizedImage } from "#src/components/OptimizedImage";

function TestimonialRequestModal({ onClose }: { onClose: () => void }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ clientName: "", clientEmail: "", projectTitle: "" });

    async function send() {
        setLoading(true);
        try {
            await apiFetch("/api/v1/testimonials/request", {
                method: "POST",
                body: JSON.stringify(data),
            });
            toast({ title: "Request Sent", description: `Testimonial request sent to ${data.clientEmail}` });
            onClose();
        } catch (_err) {
            toast({ title: "Failed to send request", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md nm-flat p-8 rounded-3xl space-y-8"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[var(--admin-text-primary)] uppercase italic tracking-tighter">
                        Request_Testimonial
                    </h3>
                    <AdminButton onClick={onClose} variant="secondary" icon={X} size="sm" className="nm-button w-10 h-10 rounded-xl" />
                </div>

                <div className="space-y-6">
                    <FormField label="Client_Name" value={data.clientName} onChange={(v) => setData(d => ({ ...d, clientName: v }))} placeholder="Identity" />
                    <FormField label="Client_Email" value={data.clientEmail} onChange={(v) => setData(d => ({ ...d, clientEmail: v }))} placeholder="protocol@domain.com" />
                    <FormField label="Project_Context" value={data.projectTitle} onChange={(v) => setData(d => ({ ...d, projectTitle: v }))} placeholder="Project Name" />
                </div>

                <AdminButton 
                    onClick={send} 
                    variant="primary" 
                    icon={Mail} 
                    disabled={loading || !data.clientEmail}
                    className="nm-button nm-button-primary w-full h-14 text-[10px] font-black uppercase tracking-widest"
                >
                    {loading ? "Transmitting..." : "Send_Invitation"}
                </AdminButton>
            </motion.div>
        </div>
    );
}

const empty = {
    name: "",
    role: "",
    company: "",
    quote: "",
    relationship: "Colleague",
    avatarUrl: "",
    linkedinUrl: "",
    displayOrder: 0,
};

import type { AdminTabProps } from "./types";

export function TestimonialsTab(_props: AdminTabProps) {
    const { data: testimonials, refetch } = useTestimonials();
    const { toast } = useToast();
    const [editing, setEditing] = useState<(typeof empty & { id?: number }) | null>(null);
    const [requestModal, setRequestModal] = useState(false);

    function startCreate() {
        setEditing({ ...empty });
    }

    function startEdit(t: Testimonial) {
        setEditing({
            id: t.id,
            name: t.name,
            role: t.role,
            company: t.company ?? "",
            quote: t.quote,
            relationship: t.relationship ?? "Colleague",
            avatarUrl: t.avatarUrl ?? "",
            linkedinUrl: t.linkedinUrl ?? "",
            displayOrder: t.displayOrder ?? 0,
        });
    }

    async function save() {
        if (!editing) return;
        try {
            const body = {
                name: editing.name,
                role: editing.role,
                company: editing.company,
                quote: editing.quote,
                relationship: editing.relationship,
                avatarUrl: editing.avatarUrl || null,
                linkedinUrl: editing.linkedinUrl || null,
                displayOrder: editing.displayOrder,
            };

            if (editing.id) {
                await apiFetch(`/api/v1/testimonials/${editing.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(body),
                });
                toast({ title: "Endorsement updated" });
            } else {
                await apiFetch("/api/v1/testimonials", {
                    method: "POST",
                    body: JSON.stringify(body),
                });
                toast({ title: "New endorsement registered" });
            }

            setEditing(null);
            clearQueryCache();
            refetch();
        } catch (_err: unknown) {
            toast({ title: "Registration failed", variant: "destructive" });
        }
    }

    async function remove(id: number) {
        if (!confirm("Remove this endorsement permanentely?")) return;
        try {
            await apiFetch(`/api/v1/testimonials/${id}`, { method: "DELETE" });
            toast({ title: "Endorsement removed" });
            clearQueryCache();
            refetch();
        } catch (_err: unknown) {
            toast({ title: "Purge failed", variant: "destructive" });
        }
    }

    if (!testimonials) return (
        <div className="space-y-10">
            {[1, 2].map(i => <LoadingSkeleton key={i} />)}
        </div>
    );

    if (editing) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 nm-inset rounded-2xl flex items-center justify-center text-indigo-500">
                            <MessageSquareQuote size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-[var(--admin-text-primary)] tracking-tighter uppercase italic">
                                {editing.id ? "Edit_Endorsement" : "New_Endorsement"}
                            </h2>
                            <p className="text-[var(--admin-text-secondary)] text-[10px] font-bold uppercase tracking-[0.3em] ml-1">
                                Protocol: {editing.id ? `REF_${editing.id}` : "Allocation"}
                            </p>
                        </div>
                    </div>
                    <AdminButton
                        onClick={() => setEditing(null)}
                        variant="secondary"
                        icon={X}
                        className="nm-button h-12 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-secondary)] hover:text-rose-500"
                    >
                        Abort_Entry
                    </AdminButton>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-10">
                    <div className="nm-flat p-8 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                            label="Contact_Name *"
                            value={editing.name}
                            onChange={(v) => setEditing(prev => prev ? { ...prev, name: v } : null)}
                            required
                            placeholder="FULL IDENTITY"
                        />
                        <FormField
                            label="Professional_Role *"
                            value={editing.role}
                            onChange={(v) => setEditing(prev => prev ? { ...prev, role: v } : null)}
                            required
                            placeholder="E.G. SENIOR ENGINEER"
                        />
                        <FormField
                            label="Organization"
                            value={editing.company}
                            onChange={(v) => setEditing(prev => prev ? { ...prev, company: v } : null)}
                            placeholder="COMPANY_NAME"
                        />
                        <FormSelect
                            label="Association_Type"
                            value={editing.relationship}
                            onChange={(v) => setEditing(prev => prev ? { ...prev, relationship: v } : null)}
                            options={[
                                { label: "COLLEAGUE", value: "Colleague" },
                                { label: "MENTOR", value: "Mentor" },
                                { label: "CLIENT", value: "Client" },
                                { label: "MANAGER", value: "Manager" },
                                { label: "SOCIAL_CONN", value: "Friend" }
                            ]}
                            icon={<Users size={18} />}
                        />
                    </div>

                    <div className="nm-flat p-8 rounded-3xl space-y-8">
                        <FormTextarea
                            label="Endorsement_Payload *"
                            value={editing.quote}
                            onChange={(v) => setEditing(prev => prev ? { ...prev, quote: v } : null)}
                            required
                            placeholder="VERBATIM QUOTE..."
                        />
                    </div>

                    <div className="nm-flat p-8 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                            label="Identity_Asset_URL"
                            value={editing.avatarUrl}
                            onChange={(v) => setEditing(prev => prev ? { ...prev, avatarUrl: v } : null)}
                            placeholder="HTTPS://..."
                        />
                        <FormField
                            label="LinkedIn_Access"
                            value={editing.linkedinUrl}
                            onChange={(v) => setEditing(prev => prev ? { ...prev, linkedinUrl: v } : null)}
                            placeholder="HTTPS://LINKEDIN.COM/..."
                        />
                        <div className="md:col-span-2">
                            <FormField
                                label="Priority_Index"
                                type="number"
                                value={editing.displayOrder.toString()}
                                onChange={(v) => setEditing(prev => prev ? { ...prev, displayOrder: parseInt(v) || 0 } : null)}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <AdminButton
                        type="submit"
                        variant="primary"
                        icon={Save}
                        disabled={!editing.name || !editing.quote || !editing.role}
                        className="nm-button nm-button-primary w-full h-16 text-[12px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 disabled:opacity-40"
                    >
                        {editing.id ? "SYNC_ENDORSEMENT" : "COMMIT_ENTRY"}
                    </AdminButton>
                </form>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-700 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 nm-inset rounded-xl flex items-center justify-center text-indigo-500">
                            <Users size={20} strokeWidth={3} />
                        </div>
                        <h1 className="text-4xl font-black text-[var(--admin-text-primary)] tracking-tighter uppercase italic">
                            Distinctions
                        </h1>
                    </div>
                    <p className="text-[var(--admin-text-secondary)] text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 ml-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        Endorsements_Secured: {testimonials?.length ?? 0}
                    </p>
                </div>

                <div className="flex gap-4">
                    <AdminButton
                        onClick={() => setRequestModal(true)}
                        variant="secondary"
                        icon={Mail}
                        className="nm-button h-14 px-8 text-[12px] font-black uppercase tracking-[0.25em] text-indigo-400"
                    >
                        Request
                    </AdminButton>
                    <AdminButton
                        onClick={startCreate}
                        variant="primary"
                        icon={Plus}
                        className="nm-button nm-button-primary h-14 px-10 text-[12px] font-black uppercase tracking-[0.25em]"
                    >
                        New_Entry
                    </AdminButton>
                </div>
            </div>

            <AnimatePresence>
                {requestModal && <TestimonialRequestModal onClose={() => setRequestModal(false)} />}
            </AnimatePresence>

            {/* List */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {(!testimonials || testimonials.length === 0) && (
                    <div className="xl:col-span-2 nm-flat p-24 text-center">
                        <EmptyState
                            icon={Quote}
                            text="No endorsement packets detected. Initialize new entry record."
                        />
                    </div>
                )}

                <AnimatePresence>
                    {testimonials?.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="nm-flat p-6 rounded-3xl flex flex-col gap-6 relative group overflow-hidden border border-transparent hover:border-indigo-500/10 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 nm-inset rounded-2xl flex items-center justify-center text-indigo-500/40 relative overflow-hidden">
                                        {t.avatarUrl ? (
                                            <OptimizedImage 
                                              src={t.avatarUrl} 
                                              alt={t.name} 
                                              className="w-full h-full object-cover" 
                                              width={56}
                                              height={56}
                                            />
                                        ) : (
                                            <User size={24} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-black text-[var(--admin-text-primary)] uppercase tracking-tight truncate">
                                            {t.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold text-[var(--admin-text-muted)] uppercase flex items-center gap-1">
                                                <Briefcase size={10} />
                                                {t.role}
                                            </span>
                                            {t.company && (
                                                <span className="text-[9px] font-bold text-indigo-400/60 uppercase flex items-center gap-1">
                                                    <Building2 size={10} />
                                                    {t.company}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <AdminButton
                                        onClick={() => startEdit(t)}
                                        variant="secondary"
                                        icon={Edit3}
                                        size="sm"
                                        className="w-10 h-10 nm-button rounded-xl text-indigo-500 flex items-center justify-center hover:scale-110 transition-transform"
                                        title="Edit"
                                    >
                                    </AdminButton>
                                    <AdminButton
                                        onClick={() => remove(t.id)}
                                        variant="secondary"
                                        icon={Trash2}
                                        size="sm"
                                        className="w-10 h-10 nm-button rounded-xl text-rose-500 flex items-center justify-center hover:scale-110 transition-transform"
                                        title="Purge"
                                    >
                                    </AdminButton>
                                </div>
                            </div>

                            <p className="text-sm text-[var(--admin-text-secondary)] font-medium leading-relaxed bg-[var(--nm-bg)]/50 p-5 rounded-2xl nm-inset italic line-clamp-3">
                                "{t.quote}"
                            </p>

                            <div className="flex items-center justify-between mt-auto pt-2">
                                <div className="flex gap-3">
                                    <span className="text-[8px] font-black px-3 py-1 rounded-full nm-inset text-indigo-500 uppercase tracking-widest">
                                        {t.relationship}
                                    </span>
                                    {t.linkedinUrl && (
                                        <a href={t.linkedinUrl} target="_blank" rel="noopener noreferrer" className="nm-inset w-6 h-6 rounded-lg flex items-center justify-center text-indigo-400 hover:text-indigo-500">
                                            <Linkedin size={10} />
                                        </a>
                                    )}
                                </div>
                                <span className="text-[9px] font-black text-[var(--admin-text-muted)] uppercase flex items-center gap-1.5 opacity-50">
                                    <Hash size={10} />
                                    IDX_{t.displayOrder}
                                </span>
                            </div>

                            {/* Decorative background quote */}
                            <div className="absolute -right-4 -bottom-4 opacity-[0.02] text-indigo-500 pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                                <Quote size={120} strokeWidth={1} />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
