/**
 * Cashewnut Task Decomposer
 *
 * Takes a project description and produces a structured task breakdown
 * with dependencies, phases, and agent assignments.
 */

import type { AgentRole, Phase, Task } from './types';

let taskIdCounter = 0;

function createTask(
    title: string,
    description: string,
    phase: Phase,
    assignee: AgentRole,
    dependencies: string[] = [],
): Task {
    const id = `task_${++taskIdCounter}`;

    return {
        id,
        title,
        description,
        assignee,
        status: 'pending',
        phase,
        dependencies,
        output: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

/**
 * Default task decomposition for a typical web application project.
 * The PM agent will call this to produce the initial task breakdown,
 * then may refine it based on the user's actual requirements.
 */
export function decomposeProjectTasks(projectName: string, projectDescription: string): Task[] {
    const tasks: Task[] = [];

    // ── Phase 1: Research ──────────────────────────────────────
    const researchTask = createTask(
        `Research best technology stack for ${projectName}`,
        `Analyze the project requirements: "${projectDescription}". Research the latest stable frameworks, libraries, and tools. Check npm/package registries for latest versions. Validate security and community support. Recommend a technology stack.`,
        'research',
        'researcher',
    );
    tasks.push(researchTask);

    // ── Phase 2: Design ────────────────────────────────────────
    const designTask = createTask(
        `Design UI/UX for ${projectName}`,
        `Based on the project requirements and recommended tech stack, create: 1) Component hierarchy 2) Design tokens (colors, typography, spacing) 3) Page layouts 4) Responsive breakpoints 5) User flow diagrams.`,
        'design',
        'designer',
        [researchTask.id],
    );
    tasks.push(designTask);

    // ── Phase 3: Development ───────────────────────────────────
    const scaffoldTask = createTask(
        `Scaffold project structure`,
        `Initialize the project with the recommended framework. Set up package.json, dependencies, folder structure, linting, and basic configuration.`,
        'development',
        'devops',
        [designTask.id],
    );
    tasks.push(scaffoldTask);

    const backendTask = createTask(
        `Build backend API and database`,
        `Create API routes, database schema, models, authentication, and server-side logic based on the project requirements.`,
        'development',
        'backend-dev',
        [scaffoldTask.id],
    );
    tasks.push(backendTask);

    const frontendTask = createTask(
        `Build frontend UI components and pages`,
        `Implement all UI components, pages, routing, state management, and styling based on the design specifications.`,
        'development',
        'frontend-dev',
        [scaffoldTask.id, designTask.id],
    );
    tasks.push(frontendTask);

    // ── Phase 4: Testing ───────────────────────────────────────
    const testTask = createTask(
        `Test and review all code`,
        `Review all generated code for bugs, security issues, and best practices. Generate unit tests. Run tests and report results.`,
        'testing',
        'qa',
        [backendTask.id, frontendTask.id],
    );
    tasks.push(testTask);

    // ── Phase 5: Deployment ────────────────────────────────────
    const deployTask = createTask(
        `Prepare for deployment`,
        `Configure build scripts, environment variables, and deployment settings. Ensure the application builds cleanly and is ready to deploy.`,
        'deployment',
        'devops',
        [testTask.id],
    );
    tasks.push(deployTask);

    return tasks;
}

/**
 * Get the next executable tasks (those with all dependencies met)
 */
export function getExecutableTasks(tasks: Task[]): Task[] {
    const doneTasks = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.id));

    return tasks.filter((task) => {
        if (task.status !== 'pending') {
            return false;
        }

        return task.dependencies.every((depId) => doneTasks.has(depId));
    });
}

/**
 * Get tasks by phase
 */
export function getTasksByPhase(tasks: Task[], phase: Phase): Task[] {
    return tasks.filter((t) => t.phase === phase);
}
