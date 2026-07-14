import React, { useState, useEffect, type FormEvent } from "react";
import { useProjects, useAdminProjects } from "#src/hooks/use-portfolio";
import type { Project } from "#shared";
import { RichTextEditor } from "#src/components/admin/LazyRichTextEditor";
import { Search, Plus, Trash2, Edit3, GripVertical, Check, ExternalLink, Layers, Zap, Pin } from "lucide-react";
import { Github } from "#src/components/icons/brand-icons";
import { FormField, EmptyState, FormSelect, FormCheckbox, AdminButton, LoadingSkeleton } from "../AdminShared";
import { ImageUpload } from "../ImageUpload";
import { OptimizedImage } from "#src/components/OptimizedImage";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "#src/lib/utils";

const emptyProject = {
    title: "", slug: "", description: "", techStack: [] as string[], imageUrl: "",
    githubUrl: "", liveUrl: "", category: "", status: "Completed" as "In Progress" | "Completed" | "Archived",
    problemStatement: "", motivation: "", systemDesign: "", challenges: "", learnings: "",
    isFlagship: false, isHidden: false, impact: "", role: "",
};

function SortableProjectItem({ project, onEdit, onDelete, onTogglePin, isSelected, onToggleSelect }: {
    project: Project,
    onEdit: (p: Project) => void,
    onDelete: (id: number) => void,
    onTogglePin: (id: number, current: boolean) => void,
    isSelected: boolean,
    onToggleSelect: (id: number) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: project.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const statusColors: Record<string, string> = {
        "In Progress": "text-amber-500 bg-amber-500/5",
        "Completed": "text-emerald-500 bg-emerald-500/5",
        "Archived": "text-slate-500 bg-slate-500/5",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "nm-flat p-5 flex flex-col sm:flex-row sm:items-center gap-6 group relative transition-all duration-300 hover:scale-[1.01]",
                isSelected && "nm-inset border-nm-accent/20"
            )}
        >
            <div className="flex items-center gap-4">
                <div
                    {...attributes}
                    {...listeners}
                    className="p-2 cursor-grab active:cursor-grabbing text-admin-text-muted hover:text-admin-text-secondary transition-colors"
                >
                    <GripVertical size={18} />
                </div>

                <div
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(project.id); }}
                    className={cn(
                        "w-6 h-6 rounded-lg nm-inset flex items-center justify-center cursor-pointer transition-all duration-300",
                        isSelected ? "bg-nm-accent text-[var(--admin-text-primary)]" : "hover:shadow-lg"
                    )}
                >
                    {isSelected && <Check size={14} strokeWidth={4} className="text-white dark:text-[var(--admin-text-primary)]" />}
                </div>
            </div>

            <div className="relative shrink-0 group/img">
                <div className="nm-inset p-1 rounded-xl overflow-hidden bg-nm-bg">
                    <OptimizedImage
                        src={project.imageUrl || ""}
                        alt={project.title}
                        width={120}
                        height={120}
                        className="w-20 h-20 rounded-lg object-cover grayscale-[0.3] group-hover/img:grayscale-0 transition-all duration-500"
                    />
                </div>
                {project.isFlagship && (
                    <div className="absolute -top-2 -right-2 nm-float bg-amber-500 p-1.5 rounded-lg text-white dark:text-[var(--admin-text-primary)] shadow-xl animate-bounce-subtle">
                        <Zap size={12} fill="currentColor" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <h4 className="font-bold text-admin-text-primary text-base tracking-tight leading-none">{project.title}</h4>
                    {project.status && (
                        <div className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest nm-inset", statusColors[project.status])}>
                            {project.status}
                        </div>
                    )}
                    {project.isHidden && (
                        <span className="text-[10px] font-bold text-rose-500 nm-inset px-2 py-0.5 rounded-md">Hidden</span>
                    )}
                </div>
                <p className="text-[11px] text-nm-accent font-black uppercase tracking-[0.2em] mb-3">{project.category}</p>
                <div className="flex flex-wrap gap-2">
                    {(project.techStack ?? []).slice(0, 5).map((t) => (
                        <span key={t} className="px-3 py-1 rounded-lg text-[10px] font-bold text-admin-text-secondary nm-inset opacity-80 hover:opacity-100 transition-opacity">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 sm:self-center">
                <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onTogglePin(project.id, !!project.isFlagship)}
                    icon={Pin}
                    className={cn(
                        "nm-button p-3 transition-colors",
                        project.isFlagship ? "text-amber-500 bg-amber-500/10" : "text-admin-text-muted hover:text-amber-500"
                    )}
                    title={project.isFlagship ? "Unpin from Homepage" : "Pin to Homepage"}
                >
                </AdminButton>
                <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(project)}
                    icon={Edit3}
                    className="nm-button p-3"
                    title="Edit Protocol"
                >
                </AdminButton>
                <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => onDelete(project.id)}
                    icon={Trash2}
                    className="nm-button p-3 text-rose-500 hover:text-rose-600"
                    title="Terminate Entity"
                >
                </AdminButton>
            </div>
        </div>
    );
}

import type { AdminTabProps } from "./types";

export function ProjectsTab(_props: AdminTabProps) {
    const { data: projects } = useProjects();
    const {
        create,
        update,
        remove,
        reorder: reorderApi,
        bulkDelete: bulkDeleteApi,
        bulkStatus: bulkStatusApi,
        isPending: saving,
    } = useAdminProjects();

    const [editing, setEditing] = useState<(Partial<Project> & typeof emptyProject) | null>(null);
    const [techInput, setTechInput] = useState("");
    const [orderedProjects, setOrderedProjects] = useState<Project[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Confirm deletion of ${selectedIds.length} project artifacts?`)) return;
        try {
            await bulkDeleteApi(selectedIds);
            setSelectedIds([]);
        } catch (err) { console.error(err); }
    };

    const handleBulkStatus = async (status: string) => {
        if (!confirm(`Update classification of ${selectedIds.length} artifacts to ${status}?`)) return;
        try {
            await bulkStatusApi({ ids: selectedIds, status });
            setSelectedIds([]);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (projects) setOrderedProjects(projects);
    }, [projects]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setOrderedProjects((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                reorderApi(newItems.map(p => p.id));
                return newItems;
            });
        }
    };

    const openNew = () => { setEditing({ ...emptyProject }); setTechInput(""); };
    const openEdit = (p: Project) => {
        setEditing({
            ...p,
            imageUrl: p.imageUrl ?? "",
            githubUrl: p.githubUrl ?? "",
            liveUrl: p.liveUrl ?? "",
            problemStatement: p.problemStatement ?? "",
            motivation: p.motivation ?? "",
            systemDesign: p.systemDesign ?? "",
            challenges: p.challenges ?? "",
            learnings: p.learnings ?? "",
            isFlagship: p.isFlagship ?? false,
            isHidden: p.isHidden ?? false,
            impact: p.impact ?? "",
            role: p.role ?? "",
        });
        setTechInput((p.techStack ?? []).join(", "));
    };

    const save = async (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;

        const body = {
            ...editing,
            slug: editing.slug || (editing.title || "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            techStack: techInput.split(",").map((s) => s.trim()).filter(Boolean),
            githubUrl: editing.githubUrl || null,
            liveUrl: editing.liveUrl || null,
            isHidden: editing.isHidden,
        };

        try {
            if (editing.id) {
                await update({ id: editing.id, data: body });
            } else {
                await create(body);
            }
            setEditing(null);
        } catch (err) { console.error(err); }
    };

    if (editing) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="nm-inset p-2 rounded-lg text-nm-accent">
                                <Plus size={20} />
                            </div>
                            <h2 className="text-3xl font-black text-admin-text-primary tracking-tighter uppercase italic">
                                {editing.id ? "Edit Artifact" : "Initialize Artifact"}
                            </h2>
                        </div>
                        <p className="text-xs text-admin-text-muted font-bold tracking-[0.3em] uppercase ml-12">Project Protocol Design</p>
                    </div>
                    <AdminButton
                        onClick={() => setEditing(null)}
                        variant="secondary"
                        className="nm-button px-6 py-3 text-xs font-black uppercase tracking-widest text-admin-text-secondary hover:text-admin-text-primary transition-all"
                    >
                        Cancel Release
                    </AdminButton>
                </div>

                <form onSubmit={save} className="space-y-10 max-w-6xl pb-32">
                    <div className="grid lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-7 space-y-10">
                            <div className="nm-flat p-8 space-y-8">
                                <FormField label="Artifact Title" value={editing.title} onChange={(v) => setEditing(prev => prev ? { ...prev, title: v } : null)} required placeholder="Enter primary designation..." />
                                <FormField label="Primary Category" value={editing.category} onChange={(v) => setEditing(prev => prev ? { ...prev, category: v } : null)} required placeholder="Classification (e.g. Web3, AI, Fintech)..." />

                                <div className="grid md:grid-cols-2 gap-8">
                                    <FormSelect
                                        label="Lifecycle Status"
                                        value={editing.status || "Completed"}
                                        onChange={(v) => setEditing(prev => prev ? { ...prev, status: v as "In Progress" | "Completed" | "Archived" } : null)}
                                        options={[
                                            { label: "ACTIVE DEVELOPMENT", value: "In Progress" },
                                            { label: "DEPLOYED / STABLE", value: "Completed" },
                                            { label: "ARCHIVED / LEGACY", value: "Archived" },
                                        ]}
                                        icon={<Layers size={14} />}
                                    />

                                    <div className="flex flex-col justify-end gap-5 pb-1">
                                        <FormCheckbox
                                            label="Flagship Status"
                                            checked={Boolean(editing.isFlagship)}
                                            onChange={(checked) => setEditing(prev => prev ? { ...prev, isFlagship: checked } : null)}
                                            activeColor="bg-amber-500"
                                        />
                                        <FormCheckbox
                                            label="Stealth Mode"
                                            checked={Boolean(editing.isHidden)}
                                            onChange={(checked) => setEditing(prev => prev ? { ...prev, isHidden: checked } : null)}
                                            activeColor="bg-rose-500"
                                        />
                                    </div>
                                </div>

                                <FormField label="Technology Stack" value={techInput} onChange={setTechInput} placeholder="React, Tailwind, PostgreSQL, Docker..." />

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-admin-text-secondary uppercase tracking-[0.2em] ml-1">Source Repository</label>
                                        <div className="relative">
                                            <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-admin-text-muted" size={16} />
                                            <input
                                                value={editing.githubUrl ?? ""}
                                                onChange={(e) => setEditing(prev => prev ? { ...prev, githubUrl: e.target.value } : null)}
                                                placeholder="https://github.com/..."
                                                className="nm-inset w-full pl-12 pr-5 py-3 rounded-xl text-admin-text-primary text-sm transition-all outline-none focus:ring-2 focus:ring-nm-accent/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-admin-text-secondary uppercase tracking-[0.2em] ml-1">Live Endpoint</label>
                                        <div className="relative">
                                            <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 text-admin-text-muted" size={16} />
                                            <input
                                                value={editing.liveUrl ?? ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEditing(prev => prev ? { ...prev, liveUrl: val } : null);
                                                }}
                                                placeholder="https://..."
                                                className="nm-inset w-full pl-12 pr-5 py-3 rounded-xl text-admin-text-primary text-sm transition-all outline-none focus:ring-2 focus:ring-nm-accent/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 space-y-10">
                            <div className="nm-flat p-8 space-y-8">
                                <ImageUpload label="Hero Media Asset" value={editing.imageUrl} onChange={(v) => setEditing(prev => prev ? { ...prev, imageUrl: v } : null)} className="h-[280px] rounded-2xl overflow-hidden nm-inset border-none" />
                                <RichTextEditor label="Executive Architecture Summary" value={editing.description} onChange={(v) => setEditing(prev => prev ? { ...prev, description: v } : null)} className="min-h-[260px]" />
                            </div>
                        </div>
                    </div>

                    <div className="nm-flat p-10 space-y-12">
                        <div className="border-l-4 border-nm-accent pl-6">
                            <h3 className="text-xl font-black text-admin-text-primary tracking-tight uppercase italic">Case Study deep-dive</h3>
                            <p className="text-[10px] text-admin-text-muted uppercase tracking-[0.4em] font-bold mt-1">Detailed Technical Specifications</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-16">
                            <div className="space-y-10">
                                <RichTextEditor label="Problem Vector" value={editing.problemStatement ?? ""} onChange={(v) => setEditing(prev => prev ? { ...prev, problemStatement: v } : null)} />
                                <RichTextEditor label="Innovation Motivation" value={editing.motivation ?? ""} onChange={(v) => setEditing(prev => prev ? { ...prev, motivation: v } : null)} />
                                <RichTextEditor label="Engineering Challenges" value={editing.challenges ?? ""} onChange={(v) => setEditing(prev => prev ? { ...prev, challenges: v } : null)} />
                            </div>
                            <div className="space-y-10">
                                <RichTextEditor label="System Architecture" value={editing.systemDesign ?? ""} onChange={(v) => setEditing(prev => prev ? { ...prev, systemDesign: v } : null)} />
                                <RichTextEditor label="Knowledge Acquisition" value={editing.learnings ?? ""} onChange={(v) => setEditing(prev => prev ? { ...prev, learnings: v } : null)} />
                                <RichTextEditor label="Strategic Impact" value={editing.impact ?? ""} onChange={(v) => setEditing(prev => prev ? { ...prev, impact: v } : null)} />
                            </div>
                        </div>
                        <div className="pt-10 border-t border-nm-shadow/30">
                            <RichTextEditor label="Personal Contribution / Lead Role" value={editing.role ?? ""} onChange={(v) => setEditing(prev => prev ? { ...prev, role: v } : null)} />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 pt-10">
                        <AdminButton
                            type="submit"
                            isLoading={saving}
                            variant="primary"
                            className="nm-button-primary px-12 py-4 h-auto font-black uppercase tracking-widest text-sm flex-1 sm:flex-none"
                        >
                            {editing.id ? "Sync Changes" : "Commit Artifact"}
                        </AdminButton>
                        <AdminButton
                            type="button"
                            onClick={() => setEditing(null)}
                            variant="secondary"
                            className="nm-button px-12 py-4 h-auto font-black uppercase tracking-widest text-sm text-admin-text-secondary hover:text-rose-500 flex-1 sm:flex-none"
                        >
                            Discard
                        </AdminButton>
                    </div>
                </form>
            </div>
        );
    }

    const filtered = orderedProjects.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.techStack?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-8">
                <div>
                    <h2 className="text-4xl font-black text-admin-text-primary tracking-tighter uppercase italic mb-2">
                        Artifacts
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-nm-accent font-black uppercase tracking-[0.3em]">Project Repository</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-nm-accent shadow-[0_0_8px_var(--nm-accent)]" />
                        <span className="text-[10px] text-admin-text-muted font-bold tracking-widest">
                            {projects ? `${projects.length} ITEMS LOGGED` : "SCANNING..."}
                        </span>
                    </div>
                </div>

                {projects && (
                    <div className={cn(
                        "nm-float px-6 py-3 rounded-2xl flex items-center gap-4 border-none",
                        projects.filter(p => p.isFlagship).length > 6 ? "bg-rose-500/5 ring-1 ring-rose-500/50" : "bg-admin-card"
                    )}>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <Pin size={12} className={cn(
                                    projects.filter(p => p.isFlagship).length > 0 ? "text-amber-500" : "text-admin-text-muted"
                                )} />
                                <span className="text-xs font-black text-admin-text-primary uppercase tracking-tighter italic">
                                    Pinned Count: {projects.filter(p => p.isFlagship).length}
                                </span>
                            </div>
                            {projects.filter(p => p.isFlagship).length > 6 && (
                                <span className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-0.5 animate-pulse">
                                    Max recommended (6) exceeded
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-4 flex-1 justify-end">
                    <div className="relative group max-w-md w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-nm-accent transition-all group-focus-within:scale-110" size={16} />
                        <input
                            type="text"
                            placeholder="FILTER PROTOCOLS..."
                            value={searchQuery}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearchQuery(val);
                            }}
                            className="nm-inset w-full py-4 pl-14 pr-6 text-sm font-bold text-admin-text-primary placeholder:text-admin-text-muted outline-none transition-all focus:ring-2 focus:ring-nm-accent/10"
                        />
                    </div>
                    <AdminButton
                        onClick={openNew}
                        variant="primary"
                        className="nm-button-primary p-4 rounded-2xl transition-all hover:rotate-90 active:rotate-180"
                        title="Initialize New Artifact"
                        icon={Plus}
                    >
                    </AdminButton>
                </div>
            </div>

            {!projects ? (
                <div className="grid gap-6">
                    {[1, 2, 3].map(i => <LoadingSkeleton key={i} />)}
                </div>
            ) : !filtered.length ? (
                <div className="nm-flat p-24 text-center border-none">
                    <EmptyState
                        icon={Layers}
                        text={searchQuery ? "No matching project archetypes found in current sector." : "Project database currently contains zero logged artifacts."}
                    />
                    {!searchQuery && (
                        <AdminButton onClick={openNew} variant="secondary" className="mt-10 nm-button px-10 py-4 font-black uppercase tracking-widest text-sm text-nm-accent">
                            Initialize Repository
                        </AdminButton>
                    )}
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={filtered} strategy={verticalListSortingStrategy}>
                        <div className="grid gap-6">
                            {filtered.map((p) => (
                                <SortableProjectItem
                                    key={p.id}
                                    project={p}
                                    onEdit={openEdit}
                                    onDelete={async (id) => {
                                        if (confirm("Delete this project?")) {
                                            try { await remove(id); } catch (err) { console.error(err); }
                                        }
                                    }}
                                    onTogglePin={async (id, current) => {
                                        try {
                                            await update({ id, data: { isFlagship: !current } });
                                        } catch (err) { console.error(err); }
                                    }}
                                    isSelected={selectedIds.includes(p.id)}
                                    onToggleSelect={toggleSelect}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {selectedIds.length > 0 && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 nm-float bg-nm-bg/95 border-none px-10 py-6 flex items-center gap-10 animate-in slide-in-from-bottom-20 fade-in duration-500 backdrop-blur-xl">
                    <div className="flex flex-col pr-8 border-r border-nm-shadow/30">
                        <span className="text-base font-black text-admin-text-primary tracking-tighter uppercase italic">{selectedIds.length} Entities Selected</span>
                        <span className="text-[9px] text-nm-accent font-black uppercase tracking-[0.4em] mt-1">Batch Protocol Active</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <AdminButton variant="secondary" className="nm-button px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-admin-text-secondary hover:text-indigo-500" onClick={() => handleBulkStatus("In Progress")}>Development</AdminButton>
                        <AdminButton variant="secondary" className="nm-button px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-admin-text-secondary hover:text-emerald-500" onClick={() => handleBulkStatus("Completed")}>Production</AdminButton>
                        <AdminButton variant="secondary" className="nm-button px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-admin-text-secondary hover:text-slate-500" onClick={() => handleBulkStatus("Archived")}>Legacy</AdminButton>
                    </div>
                    <AdminButton
                        variant="secondary"
                        className="nm-button px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/5 hover:bg-rose-500 hover:text-[var(--admin-text-primary)] border-none"
                        onClick={handleBulkDelete}
                    >
                        Terminate Selection
                    </AdminButton>
                    <AdminButton
                        variant="secondary"
                        onClick={() => setSelectedIds([])}
                        className="nm-button w-10 h-10 rounded-full text-admin-text-muted hover:text-admin-text-primary transition-colors flex items-center justify-center"
                    >
                        ✕
                    </AdminButton>
                </div>
            )}
        </div>
    );
}
