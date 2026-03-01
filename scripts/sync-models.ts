import * as dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ModelSyncService } from '../app/lib/modules/llm/model-sync.server';
import type { VerifiedModel } from '../app/lib/modules/llm/types';

dotenv.config();

async function runModelSync() {
    console.log('Starting Authoritative Model Verification Sync...');

    const syncService = ModelSyncService.getInstance();

    // Load existing models to figure out diffs
    await syncService.loadVerifiedModels();
    const oldModels = syncService.getVerifiedModels();
    const oldModelMap = new Map(oldModels.map(m => [`${m.provider}-${m.name}`, m]));

    // Run the full sync
    console.log('Running full sync across all authorized providers...');
    const newModels = await syncService.runFullSync(process.env as Record<string, string>);
    const newModelMap = new Map(newModels.map(m => [`${m.provider}-${m.name}`, m]));

    const added: VerifiedModel[] = [];
    const removed: VerifiedModel[] = [];
    const statusChanged: { model: VerifiedModel, oldStatus: string, newStatus: string }[] = [];

    // Calculate Additions & Status Changes
    for (const newModel of newModels) {
        const key = `${newModel.provider}-${newModel.name}`;
        const oldModel = oldModelMap.get(key);

        if (!oldModel) {
            added.push(newModel);
        } else if (oldModel.status !== newModel.status) {
            statusChanged.push({ model: newModel, oldStatus: oldModel.status, newStatus: newModel.status });
        }
    }

    // Calculate Removals
    for (const oldModel of oldModels) {
        const key = `${oldModel.provider}-${oldModel.name}`;
        if (!newModelMap.has(key)) {
            removed.push(oldModel);
        }
    }

    console.log(`Sync complete. Added: ${added.length}, Removed: ${removed.length}, Changed: ${statusChanged.length}`);

    await generateReport(added, removed, statusChanged);
    console.log('Successfully completed sync and generated report.');
}

async function generateReport(
    added: VerifiedModel[],
    removed: VerifiedModel[],
    statusChanged: { model: VerifiedModel, oldStatus: string, newStatus: string }[]
) {
    const dateStr = new Date().toISOString().split('T')[0];
    const reportPath = path.join(process.cwd(), `reports/model-changes-${dateStr}.md`);

    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    let md = `# Model Sync Report: ${dateStr}\n\n`;
    md += `This report was automatically generated after syncing with authoritative provider endpoints and documentation.\n\n`;

    md += `## Summary\n`;
    md += `- **Models Added:** ${added.length}\n`;
    md += `- **Models Removed:** ${removed.length}\n`;
    md += `- **Lifecycle Status Changes (e.g., Deprecated):** ${statusChanged.length}\n\n`;

    if (added.length > 0) {
        md += `## New Additions\n\n| Provider | Model ID | Tokens | Source |\n|---|---|---|---|\n`;
        for (const m of added) {
            md += `| ${m.provider} | \`${m.name}\` | ${m.maxTokenAllowed || 'Unknown'} | [Docs](${m.doc_url}) |\n`;
        }
        md += `\n`;
    }

    if (statusChanged.length > 0) {
        md += `## Status Changes (Deprecations & Retirements)\n\n| Provider | Model ID | Old Status | New Status | Effective Date |\n|---|---|---|---|---|\n`;
        for (const c of statusChanged) {
            const { model, oldStatus, newStatus } = c;
            md += `| ${model.provider} | \`${model.name}\` | \`${oldStatus}\` | \`${newStatus}\` | ${model.removal_date || 'Unknown'} |\n`;
        }
        md += `\n`;
    }

    if (removed.length > 0) {
        md += `## Removed (Dropped from feeds completely)\n\n| Provider | Model ID | Previous Source |\n|---|---|---|\n`;
        for (const m of removed) {
            md += `| ${m.provider} | \`${m.name}\` | [Docs](${m.doc_url}) |\n`;
        }
        md += `\n`;
    }

    await fs.writeFile(reportPath, md, 'utf-8');
    console.log(`Report written to ${reportPath}`);
}

runModelSync().catch(console.error);
