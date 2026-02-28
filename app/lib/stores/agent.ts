/**
 * Cashewnut Agent Store
 *
 * Nanostores-based reactive state for the multi-agent system.
 * Integrates with Cashewnut's existing store pattern.
 */

import { atom, map } from 'nanostores';
import type { AgentInfo, AgentMessage, CompanyProject, Phase, Task } from '~/lib/agents/types';
import { PMAgent } from '~/lib/agents/pm-agent';
import { agentBus } from '~/lib/agents/agent-bus';

// ─── Stores ──────────────────────────────────────────────────
export const companyModeEnabled = atom<boolean>(false);
export const currentProject = atom<CompanyProject | null>(null);
export const agentMessages = atom<AgentMessage[]>([]);
export const activeAgents = atom<AgentInfo[]>([]);
export const currentPhase = atom<Phase>('research');
export const isProcessing = atom<boolean>(false);

// ─── PM Instance ─────────────────────────────────────────────
let pmAgent: PMAgent | null = null;

/**
 * Start a new company-mode project
 */
export function startCompanyProject(name: string, description: string): CompanyProject {
    // Clean up previous project
    if (pmAgent) {
        pmAgent.destroy();
        agentBus.clear();
    }

    companyModeEnabled.set(true);

    // Create new PM and initialize project
    pmAgent = new PMAgent();
    const project = pmAgent.initializeProject(name, description);

    currentProject.set(project);
    activeAgents.set(project.agents);
    currentPhase.set(project.currentPhase);

    // Subscribe to all messages for the UI
    agentBus.subscribe('all', (message) => {
        const messages = agentMessages.get();
        agentMessages.set([...messages, message]);

        // Update project state
        const proj = pmAgent?.getProject();

        if (proj) {
            currentProject.set(proj);
            activeAgents.set(proj.agents);
            currentPhase.set(proj.currentPhase);
        }
    });

    return project;
}

/**
 * Execute next available tasks
 */
export async function executeNextTasks(): Promise<Task[]> {
    if (!pmAgent) {
        throw new Error('No active project');
    }

    isProcessing.set(true);

    try {
        const tasks = await pmAgent.executeNextTasks();
        const proj = pmAgent.getProject();

        if (proj) {
            currentProject.set(proj);
        }

        return tasks;
    } finally {
        isProcessing.set(false);
    }
}

/**
 * Approve the current phase and advance
 */
export function approveCurrentPhase(): Phase | null {
    if (!pmAgent) {
        return null;
    }

    const phase = currentPhase.get();
    const nextPhase = pmAgent.approvePhase(phase);

    if (nextPhase) {
        currentPhase.set(nextPhase);
    }

    const proj = pmAgent.getProject();

    if (proj) {
        currentProject.set(proj);
    }

    return nextPhase;
}

/**
 * Complete a task (called by the orchestrator after LLM generates output)
 */
export function completeTask(taskId: string, output: string): void {
    if (!pmAgent) {
        return;
    }

    pmAgent.completeTask(taskId, output);

    const proj = pmAgent.getProject();

    if (proj) {
        currentProject.set(proj);
    }
}

/**
 * Get the PM agent's system prompt for the current context
 */
export function getPMSystemPrompt(): string {
    if (!pmAgent) {
        return '';
    }

    const proj = pmAgent.getProject();
    return pmAgent.getSystemPrompt(proj?.description || '');
}

/**
 * Shut down company mode
 */
export function shutdownCompanyMode(): void {
    pmAgent?.destroy();
    pmAgent = null;
    agentBus.clear();

    companyModeEnabled.set(false);
    currentProject.set(null);
    agentMessages.set([]);
    activeAgents.set([]);
    currentPhase.set('research');
    isProcessing.set(false);
}
