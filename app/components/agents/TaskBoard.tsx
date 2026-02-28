/**
 * TaskBoard — Kanban-style task board showing all tasks by status
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { Task, TaskStatus } from '~/lib/agents/types';
import { AGENT_ROLES } from '~/lib/agents/types';

interface TaskBoardProps {
    tasks: Task[];
}

const COLUMNS: { status: TaskStatus; label: string; emoji: string }[] = [
    { status: 'pending', label: 'To Do', emoji: '📋' },
    { status: 'in-progress', label: 'In Progress', emoji: '⚡' },
    { status: 'review', label: 'Review', emoji: '👀' },
    { status: 'done', label: 'Done', emoji: '✅' },
];

export function TaskBoard({ tasks }: TaskBoardProps) {
    return (
        <div className="task-board">
            <h3 className="task-board-title">📋 Task Board</h3>
            <div className="task-board-columns">
                {COLUMNS.map((col) => {
                    const columnTasks = tasks.filter((t) => t.status === col.status);

                    return (
                        <div key={col.status} className="task-board-column">
                            <div className="task-column-header">
                                <span>{col.emoji} {col.label}</span>
                                <span className="task-column-count">{columnTasks.length}</span>
                            </div>
                            <div className="task-column-body">
                                <AnimatePresence>
                                    {columnTasks.map((task) => (
                                        <TaskCard key={task.id} task={task} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TaskCard({ task }: { task: Task }) {
    const agentMeta = task.assignee ? AGENT_ROLES[task.assignee] : null;

    return (
        <motion.div
            className="task-card"
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            <div className="task-card-title">{task.title}</div>
            {agentMeta && (
                <div className="task-card-assignee">
                    <span>{agentMeta.emoji}</span>
                    <span>{agentMeta.name}</span>
                </div>
            )}
            <div className={`task-card-phase phase-${task.phase}`}>
                {task.phase}
            </div>
        </motion.div>
    );
}
