import React, { useState, useEffect } from "react";
import { useMessages } from "#src/hooks/use-portfolio";
import { useToast } from "#src/hooks/use-toast";

import { RichTextEditor } from "#src/components/admin/LazyRichTextEditor";
import { apiFetch } from "#src/lib/api-helpers";
import { queryClient } from "#src/lib/queryClient";
import { EmptyState, LoadingSkeleton, AdminButton, FloatingLabelInput } from "#src/components/admin/AdminShared";
import type { Message, EmailTemplate } from "#shared/schema";
import { Mail, Search, RefreshCw, Trash2, Reply, Send, X, Check, MessageSquare, User, Clock, ChevronRight, Plus, Paperclip } from "lucide-react";
import { cn } from "#src/lib/utils";
import { formatDate } from "#src/lib/utils/date";
import { QUERY_KEYS } from "#src/lib/query-keys";

export function MessagesTab() {
    const [limit, setLimit] = useState(50);
    const { data: messagesData, isLoading } = useMessages(limit);
    const messages = messagesData ?? [];
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} messages?`)) return;
        try {
            await apiFetch("/api/v1/messages/bulk-delete", {
                method: "POST",
                body: JSON.stringify({ ids: selectedIds })
            });
            toast({ title: "Messages deleted" });
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.all });
        } catch (err: unknown) {
            toast({ title: "Bulk delete failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
        }
    };

    const deleteMessage = async (id: number) => {
        if (!confirm("Delete this message?")) return;
        try {
            await apiFetch(`/api/v1/messages/${id}`, { method: "DELETE" });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.all });
            toast({ title: "Message deleted" });
        } catch (err: unknown) {
            toast({ title: "Delete failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
        }
    };

    if (isLoading) return <LoadingSkeleton />;

    const filtered = messages.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.subject?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-700">
            {/* Header / Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 nm-flat p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl nm-inset flex items-center justify-center text-nm-accent">
                        <Mail size={32} />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold text-admin-text-primary tracking-tighter font-display">
                            Inbox
                        </h2>
                        <div className="flex items-center gap-3">
                            <p className="text-xs text-admin-text-secondary font-bold uppercase tracking-[0.2em]">
                                Communications
                            </p>
                            <span className="w-1 h-1 rounded-full bg-admin-text-secondary/20" />
                            <span className="px-2 py-0.5 rounded-md nm-inset text-[10px] font-black text-nm-accent">
                                {messages.length} TOTAL
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-6 md:mt-0">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="SEARCH INBOX..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-14 pl-12 pr-6 nm-inset rounded-2xl text-[10px] font-black tracking-widest focus:outline-none w-64 transition-all focus:w-80 group-hover:nm-flat"
                        />
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-nm-accent/50" />
                    </div>
                    <AdminButton
                        onClick={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messages.all })}
                        variant="secondary"
                        icon={RefreshCw}
                        className="w-14 h-14 rounded-2xl nm-button flex items-center justify-center text-admin-text-secondary hover:text-nm-accent"
                        title="Refresh Messages"
                    >
                    </AdminButton>
                </div>
            </div>

            {!filtered.length ? (
                <div className="nm-flat p-20 rounded-[3rem] text-center border border-[var(--nm-light)] overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <MessageSquare size={200} />
                    </div>
                    <EmptyState icon={Mail} text={searchQuery ? "No matches found in your archives." : "Inbox clean. No incoming transmissions yet."} />
                </div>
            ) : (
                <div className="space-y-6 pb-24">
                    {filtered.map((msg, index) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "nm-flat p-6 rounded-3xl flex flex-col md:flex-row md:items-start gap-6 group transition-all duration-500 border border-[var(--nm-light)] animate-in slide-in-from-bottom-4",
                                selectedIds.includes(msg.id) ? "nm-inset border-nm-accent/20" : "hover:nm-inset hover:border-[var(--nm-light)]/20"
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Selector */}
                            <div className="flex items-center self-start pt-1">
                                <AdminButton
                                    variant={selectedIds.includes(msg.id) ? "primary" : "secondary"}
                                    icon={Check}
                                    size="sm"
                                    className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                                        selectedIds.includes(msg.id)
                                            ? "bg-nm-accent text-[var(--admin-text-primary)] shadow-lg"
                                            : "nm-inset text-transparent hover:text-admin-text-secondary hover:nm-flat"
                                    )}
                                    onClick={() => toggleSelect(msg.id)}
                                >
                                </AdminButton>
                            </div>

                            <div className="flex-1 min-w-0 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full nm-inset flex items-center justify-center text-admin-text-secondary">
                                            <User size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-admin-text-primary text-base truncate tracking-tight">{msg.name}</h4>
                                            <p className="text-xs text-nm-accent font-medium">{msg.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-admin-text-secondary/40 font-black uppercase tracking-widest">
                                        <Clock size={12} />
                                        {formatDate(msg.createdAt, { includeTime: true, month: 'short', day: 'numeric' })}
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl nm-inset bg-transparent group-hover:nm-flat transition-all">
                                    {msg.subject && (
                                        <h5 className="text-sm font-bold text-admin-text-primary mb-2 flex items-center gap-2 italic">
                                            <span className="w-1.5 h-1.5 rounded-full bg-nm-accent" />
                                            {msg.subject}
                                        </h5>
                                    )}
                                    <p className="text-sm text-admin-text-secondary leading-relaxed break-words whitespace-pre-wrap">
                                        {msg.message}
                                    </p>
                                    {msg.attachmentUrl && (
                                        <div className="mt-3 pt-3 border-t border-[var(--nm-light)]">
                                            <a
                                                href={msg.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl nm-flat hover:nm-inset transition-all text-nm-accent text-xs font-bold uppercase tracking-widest"
                                            >
                                                <Paperclip size={14} />
                                                {msg.attachmentName || "View Attachment"}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex md:flex-col gap-3 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 md:ml-4 translate-x-2 group-hover:translate-x-0 self-center">
                                <ReplyDialog message={msg} />
                                <AdminButton
                                    onClick={() => deleteMessage(msg.id)}
                                    variant="secondary"
                                    icon={Trash2}
                                    className="w-12 h-12 rounded-xl nm-button flex items-center justify-center text-admin-text-secondary hover:text-rose-500 transition-colors"
                                    title="Discard Transmission"
                                >
                                </AdminButton>
                            </div>
                        </div>
                    ))}
                    
                    {filtered.length >= limit && (
                        <div className="flex justify-center mt-10">
                            <AdminButton
                                onClick={() => setLimit(l => l + 50)}
                                variant="secondary"
                                className="px-10 h-12 rounded-xl nm-button text-admin-text-secondary hover:text-nm-accent transition-colors font-bold text-xs uppercase tracking-widest"
                            >
                                Load Older Transmissions
                            </AdminButton>
                        </div>
                    )}
                </div>
            )}

            {/* Bulk Selection Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-[calc(50%+140px)] -translate-x-1/2 z-50 nm-flat bg-admin-bg/95 border border-[var(--nm-light)] rounded-[2rem] shadow-2xl px-10 py-5 flex items-center gap-10 animate-in slide-in-from-bottom-10 fade-in backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl nm-inset flex items-center justify-center text-rose-500 animate-pulse">
                            <Trash2 size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-black text-admin-text-primary tracking-tighter leading-none">{selectedIds.length} Selected</span>
                            <span className="text-[10px] text-admin-text-secondary uppercase tracking-[0.2em] font-black mt-1">Bulk Management</span>
                        </div>
                    </div>

                    <div className="h-10 w-px nm-inset" />

                    <div className="flex items-center gap-4">
                        <AdminButton
                            variant="secondary"
                            className="px-8 h-12 rounded-xl nm-button bg-rose-500 text-[var(--admin-text-primary)] font-bold text-xs uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                            onClick={handleBulkDelete}
                        >
                            Delete Transmissions
                        </AdminButton>
                        <AdminButton
                            variant="secondary"
                            icon={X}
                            className="w-12 h-12 rounded-xl nm-button text-admin-text-secondary hover:text-admin-text-primary transition-colors flex items-center justify-center"
                            onClick={() => setSelectedIds([])}
                        >
                        </AdminButton>
                    </div>
                </div>
            )}
        </div>
    );
}

function ReplyDialog({ message }: { message: Message }) {
    const [open, setOpen] = useState(false);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [subject, setSubject] = useState(`Re: ${message.subject || "Message from Portfolio"}`);
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            apiFetch("/api/v1/email-templates")
                .then(setTemplates)
                .catch(() => setTemplates([]));
        }
    }, [open]);

    const handleApplyTemplate = (tpl: EmailTemplate) => {
        const processedBody = tpl.body.replace(/{name}/g, message.name);
        setSubject(tpl.subject.replace(/{name}/g, message.name));
        setBody(processedBody);
    };

    const handleSend = async () => {
        if (!body) return toast({ title: "Body is required", variant: "destructive" });
        setSending(true);
        try {
            await apiFetch(`/api/v1/messages/${message.id}/reply`, {
                method: "POST",
                body: JSON.stringify({ subject, body }),
            });
            toast({ title: "Reply sent successfully" });
            setOpen(false);
        } catch (err: unknown) {
            toast({ title: "Failed to send reply", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    if (!open) return (
        <AdminButton
            onClick={() => setOpen(true)}
            variant="secondary"
            icon={Reply}
            className="w-12 h-12 rounded-xl nm-button flex items-center justify-center text-nm-accent transition-all hover:scale-110 active:scale-95"
            title="Reply"
        >
        </AdminButton>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-admin-bg/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-5xl nm-flat rounded-[3rem] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 duration-500 border border-[var(--nm-light)] shadow-2xl">
                {/* Modal Header */}
                <div className="p-8 flex items-center justify-between border-b border-[var(--nm-light)] nm-flat">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl nm-inset flex items-center justify-center text-nm-accent">
                            <Reply size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-admin-text-primary tracking-tight font-display">Reply Transmission</h3>
                            <p className="text-xs text-admin-text-secondary font-medium mt-1">Responding to <span className="text-nm-accent font-bold">{message.name}</span></p>
                        </div>
                    </div>
                    <AdminButton
                        onClick={() => setOpen(false)}
                        variant="secondary"
                        icon={X}
                        className="w-12 h-12 rounded-2xl nm-button flex items-center justify-center text-admin-text-secondary hover:text-rose-500 transition-colors"
                    >
                    </AdminButton>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 h-[600px]">
                    {/* Templates Sidebar */}
                    <div className="lg:col-span-1 p-8 nm-flat border-r border-[var(--nm-light)] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg nm-inset flex items-center justify-center text-nm-accent">
                                <Plus size={16} />
                            </div>
                            <p className="text-[10px] font-black text-admin-text-secondary uppercase tracking-[0.2em]">Templates</p>
                        </div>
                        <div className="space-y-4">
                            {templates.length === 0 ? (
                                <div className="p-6 rounded-2xl nm-inset text-center opacity-40">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No stored protocols</p>
                                </div>
                            ) : (
                                templates.map(tpl => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => handleApplyTemplate(tpl)}
                                        className="w-full text-left p-4 rounded-2xl nm-button group transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-black text-admin-text-primary uppercase tracking-tight truncate group-hover:text-nm-accent transition-colors">{tpl.name}</p>
                                            <ChevronRight size={12} className="text-admin-text-secondary opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-4px] group-hover:translate-x-0" />
                                        </div>
                                        <p className="text-[10px] text-admin-text-secondary/60 line-clamp-1 italic">{tpl.subject}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Compose Area */}
                    <div className="lg:col-span-3 p-10 flex flex-col nm-inset bg-transparent gap-8 overflow-y-auto custom-scrollbar">
                        <FloatingLabelInput label="COMM_SUBJECT" value={subject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)} placeholder="Transmission Subject..." />

                        <div className="flex-1 flex flex-col space-y-3">
                            <label className="block text-[10px] font-black text-admin-text-secondary uppercase tracking-[0.25em] ml-1">COMM_CONTENT</label>
                            <div className="flex-1 rounded-3xl nm-flat p-1 overflow-hidden transition-all focus-within:nm-inset">
                                <RichTextEditor value={body} onChange={setBody} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-6 pt-4">
                            <AdminButton
                                onClick={() => setOpen(false)}
                                variant="secondary"
                                className="px-10 h-14 rounded-2xl nm-button text-admin-text-secondary font-black text-[12px] uppercase tracking-[0.2em]"
                            >
                                Discard_Draft
                            </AdminButton>
                            <AdminButton
                                onClick={handleSend}
                                isLoading={sending}
                                variant="primary"
                                icon={!sending ? Send : undefined}
                                disabled={!body}
                                className="nm-button nm-button-primary px-12 h-14 font-black text-[12px] uppercase tracking-[0.25em] flex items-center gap-3 disabled:opacity-50 disabled:grayscale transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <span>{sending ? "TRANSMITTING..." : "SEND_PROTOCOL"}</span>
                            </AdminButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
