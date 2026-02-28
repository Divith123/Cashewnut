/**
 * Cashewnut Multi-Agent System — Type Definitions
 *
 * Defines the core types for the autonomous AI software development company.
 */

// ─── Agent Roles ─────────────────────────────────────────────
export type AgentRole =
    | 'pm'
    | 'researcher'
    | 'designer'
    | 'frontend-dev'
    | 'backend-dev'
    | 'qa'
    | 'devops';

export type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'error';

export interface AgentInfo {
    id: string;
    role: AgentRole;
    name: string;
    emoji: string;
    description: string;
    status: AgentStatus;
    currentTask: string | null;
    output: string[];
}

// ─── Agent Role Metadata ─────────────────────────────────────
export const AGENT_ROLES: Record<AgentRole, Omit<AgentInfo, 'id' | 'status' | 'currentTask' | 'output'>> = {
    pm: {
        role: 'pm',
        name: 'Project Manager',
        emoji: '🧠',
        description: 'Understands requirements, decomposes tasks, coordinates the team, and reports progress.',
    },
    researcher: {
        role: 'researcher',
        name: 'Research Engineer',
        emoji: '🔍',
        description: 'Researches frameworks, checks versions, validates security, reads documentation.',
    },
    designer: {
        role: 'designer',
        name: 'UI/UX Designer',
        emoji: '🎨',
        description: 'Creates component hierarchies, design tokens, color palettes, and responsive layouts.',
    },
    'frontend-dev': {
        role: 'frontend-dev',
        name: 'Frontend Developer',
        emoji: '⚛️',
        description: 'Builds UI components, pages, routing, and styling using modern frameworks.',
    },
    'backend-dev': {
        role: 'backend-dev',
        name: 'Backend Developer',
        emoji: '🔧',
        description: 'Builds API routes, database schemas, authentication, and server-side logic.',
    },
    qa: {
        role: 'qa',
        name: 'QA Engineer',
        emoji: '🧪',
        description: 'Generates tests, performs code review, runs tests, and reports bugs.',
    },
    devops: {
        role: 'devops',
        name: 'DevOps Engineer',
        emoji: '🚀',
        description: 'Handles project scaffolding, dependency management, build config, and deployment.',
    },
};

// ─── Tasks ───────────────────────────────────────────────────
export type TaskStatus = 'pending' | 'in-progress' | 'review' | 'done' | 'blocked';

export interface Task {
    id: string;
    title: string;
    description: string;
    assignee: AgentRole | null;
    status: TaskStatus;
    phase: Phase;
    dependencies: string[];
    output: string;
    createdAt: number;
    updatedAt: number;
}

// ─── Phases ──────────────────────────────────────────────────
export type Phase = 'research' | 'design' | 'development' | 'testing' | 'deployment';

export const PHASES: { phase: Phase; label: string; emoji: string }[] = [
    { phase: 'research', label: 'Research', emoji: '🔍' },
    { phase: 'design', label: 'Design', emoji: '🎨' },
    { phase: 'development', label: 'Development', emoji: '⚡' },
    { phase: 'testing', label: 'Testing', emoji: '🧪' },
    { phase: 'deployment', label: 'Deployment', emoji: '🚀' },
];

export interface PhaseGate {
    phase: Phase;
    approved: boolean;
    approvedAt: number | null;
    deliverables: string[];
}

// ─── Messages ────────────────────────────────────────────────
export type MessageType =
    | 'task-assigned'
    | 'task-completed'
    | 'task-blocked'
    | 'review-requested'
    | 'approval-granted'
    | 'progress-update'
    | 'file-created'
    | 'file-modified'
    | 'agent-thinking'
    | 'agent-output'
    | 'phase-complete'
    | 'user-message';

export interface AgentMessage {
    id: string;
    type: MessageType;
    from: AgentRole | 'user';
    to: AgentRole | 'all' | 'user';
    content: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

// ─── Project ─────────────────────────────────────────────────
export type ProjectMode = 'standard' | 'company';

export interface CompanyProject {
    id: string;
    name: string;
    description: string;
    mode: ProjectMode;
    currentPhase: Phase;
    agents: AgentInfo[];
    tasks: Task[];
    messages: AgentMessage[];
    phaseGates: PhaseGate[];
    createdAt: number;
    updatedAt: number;
}
