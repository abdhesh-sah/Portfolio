import { m } from 'framer-motion';
import { SkillNode } from './SkillTypes';

interface StatPanelProps {
    title: string;
    children: React.ReactNode;
    position: 'left' | 'right';
    icon: React.ReactNode;
}

export const StatPanel = ({
    title,
    children,
    position,
    icon
}: StatPanelProps) => {
    return (
        <m.div
            className={`absolute ${position === 'left' ? 'left-3 md:left-4' : 'right-3 md:right-4'} 
        bottom-3 md:bottom-4 w-40 md:w-52 p-3 md:p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md rounded-xl border border-primary/20 shadow-lg z-20`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 2.5 }}
        >
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {title}
                </h4>
            </div>
            {children}
        </m.div>
    );
};

export const ProficiencyChart = ({ skillNodes }: { skillNodes: SkillNode[] }) => {
    const counts = {
        Core: skillNodes.filter(n => n.status === 'Core').length,
        Comfortable: skillNodes.filter(n => n.status === 'Comfortable').length,
        Learning: skillNodes.filter(n => n.status === 'Learning').length
    };

    const categories = [
        { name: 'Core', count: counts.Core, color: 'var(--color-cyan)', bgColor: 'rgba(0, 212, 255, 0.2)' },
        { name: 'Comfortable', count: counts.Comfortable, color: 'var(--color-purple)', bgColor: 'rgba(168, 85, 247, 0.2)' },
        { name: 'Learning', count: counts.Learning, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.2)' }
    ];

    const max = Math.max(...categories.map((c) => c.count), 1);

    return (
        <div className="space-y-2.5">
            {categories.map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-2">
                    <span className="text-[10px] w-14 md:w-16 text-muted-foreground font-medium">{cat.name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(30, 30, 50, 0.8)' }}>
                        <m.div
                            className="h-full rounded-full"
                            style={{
                                background: `linear-gradient(90deg, ${cat.bgColor} 0%, ${cat.color} 100%)`,
                                boxShadow: `0 0 10px ${cat.color}40`
                            }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(cat.count / max) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 2.6 + i * 0.1 }}
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-3 font-bold">{cat.count}</span>
                </div>
            ))}
        </div>
    );
};

export const CategorySummary = ({ skillNodes }: { skillNodes: SkillNode[] }) => {
    const counts = {
        Foundations: skillNodes.filter(n => n.category === 'Foundations').length,
        Frontend: skillNodes.filter(n => n.category === 'Frontend').length,
        Backend: skillNodes.filter(n => n.category === 'Backend').length,
        Tools: skillNodes.filter(n => n.category === 'Tools').length
    };

    const categories = [
        { name: 'Foundations', count: counts.Foundations, icon: '🏛️', color: 'rgba(0, 212, 255, 0.1)' },
        { name: 'Frontend', count: counts.Frontend, icon: '🎨', color: 'rgba(168, 85, 247, 0.1)' },
        { name: 'Backend', count: counts.Backend, icon: '⚙️', color: 'rgba(236, 72, 153, 0.1)' },
        { name: 'Tools', count: counts.Tools, icon: '🔧', color: 'rgba(34, 197, 94, 0.1)' }
    ];

    return (
        <div className="grid grid-cols-2 gap-1.5">
            {categories.map((cat, i) => (
                <m.div
                    key={cat.name}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg"
                    style={{ background: cat.color }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 2.7 + i * 0.1 }}
                >
                    <span className="text-xs">{cat.icon}</span>
                    <div className="min-w-0">
                        <div className="text-[9px] text-muted-foreground truncate">{cat.name}</div>
                        <div className="text-xs font-bold text-foreground">{cat.count}</div>
                    </div>
                </m.div>
            ))}
        </div>
    );
};
