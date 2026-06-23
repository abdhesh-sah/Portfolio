import React, { useState, type FormEvent } from "react";
import { useSkills, useAdminSkills } from "#src/hooks/use-portfolio";
import { FormField, FormTextarea, EmptyState, FormSelect, AdminButton } from "#src/components/admin/AdminShared";
import { Plus, Trash2, Edit3, X, Check, Zap, Cpu, Code, Layers } from "lucide-react";
import { cn } from "#src/lib/utils";
import type { Skill } from "#shared/schema";

const emptySkill = { name: "", category: "", status: "Core" as "Core" | "Advanced" | "Learning", icon: "Code", description: "", proof: "", x: 50, y: 50, mastery: 50 };

import type { AdminTabProps } from "./types";

export function SkillsTab(_props: AdminTabProps) {
    const { data: skills } = useSkills();
    const { create, update, remove, bulkDelete, isPending } = useAdminSkills();

    const [editing, setEditing] = useState<(Partial<Skill> & typeof emptySkill) | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} skills?`)) return;
        await bulkDelete(selectedIds);
        setSelectedIds([]);
    };

    const save = async (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;

        if (editing.id) {
            await update({ id: editing.id, data: editing });
        } else {
            await create(editing);
        }
        setEditing(null);
    };

    const deleteSkill = async (id: number) => {
        if (!confirm("Delete this skill?")) return;
        await remove(id);
    };

    if (editing) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 nm-inset rounded-2xl flex items-center justify-center text-indigo-500">
                            <Cpu size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-[var(--admin-text-primary)] tracking-tighter uppercase italic">
                                {editing.id ? "Edit_Skill" : "New_Skill"}
                            </h2>
                            <p className="text-[var(--admin-text-secondary)] text-[10px] font-bold uppercase tracking-[0.3em] ml-1">
                                Protocol: {editing.id ? `ID_${editing.id}` : "Allocation"}
                            </p>
                        </div>
                    </div>
                    <AdminButton
                        onClick={() => setEditing(null)}
                        variant="secondary"
                        icon={X}
                        className="nm-button h-12 px-6 text-[10px] font-black uppercase tracking-widest text-[var(--admin-text-secondary)] hover:text-rose-500"
                    >
                        Cancel_Task
                    </AdminButton>
                </div>

                <form onSubmit={save} className="nm-flat p-10 space-y-10 max-w-4xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-10">
                        <FormField
                            label="Skill Name"
                            value={editing.name}
                            onChange={(v) => setEditing(prev => prev ? ({ ...prev, name: v }) : null)}
                            placeholder="e.g. React.js"
                            required
                        />
                        <FormField
                            label="Category"
                            value={editing.category}
                            onChange={(v) => setEditing(prev => prev ? ({ ...prev, category: v }) : null)}
                            placeholder="Frontend, Backend, Tools..."
                            required
                        />
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                        <FormSelect
                            label="Class_Status"
                            value={editing.status}
                            onChange={(v) => setEditing(prev => prev ? ({ ...prev, status: v as "Core" | "Advanced" | "Learning" }) : null)}
                            options={[
                                { label: "CORE_TECH", value: "Core" },
                                { label: "ADVANCED", value: "Advanced" },
                                { label: "RESEARCHING", value: "Learning" }
                            ]}
                            icon={<Layers size={14} />}
                        />
                        <div className="md:col-span-2">
                            <FormField
                                label="Mastery_Level (0-100)"
                                value={editing.mastery?.toString() || "0"}
                                onChange={(v) => setEditing(prev => prev ? ({ ...prev, mastery: parseInt(v) || 0 }) : null)}
                                type="number"
                                min="0"
                                max="100"
                            />
                        </div>
                    </div>

                    <FormField
                        label="System_Icon"
                        value={editing.icon}
                        onChange={(v) => setEditing(prev => prev ? ({ ...prev, icon: v }) : null)}
                        placeholder="Lucide icon name (e.g. Code, Zap, Cpu)"
                    />

                    <div className="grid md:grid-cols-2 gap-10">
                        <FormField
                            label="Position X (0-100)"
                            value={editing.x?.toString() || "50"}
                            onChange={(v) => setEditing(prev => prev ? ({ ...prev, x: parseFloat(v) || 0 }) : null)}
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            required
                        />
                        <FormField
                            label="Position Y (0-100)"
                            value={editing.y?.toString() || "50"}
                            onChange={(v) => setEditing(prev => prev ? ({ ...prev, y: parseFloat(v) || 0 }) : null)}
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            required
                        />
                    </div>

                    <FormTextarea
                        label="Capability_Description"
                        value={editing.description}
                        onChange={(v) => setEditing(prev => prev ? ({ ...prev, description: v }) : null)}
                        placeholder="Detail Technical Proficiency..."
                    />

                    <FormTextarea
                        label="Validation_Link (Proof/Project)"
                        value={editing.proof}
                        onChange={(v) => setEditing(prev => prev ? ({ ...prev, proof: v }) : null)}
                        placeholder="https://..."
                    />

                    <div className="flex gap-6 pt-6 border-t border-black/5">
                        <AdminButton
                            type="submit"
                            isLoading={isPending}
                            variant="primary"
                            className="nm-button nm-button-primary h-14 px-12 text-[12px] font-black uppercase tracking-[0.2em] flex-1"
                        >
                            {isPending ? "Executing..." : (editing.id ? "Update_Protocol" : "Initialize_Skill")}
                        </AdminButton>
                    </div>
                </form>
            </div>
        );
    }

    const filteredSkills = (skills ?? []).filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group skills by category
    const grouped: Record<string, Skill[]> = {};
    filteredSkills.forEach((s) => {
        (grouped[s.category] ??= []).push(s);
    });

    return (
        <div className="animate-in fade-in duration-700 space-y-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 nm-inset rounded-xl flex items-center justify-center text-indigo-500">
                            <Zap size={20} strokeWidth={3} />
                        </div>
                        <h1 className="text-4xl font-black text-[var(--admin-text-primary)] tracking-tighter uppercase italic">
                            Skills
                        </h1>
                    </div>
                    <p className="text-[var(--admin-text-secondary)] text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3 ml-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_var(--nm-accent)]" />
                        Stack_Index: {skills?.length ?? 0}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="FIND_CAPABILITY..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-14 pl-12 pr-6 nm-inset rounded-2xl text-[10px] font-black tracking-widest focus:outline-none w-64 transition-all focus:w-80"
                        />
                        <Code size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 opacity-50" />
                    </div>
                    <AdminButton
                        onClick={() => setEditing({ ...emptySkill })}
                        variant="primary"
                        icon={Plus}
                        className="nm-button nm-button-primary h-14 px-10 text-[12px] font-black uppercase tracking-[0.25em]"
                    >
                        New_Skill
                    </AdminButton>
                </div>
            </div>

            {!skills?.length ? (
                <div className="nm-flat p-24 text-center">
                    <EmptyState icon={Zap} text="No technical protocols indexed" />
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.entries(grouped).map(([cat, items]) => (
                        <div key={cat} className="space-y-6">
                            <div className="flex items-center gap-4 px-2">
                                <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">{cat || "Uncategorized"}</h3>
                                <div className="h-px flex-1 nm-inset opacity-30" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {items.map((s) => (
                                    <div
                                        key={s.id}
                                        className={cn(
                                            "nm-flat p-6 flex flex-col gap-6 group transition-all relative overflow-hidden",
                                            selectedIds.includes(s.id) && "ring-2 ring-indigo-500/50"
                                        )}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all shrink-0",
                                                        selectedIds.includes(s.id) ? "nm-inset text-indigo-500 scale-95" : "nm-inset text-[var(--admin-text-muted)] group-hover:text-indigo-400"
                                                    )}
                                                    onClick={() => toggleSelect(s.id)}
                                                >
                                                    {selectedIds.includes(s.id) ? <Check size={18} strokeWidth={4} /> : <div className="w-2.5 h-2.5 rounded-full bg-current opacity-20" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-black text-[var(--admin-text-primary)] truncate uppercase tracking-tight">{s.name}</h4>
                                                    <span className="text-[9px] font-bold text-[var(--admin-text-muted)] uppercase tracking-wider">{s.status}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <AdminButton
                                                    onClick={() => setEditing({ ...s })}
                                                    variant="secondary"
                                                    icon={Edit3}
                                                    size="sm"
                                                    className="w-8 h-8 nm-button rounded-lg text-indigo-500 hover:scale-110 flex items-center justify-center"
                                                    title="Edit"
                                                >
                                                </AdminButton>
                                                <AdminButton
                                                    onClick={() => deleteSkill(s.id)}
                                                    variant="secondary"
                                                    icon={Trash2}
                                                    size="sm"
                                                    className="w-8 h-8 nm-button rounded-lg text-rose-500 hover:scale-110 flex items-center justify-center"
                                                    title="Delete"
                                                >
                                                </AdminButton>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[9px] font-black text-[var(--admin-text-muted)] uppercase tracking-widest">Mastery</span>
                                                <span className="text-[11px] font-black text-indigo-500 italic">{s.mastery}%</span>
                                            </div>
                                            <div className="progress-track">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${s.mastery}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[9px] font-bold text-[var(--admin-text-muted)] uppercase tracking-wider">
                                                <span>X: {s.x}</span>
                                                <span>Y: {s.y}</span>
                                            </div>
                                        </div>

                                        {/* Ambient Background Number */}
                                        <div className="absolute -bottom-4 -right-4 text-8xl font-black text-black/[0.02] italic pointer-events-none select-none">
                                            {s.mastery}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Bulk Actions Fixed Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <div className="nm-float bg-[var(--nm-bg)]/90 backdrop-blur-xl px-10 py-5 flex items-center gap-8 border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 nm-inset rounded-xl flex items-center justify-center text-indigo-500">
                                <Layers size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-black text-[var(--admin-text-primary)] uppercase tracking-tight">{selectedIds.length} BATCH_LOAD</span>
                                <span className="text-[9px] text-[var(--admin-text-muted)] uppercase tracking-[0.2em] font-bold">Protocol_Selection</span>
                            </div>
                        </div>

                        <div className="w-px h-8 nm-inset opacity-20" />

                        <div className="flex items-center gap-4">
                            <AdminButton
                                onClick={handleBulkDelete}
                                variant="secondary"
                                icon={Trash2}
                                className="nm-button h-12 px-6 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10"
                            >
                                DELETE_ALL
                            </AdminButton>
                            <AdminButton
                                onClick={() => setSelectedIds([])}
                                variant="secondary"
                                icon={X}
                                className="nm-button h-12 w-12 text-[var(--admin-text-secondary)] flex items-center justify-center"
                            >
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
