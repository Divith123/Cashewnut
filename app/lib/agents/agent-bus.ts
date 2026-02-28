/**
 * Cashewnut Agent Message Bus
 *
 * Event-driven pub/sub system for inter-agent communication.
 * All agent messages flow through this bus for traceability.
 */

import type { AgentMessage, AgentRole, MessageType } from './types';

type MessageHandler = (message: AgentMessage) => void;

let messageIdCounter = 0;

function generateMessageId(): string {
    return `msg_${Date.now()}_${++messageIdCounter}`;
}

class AgentMessageBus {
    private handlers: Map<string, Set<MessageHandler>> = new Map();
    private globalHandlers: Set<MessageHandler> = new Set();
    private messageLog: AgentMessage[] = [];

    /**
     * Subscribe to messages for a specific agent role
     */
    subscribe(role: AgentRole | 'all', handler: MessageHandler): () => void {
        if (role === 'all') {
            this.globalHandlers.add(handler);
            return () => this.globalHandlers.delete(handler);
        }

        if (!this.handlers.has(role)) {
            this.handlers.set(role, new Set());
        }

        this.handlers.get(role)!.add(handler);
        return () => this.handlers.get(role)?.delete(handler);
    }

    /**
     * Subscribe to a specific message type
     */
    on(type: MessageType, handler: MessageHandler): () => void {
        const key = `type:${type}`;

        if (!this.handlers.has(key)) {
            this.handlers.set(key, new Set());
        }

        this.handlers.get(key)!.add(handler);
        return () => this.handlers.get(key)?.delete(handler);
    }

    /**
     * Publish a message to the bus
     */
    publish(
        from: AgentRole | 'user',
        to: AgentRole | 'all' | 'user',
        type: MessageType,
        content: string,
        metadata?: Record<string, any>,
    ): AgentMessage {
        const message: AgentMessage = {
            id: generateMessageId(),
            type,
            from,
            to,
            content,
            timestamp: Date.now(),
            metadata,
        };

        this.messageLog.push(message);

        // Notify global handlers
        this.globalHandlers.forEach((handler) => handler(message));

        // Notify role-specific handlers
        if (to !== 'all') {
            this.handlers.get(to)?.forEach((handler) => handler(message));
        } else {
            // Broadcast to all role handlers
            this.handlers.forEach((handlers, key) => {
                if (!key.startsWith('type:')) {
                    handlers.forEach((handler) => handler(message));
                }
            });
        }

        // Notify type-specific handlers
        const typeKey = `type:${type}`;
        this.handlers.get(typeKey)?.forEach((handler) => handler(message));

        return message;
    }

    /**
     * Get the full message log
     */
    getLog(): AgentMessage[] {
        return [...this.messageLog];
    }

    /**
     * Get messages for a specific agent
     */
    getMessagesFor(role: AgentRole): AgentMessage[] {
        return this.messageLog.filter((m) => m.to === role || m.to === 'all' || m.from === role);
    }

    /**
     * Clear all messages and handlers
     */
    clear(): void {
        this.messageLog = [];
        this.handlers.clear();
        this.globalHandlers.clear();
    }
}

// Singleton instance
export const agentBus = new AgentMessageBus();
export type { AgentMessageBus };
