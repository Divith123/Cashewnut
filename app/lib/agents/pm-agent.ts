/**
 * Cashewnut PM Agent — Project Manager Orchestrator
 *
 * The brain of the multi-agent system. The PM:
 * 1. Receives the user's project description
 * 2. Analyzes requirements and creates a structured spec
 * 3. Decomposes the project into tasks with dependencies
 * 4. Spawns specialist agents based on project needs
 * 5. Assigns tasks respecting dependency order
 * 6. Monitors progress and handles blockers
 * 7. Reports status to the user at each phase gate
 */

import { BaseAgent } from './base-agent';
import { agentBus } from './agent-bus';
import { decomposeProjectTasks, getExecutableTasks } from './task-decomposer';
import {
    ResearcherAgent,
    DesignerAgent,
    FrontendDevAgent,
    BackendDevAgent,
    QAAgent,
    DevOpsAgent,
} from './specialist-agents';
import type { AgentInfo, AgentRole, CompanyProject, Phase, PhaseGate, Task } from './types';
import { PHASES } from './types';

export class PMAgent extends BaseAgent {
    private team: Map<AgentRole, BaseAgent> = new Map();
    private project: CompanyProject | null = null;

    constructor() {
        super('pm');
    }

    getSystemPrompt(projectContext: string): string {
        return `You are the Project Manager at Cashewnut, an AI software development company.

You are responsible for:
1. Understanding the user's project requirements deeply
2. Creating a structured project specification
3. Forming the right team of AI specialists
4. Breaking down the project into phased tasks
5. Coordinating all agents to build the project
6. Reporting progress to the user at each milestone

WORKFLOW:
Phase 1 - RESEARCH: Research agent investigates best frameworks & tools
Phase 2 - DESIGN: Designer creates UI/UX specifications
Phase 3 - DEVELOPMENT: Frontend + Backend devs build the application
Phase 4 - TESTING: QA engineer reviews and tests everything
Phase 5 - DEPLOYMENT: DevOps prepares deployment configuration

RULES:
- Always complete one phase before moving to the next
- Each phase requires user approval before proceeding
- Be transparent about progress and any blockers
- Use the latest stable versions of all technologies
- Never skip research or design phases

Project: ${projectContext}`;
    }

    async executeTask(task: Task, projectContext: string): Promise<string> {
        return `PM coordinating: ${task.title}`;
    }

    /**
     * Initialize a new company-mode project
     */
    initializeProject(name: string, description: string): CompanyProject {
        // Create phase gates
        const phaseGates: PhaseGate[] = PHASES.map((p) => ({
            phase: p.phase,
            approved: false,
            approvedAt: null,
            deliverables: [],
        }));

        // Decompose tasks
        const tasks = decomposeProjectTasks(name, description);

        // Spawn the team
        this.spawnTeam();

        this.project = {
            id: `proj_${Date.now()}`,
            name,
            description,
            mode: 'company',
            currentPhase: 'research',
            agents: this.getTeamInfo(),
            tasks,
            messages: [],
            phaseGates,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        // Announce project start
        agentBus.publish('pm', 'all', 'progress-update', `🧠 Project "${name}" initialized. Starting with Research phase.`, {
            projectId: this.project.id,
            phase: 'research',
        });

        agentBus.publish('pm', 'user', 'progress-update', `I've assembled a team and broken down your project into ${tasks.length} tasks across 5 phases. Let's start with research to find the best technology stack.`, {
            projectId: this.project.id,
            taskCount: tasks.length,
        });

        return this.project;
    }

    /**
     * Spawn all specialist agents
     */
    private spawnTeam(): void {
        const agents: [AgentRole, BaseAgent][] = [
            ['researcher', new ResearcherAgent()],
            ['designer', new DesignerAgent()],
            ['frontend-dev', new FrontendDevAgent()],
            ['backend-dev', new BackendDevAgent()],
            ['qa', new QAAgent()],
            ['devops', new DevOpsAgent()],
        ];

        for (const [role, agent] of agents) {
            this.team.set(role, agent);
        }

        agentBus.publish('pm', 'user', 'progress-update', `Team assembled: ${agents.map(([_, a]) => `${a.info.emoji} ${a.info.name}`).join(', ')}`, {
            agents: agents.map(([role]) => role),
        });
    }

    /**
     * Get info about all team members including PM
     */
    getTeamInfo(): AgentInfo[] {
        const teamInfo: AgentInfo[] = [{ ...this.info }];

        for (const agent of this.team.values()) {
            teamInfo.push({ ...agent.info });
        }

        return teamInfo;
    }

    /**
     * Get the current project state
     */
    getProject(): CompanyProject | null {
        if (!this.project) {
            return null;
        }

        return {
            ...this.project,
            agents: this.getTeamInfo(),
            messages: agentBus.getLog(),
        };
    }

    /**
     * Start executing the next available tasks in the current phase
     */
    async executeNextTasks(): Promise<Task[]> {
        if (!this.project) {
            throw new Error('No project initialized');
        }

        const executable = getExecutableTasks(this.project.tasks);

        if (executable.length === 0) {
            agentBus.publish('pm', 'user', 'progress-update', 'All tasks in progress or waiting for approval.');
            return [];
        }

        for (const task of executable) {
            task.status = 'in-progress';
            task.updatedAt = Date.now();

            agentBus.publish('pm', task.assignee || 'pm', 'task-assigned', this.project.description, {
                task,
                projectContext: this.buildProjectContext(),
            });
        }

        return executable;
    }

    /**
     * Approve a phase gate and advance to the next phase
     */
    approvePhase(phase: Phase): Phase | null {
        if (!this.project) {
            return null;
        }

        const gate = this.project.phaseGates.find((g) => g.phase === phase);

        if (gate) {
            gate.approved = true;
            gate.approvedAt = Date.now();
        }

        // Find next phase
        const currentIdx = PHASES.findIndex((p) => p.phase === phase);
        const nextPhase = PHASES[currentIdx + 1];

        if (nextPhase) {
            this.project.currentPhase = nextPhase.phase;

            agentBus.publish('pm', 'user', 'phase-complete', `✅ ${PHASES[currentIdx].emoji} ${PHASES[currentIdx].label} phase approved. Moving to ${nextPhase.emoji} ${nextPhase.label}.`, {
                completedPhase: phase,
                nextPhase: nextPhase.phase,
            });

            return nextPhase.phase;
        }

        agentBus.publish('pm', 'user', 'phase-complete', '🎉 All phases complete! Your project is ready.', {
            completedPhase: phase,
        });

        return null;
    }

    /**
     * Build context string for agents to work with
     */
    private buildProjectContext(): string {
        if (!this.project) {
            return '';
        }

        const completedTasks = this.project.tasks.filter((t) => t.status === 'done');
        const completedOutputs = completedTasks.map((t) => `[${t.title}]: ${t.output}`).join('\n\n');

        return `
PROJECT: ${this.project.name}
DESCRIPTION: ${this.project.description}
CURRENT PHASE: ${this.project.currentPhase}

COMPLETED WORK:
${completedOutputs || 'None yet'}
    `.trim();
    }

    /**
     * Mark a task as complete with its output
     */
    completeTask(taskId: string, output: string): void {
        if (!this.project) {
            return;
        }

        const task = this.project.tasks.find((t) => t.id === taskId);

        if (task) {
            task.status = 'done';
            task.output = output;
            task.updatedAt = Date.now();

            agentBus.publish('pm', 'user', 'task-completed', `✅ Task "${task.title}" completed by ${task.assignee}.`);
        }
    }

    /**
     * Clean up all agents
     */
    destroy(): void {
        for (const agent of this.team.values()) {
            agent.destroy();
        }

        this.team.clear();
        super.destroy();
    }
}
