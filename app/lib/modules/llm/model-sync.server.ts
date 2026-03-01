import fs from 'node:fs/promises';
import path from 'node:path';
import type { VerifiedModel } from './types';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ModelSyncService');

const VERIFIED_MODELS_PATH = path.join(process.cwd(), 'app/lib/modules/llm/verified-models.json');

export interface ModelExtractor {
    providerName: string;
    extractModels(env: Record<string, string>): Promise<VerifiedModel[]>;
}

export class OpenAIExtractor implements ModelExtractor {
    providerName = 'OpenAI';

    async extractModels(env: Record<string, string>): Promise<VerifiedModel[]> {
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
            logger.warn('OpenAI API key missing, skipping sync');
            return [];
        }

        const fetchedAt = new Date().toISOString();
        const verifiedModels: VerifiedModel[] = [];
        const deprecationMap = new Map<string, { status: 'deprecated' | 'retired', removalDate?: string, replacement?: string }>();

        // Step 1: Attempt to scrape OpenAI deprecation page for documented retirements
        try {
            const docUrl = 'https://platform.openai.com/docs/deprecations';
            const docRes = await fetch(docUrl);
            if (docRes.ok) {
                const html = await docRes.text();

                // This is a basic generic heuristic regex to find standard deprecation phrases near a model ID
                // E.g., "gpt-4-0613 will be deprecated on June 13, 2024"
                const regex = /([a-z0-9\-]+(?:-[a-z0-9]+)*).{0,50}?(deprecated|retired|removed|sunset).{0,30}?(\w+\s\d{1,2},\s\d{4}|\d{4}-\d{2}-\d{2})/gi;

                let match;
                while ((match = regex.exec(html)) !== null) {
                    const modelId = match[1];
                    const statusStr = match[2].toLowerCase();
                    const dateStr = match[3];

                    deprecationMap.set(modelId, {
                        status: statusStr.includes('retire') || statusStr.includes('remov') ? 'retired' : 'deprecated',
                        removalDate: dateStr,
                    });
                }
            }
        } catch (e) {
            logger.warn('Failed to scrape OpenAI deprecation docs, relying only on API');
        }

        // Step 2: Fetch official API list
        try {
            const apiRes = await fetch('https://api.openai.com/v1/models', {
                headers: { Authorization: `Bearer ${apiKey}` }
            });

            if (!apiRes.ok) {
                throw new Error(`OpenAI API returned ${apiRes.status}`);
            }

            const etag = apiRes.headers.get('etag') || undefined;
            const data = await apiRes.json() as any;

            if (data && Array.isArray(data.data)) {
                for (const m of data.data) {
                    const id = m.id;
                    const deprecation = deprecationMap.get(id);

                    verifiedModels.push({
                        name: id, // Mapping to standard name format as canonical ID
                        label: id,
                        provider: this.providerName,
                        status: deprecation ? deprecation.status : 'active',
                        removal_date: deprecation ? deprecation.removalDate : undefined,
                        doc_url: 'https://platform.openai.com/docs/models',
                        fetched_at: fetchedAt,
                        etag,
                        maxTokenAllowed: 128000, // Safe default, can be enriched
                    });
                }
            }
        } catch (e) {
            logger.error('Failed to extract OpenAI models', e);
        }

        return verifiedModels;
    }
}

export class OpenRouterExtractor implements ModelExtractor {
    providerName = 'OpenRouter';

    async extractModels(env: Record<string, string>): Promise<VerifiedModel[]> {
        const verifiedModels: VerifiedModel[] = [];
        const fetchedAt = new Date().toISOString();

        try {
            const res = await fetch('https://openrouter.ai/api/v1/models');
            if (!res.ok) {
                throw new Error(`OpenRouter API returned ${res.status}`);
            }

            const etag = res.headers.get('etag') || undefined;
            const data = await res.json() as any;

            if (data && Array.isArray(data.data)) {
                for (const m of data.data) {
                    verifiedModels.push({
                        name: m.id, // Strictly canonical ID, no mapping to other providers
                        label: m.name || m.id,
                        provider: this.providerName,
                        status: 'active', // OpenRouter drops retired models, so if it's in the list it's active
                        doc_url: 'https://openrouter.ai/docs/models',
                        fetched_at: fetchedAt,
                        etag,
                        maxTokenAllowed: m.context_length || 128000,
                        maxCompletionTokens: m.top_provider?.max_completion_tokens || 8192,
                    });
                }
            }
        } catch (e) {
            logger.error('Failed to extract OpenRouter models', e);
        }

        return verifiedModels;
    }
}

export class AnthropicExtractor implements ModelExtractor {
    providerName = 'Anthropic';

    async extractModels(env: Record<string, string>): Promise<VerifiedModel[]> {
        const apiKey = env.ANTHROPIC_API_KEY;
        if (!apiKey) return [];

        const verifiedModels: VerifiedModel[] = [];
        const fetchedAt = new Date().toISOString();

        try {
            const apiRes = await fetch('https://api.anthropic.com/v1/models', {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                }
            });

            if (apiRes.ok) {
                const etag = apiRes.headers.get('etag') || undefined;
                const data = await apiRes.json() as any;

                if (data && Array.isArray(data.data)) {
                    for (const m of data.data) {
                        verifiedModels.push({
                            name: m.id,
                            label: m.display_name || m.id,
                            provider: this.providerName,
                            status: 'active', // Anthropic drops them from standard API usually, or we'd scrape docs.anthropic.com/deprecations
                            doc_url: 'https://docs.anthropic.com/en/docs/about-claude/models',
                            fetched_at: fetchedAt,
                            etag,
                            maxTokenAllowed: 200000,
                        });
                    }
                }
            }
        } catch (e) {
            logger.error(`Failed to extract ${this.providerName} models`, e);
        }
        return verifiedModels;
    }
}

export class TogetherExtractor implements ModelExtractor {
    providerName = 'Together';

    async extractModels(env: Record<string, string>): Promise<VerifiedModel[]> {
        const apiKey = env.TOGETHER_API_KEY;
        if (!apiKey) return [];

        const verifiedModels: VerifiedModel[] = [];
        const fetchedAt = new Date().toISOString();

        try {
            const apiRes = await fetch('https://api.together.xyz/v1/models', {
                headers: { Authorization: `Bearer ${apiKey}` }
            });

            if (apiRes.ok) {
                const etag = apiRes.headers.get('etag') || undefined;
                const data = await apiRes.json() as any;

                if (data && Array.isArray(data)) {
                    for (const m of data) {
                        verifiedModels.push({
                            name: m.id,
                            label: m.display_name || m.id,
                            provider: this.providerName,
                            status: m.status === 'deprecated' ? 'deprecated' : 'active',
                            doc_url: 'https://docs.together.ai/docs/inference-models',
                            fetched_at: fetchedAt,
                            etag,
                            maxTokenAllowed: m.context_length || 32000,
                        });
                    }
                }
            }
        } catch (e) {
            logger.error(`Failed to extract ${this.providerName} models`, e);
        }
        return verifiedModels;
    }
}

export class AzureFoundryExtractor implements ModelExtractor {
    providerName = 'Github'; // Mapping Azure Foundry models via the GitHub provider

    async extractModels(env: Record<string, string>): Promise<VerifiedModel[]> {
        const apiKey = env.GITHUB_TOKEN;
        if (!apiKey) return [];

        const verifiedModels: VerifiedModel[] = [];
        const fetchedAt = new Date().toISOString();

        try {
            const apiRes = await fetch('https://models.github.ai/v1/models', {
                headers: { Authorization: `Bearer ${apiKey}` }
            });

            if (apiRes.ok) {
                const etag = apiRes.headers.get('etag') || undefined;
                const data = await apiRes.json() as any;

                if (data && Array.isArray(data.data)) {
                    for (const m of data.data) {
                        verifiedModels.push({
                            name: m.id,
                            label: m.name || m.id,
                            provider: this.providerName,
                            status: 'active', // GitHub actively trims deprecated models from this list
                            doc_url: 'https://github.com/marketplace/models',
                            fetched_at: fetchedAt,
                            etag,
                            maxTokenAllowed: 128000,
                        });
                    }
                }
            }
        } catch (e) {
            logger.error(`Failed to extract ${this.providerName} models`, e);
        }
        return verifiedModels;
    }
}

export class ModelSyncService {
    private static instance: ModelSyncService;
    private verifiedModels: Map<string, VerifiedModel> = new Map();
    private extractors: ModelExtractor[] = [
        new OpenAIExtractor(),
        new OpenRouterExtractor(),
        new AnthropicExtractor(),
        new TogetherExtractor(),
        new AzureFoundryExtractor(),
    ];

    private constructor() { }

    static getInstance(): ModelSyncService {
        if (!ModelSyncService.instance) {
            ModelSyncService.instance = new ModelSyncService();
        }
        return ModelSyncService.instance;
    }

    async loadVerifiedModels(): Promise<Map<string, VerifiedModel>> {
        try {
            const data = await fs.readFile(VERIFIED_MODELS_PATH, 'utf-8');
            const models: VerifiedModel[] = JSON.parse(data);
            this.verifiedModels = new Map(models.map(m => [`${m.provider}-${m.name}`, m]));
            return this.verifiedModels;
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                logger.info('verified-models.json not found, initializing empty store.');
                return new Map();
            }
            logger.error('Failed to load verified models', e);
            return new Map();
        }
    }

    async saveVerifiedModels(models: VerifiedModel[]) {
        try {
            await fs.writeFile(VERIFIED_MODELS_PATH, JSON.stringify(models, null, 2));
            this.verifiedModels = new Map(models.map(m => [`${m.provider}-${m.name}`, m]));
            logger.info(`Successfully saved ${models.length} verified models.`);
        } catch (e) {
            logger.error('Failed to save verified models', e);
        }
    }

    getVerifiedModels(): VerifiedModel[] {
        return Array.from(this.verifiedModels.values());
    }

    getVerifiedModelsForProvider(providerName: string): VerifiedModel[] {
        return Array.from(this.verifiedModels.values()).filter(m => m.provider === providerName);
    }

    async runFullSync(env: Record<string, string>) {
        logger.info('Starting full model sync for all providers...');
        const allModels: VerifiedModel[] = [];

        for (const extractor of this.extractors) {
            logger.info(`Extracting models for ${extractor.providerName}...`);
            try {
                const models = await extractor.extractModels(env);
                allModels.push(...models);
            } catch (e) {
                logger.error(`Sync failed for ${extractor.providerName}`, e);
            }
        }

        await this.saveVerifiedModels(allModels);
        return allModels;
    }
}
