import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, ArrowLeft } from 'lucide-react';
import { apiFetch } from '#src/lib/api-helpers';
import { formatDate } from '#src/lib/utils/date';
import { QUERY_KEYS } from '#src/lib/query-keys';

interface CaseStudyData {
    id: number;
    projectId: number;
    title: string;
    slug: string;
    content: string;
    status: string;
    generatedAt?: string;
    createdAt: string;
}

export const CaseStudyList: React.FC = () => {
    const { data: studies = [], isLoading } = useQuery({
        queryKey: QUERY_KEYS.caseStudies.all,
        queryFn: () => apiFetch('/api/v1/case-studies'),
    });

    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading case studies...</div>;
    }

    if (!studies.length) {
        return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>No case studies published yet.</div>;
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--text-primary)' }}>
                <BookOpen style={{ display: 'inline', marginRight: '0.75rem' }} size={28} />
                Case Studies
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {(studies as CaseStudyData[]).map((study, i) => (
                    <motion.a
                        key={study.id}
                        href={`/case-studies/${study.slug}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{
                            display: 'block', padding: '1.5rem', borderRadius: '12px',
                            background: 'var(--surface-secondary, #1e1e3a)', border: '1px solid var(--border-primary, rgba(255,255,255,0.1))',
                            textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
                    >
                        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>{study.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary, #666)', fontSize: '0.8rem' }}>
                            <Calendar size={14} />
                            {formatDate(study.createdAt)}
                        </div>
                    </motion.a>
                ))}
            </div>
        </div>
    );
};

export const CaseStudyViewer: React.FC<{ slug: string }> = ({ slug }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: QUERY_KEYS.caseStudies.detail(slug),
        queryFn: async () => {
            const res = await apiFetch(`/api/v1/case-studies/${slug}`);
            return res?.data as CaseStudyData;
        },
    });

    if (isLoading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>;
    if (error || !data) return <div style={{ textAlign: 'center', padding: '4rem', color: '#ef4444' }}>Case study not found.</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <a href="/case-studies" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', marginBottom: '2rem', textDecoration: 'none' }}>
                <ArrowLeft size={16} /> Back to Case Studies
            </a>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{data.title}</h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
                Generated on {data.generatedAt ? formatDate(data.generatedAt) : 'N/A'}
            </p>
            <div
                style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1rem' }}
                dangerouslySetInnerHTML={{ __html: data.content.replace(/\n/g, '<br/>') }}
            />
        </div>
    );
};
