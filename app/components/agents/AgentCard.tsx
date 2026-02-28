/**
 * AgentCard — Visual card for each AI agent showing status, task, and output
 */

import { motion } from 'framer-motion';
import type { AgentInfo } from '~/lib/agents/types';

interface AgentCardProps {
    agent: AgentInfo;
}

const STATUS_COLORS: Record<string, string> = {
    idle: '#6b7280',
    thinking: '#f59e0b',
    working: '#3b82f6',
    waiting: '#8b5cf6',
    done: '#10b981',
    error: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
    idle: 'Idle',
    thinking: 'Thinking...',
    working: 'Working',
    waiting: 'Waiting',
    done: 'Done',
    error: 'Error',
};

export function AgentCard({ agent }: AgentCardProps) {
    const statusColor = STATUS_COLORS[agent.status] || '#6b7280';

    return (
        <motion.div
            className="agent-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{ '--agent-color': statusColor } as React.CSSProperties}
        >
            <div className="agent-card-header">
                <span className="agent-card-emoji">{agent.emoji}</span>
                <div className="agent-card-info">
                    <h4 className="agent-card-name">{agent.name}</h4>
                    <div className="agent-card-status" style={{ color: statusColor }}>
                        <span
                            className="agent-status-dot"
                            style={{ backgroundColor: statusColor }}
                        />
                        {STATUS_LABELS[agent.status]}
                    </div>
                </div>
            </div>

            {agent.currentTask && (
                <div className="agent-card-task">
                    <span className="agent-card-task-label">Current Task:</span>
                    <span className="agent-card-task-value">{agent.currentTask}</span>
                </div>
            )}

            {agent.status === 'working' && (
                <motion.div
                    className="agent-card-progress"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
            )}

            {agent.output.length > 0 && (
                <div className="agent-card-output">
                    <span className="agent-card-output-count">
                        {agent.output.length} output{agent.output.length > 1 ? 's' : ''}
                    </span>
                </div>
            )}
        </motion.div>
    );
}
