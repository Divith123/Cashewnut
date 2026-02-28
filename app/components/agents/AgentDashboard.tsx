/**
 * Agent Dashboard — Main dashboard showing all agents, tasks, and phases
 */

import { useStore } from '@nanostores/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    companyModeEnabled,
    currentProject,
    activeAgents,
    agentMessages,
    currentPhase,
    isProcessing,
    startCompanyProject,
    executeNextTasks,
    approveCurrentPhase,
} from '~/lib/stores/agent';
import { AgentCard } from './AgentCard';
import { PhaseProgress } from './PhaseProgress';
import { TaskBoard } from './TaskBoard';
import { AgentTimeline } from './AgentTimeline';
import type { Phase } from '~/lib/agents/types';
import { useState } from 'react';

export function AgentDashboard() {
    const enabled = useStore(companyModeEnabled);
    const project = useStore(currentProject);
    const agents = useStore(activeAgents);
    const messages = useStore(agentMessages);
    const phase = useStore(currentPhase);
    const processing = useStore(isProcessing);
    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    const handleCreateProject = () => {
        if (!projectName.trim() || !projectDesc.trim()) {
            return;
        }

        startCompanyProject(projectName.trim(), projectDesc.trim());
        setShowCreateForm(false);
        setProjectName('');
        setProjectDesc('');
    };

    const handleExecute = async () => {
        await executeNextTasks();
    };

    const handleApprove = () => {
        approveCurrentPhase();
    };

    // ─── Not in company mode — show activation button ────────
    if (!enabled) {
        return (
            <div className="agent-dashboard-inactive">
                <motion.div
                    className="agent-dashboard-hero"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="agent-hero-icon">🏢</div>
                    <h2>AI Development Company Mode</h2>
                    <p>
                        Transform your project into a fully autonomous AI software development company.
                        A PM agent will coordinate a team of specialist AI agents to research, design, build, test,
                        and deploy your application.
                    </p>

                    {!showCreateForm ? (
                        <motion.button
                            className="agent-btn-primary"
                            onClick={() => setShowCreateForm(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            🚀 Launch Company Mode
                        </motion.button>
                    ) : (
                        <motion.div
                            className="agent-create-form"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            <input
                                type="text"
                                className="agent-input"
                                placeholder="Project name (e.g., Student Management SaaS)"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                            />
                            <textarea
                                className="agent-textarea"
                                placeholder="Describe your project in detail... (e.g., Build a modern Student Management SaaS with student enrollment, grade tracking, attendance management, and parent portal)"
                                value={projectDesc}
                                onChange={(e) => setProjectDesc(e.target.value)}
                                rows={4}
                            />
                            <div className="agent-form-actions">
                                <button className="agent-btn-secondary" onClick={() => setShowCreateForm(false)}>
                                    Cancel
                                </button>
                                <motion.button
                                    className="agent-btn-primary"
                                    onClick={handleCreateProject}
                                    disabled={!projectName.trim() || !projectDesc.trim()}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    🧠 Assemble Team & Start
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        );
    }

    // ─── Company mode active — show dashboard ────────────────
    return (
        <div className="agent-dashboard">
            {/* Phase Progress Bar */}
            <PhaseProgress
                currentPhase={phase}
                phaseGates={project?.phaseGates || []}
            />

            {/* Action Bar */}
            <div className="agent-action-bar">
                <div className="agent-project-info">
                    <h3>🏢 {project?.name}</h3>
                    <span className="agent-phase-badge">
                        Phase: {phase.charAt(0).toUpperCase() + phase.slice(1)}
                    </span>
                </div>
                <div className="agent-actions">
                    <motion.button
                        className="agent-btn-execute"
                        onClick={handleExecute}
                        disabled={processing}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {processing ? '⏳ Working...' : '▶️ Execute Tasks'}
                    </motion.button>
                    <motion.button
                        className="agent-btn-approve"
                        onClick={handleApprove}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        ✅ Approve Phase
                    </motion.button>
                </div>
            </div>

            {/* Agent Cards Grid */}
            <div className="agent-cards-grid">
                <AnimatePresence>
                    {agents.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                    ))}
                </AnimatePresence>
            </div>

            {/* Task Board */}
            <TaskBoard tasks={project?.tasks || []} />

            {/* Agent Activity Timeline */}
            <AgentTimeline messages={messages} />
        </div>
    );
}
