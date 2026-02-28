/**
 * AgentTimeline — Real-time activity feed of agent messages
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { AgentMessage } from '~/lib/agents/types';
import { AGENT_ROLES } from '~/lib/agents/types';
import { useRef, useEffect } from 'react';

interface AgentTimelineProps {
    messages: AgentMessage[];
}

export function AgentTimeline({ messages }: AgentTimelineProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // Show last 50 messages
    const visibleMessages = messages.slice(-50);

    return (
        <div className="agent-timeline">
            <h3 className="agent-timeline-title">📡 Agent Activity</h3>
            <div className="agent-timeline-feed">
                <AnimatePresence initial={false}>
                    {visibleMessages.map((msg) => (
                        <TimelineItem key={msg.id} message={msg} />
                    ))}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>
        </div>
    );
}

function TimelineItem({ message }: { message: AgentMessage }) {
    const fromAgent = message.from !== 'user' ? AGENT_ROLES[message.from] : null;
    const emoji = fromAgent?.emoji || '👤';
    const name = fromAgent?.name || 'User';

    const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    return (
        <motion.div
            className="timeline-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <span className="timeline-emoji">{emoji}</span>
            <div className="timeline-content">
                <div className="timeline-header">
                    <span className="timeline-name">{name}</span>
                    <span className="timeline-time">{timeStr}</span>
                </div>
                <p className="timeline-message">{message.content}</p>
            </div>
        </motion.div>
    );
}
