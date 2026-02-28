/**
 * Cashewnut Base Agent
 *
 * Abstract base class that all specialist agents extend.
 * Provides LLM communication, message bus integration, and memory.
 */

import type { AgentInfo, AgentRole, AgentStatus, Task } from './types';
import { AGENT_ROLES } from './types';
import { agentBus } from './agent-bus';

let agentIdCounter = 0;

export abstract class BaseAgent {
    public info: AgentInfo;
    protected memory: string[] = [];
    protected unsubscribe: (() => void) | null = null;

    constructor(role: AgentRole) {
        const meta = AGENT_ROLES[role];

        this.info = {
            id: `agent_${role}_${++agentIdCounter}`,
            role: meta.role,
            name: meta.name,
            emoji: meta.emoji,
            description: meta.description,
            status: 'idle',
            currentTask: null,
            output: [],
        };

        // Subscribe to messages addressed to this agent
        this.unsubscribe = agentBus.subscribe(role, (message) => {
            if (message.type === 'task-assigned') {
                this.onTaskAssigned(message.content, message.metadata?.task);
            }
        });
    }

    /**
     * Get the system prompt for this agent role
     */
    abstract getSystemPrompt(projectContext: string): string;

    /**
     * Handle an assigned task — implemented by each specialist agent
     */
    abstract executeTask(task: Task, projectContext: string): Promise<string>;

    /**
     * Called when a task is assigned via the message bus
     */
    protected async onTaskAssigned(content: string, task?: Task): Promise<void> {
        if (!task) {
            return;
        }

        this.setStatus('thinking');
        this.info.currentTask = task.title;

        agentBus.publish(this.info.role, 'all', 'agent-thinking', `${this.info.emoji} ${this.info.name} is analyzing: "${task.title}"`);

        try {
            this.setStatus('working');

            const result = await this.executeTask(task, content);

            this.addOutput(result);

            agentBus.publish(this.info.role, 'pm', 'task-completed', result, {
                taskId: task.id,
            });

            this.setStatus('done');
            this.info.currentTask = null;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            agentBus.publish(this.info.role, 'pm', 'task-blocked', `Error: ${errorMsg}`, {
                taskId: task.id,
            });
            this.setStatus('error');
        }
    }

    protected setStatus(status: AgentStatus): void {
        this.info.status = status;
        agentBus.publish(this.info.role, 'all', 'progress-update', `${this.info.name} status: ${status}`, {
            agentId: this.info.id,
            status,
        });
    }

    protected addOutput(output: string): void {
        this.info.output.push(output);
    }

    protected addMemory(item: string): void {
        this.memory.push(item);
    }

    public getMemory(): string[] {
        return [...this.memory];
    }

    public destroy(): void {
        this.unsubscribe?.();
    }
}
