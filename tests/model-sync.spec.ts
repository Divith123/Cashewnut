import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelSyncService, OpenAIExtractor } from '../app/lib/modules/llm/model-sync.server';
import { LLMManager } from '../app/lib/modules/llm/manager';

// Mock fetch globally
global.fetch = vi.fn();

describe('Model Verification Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('OpenAIExtractor Deprecation Scraper', () => {
        it('should accurately parse HTML to find retired and deprecated models', async () => {
            const mockHtml = `
        <div>
          <p>The model gpt-4-0314 will be deprecated on June 13, 2024.</p>
          <p>Please note that gpt-3.5-turbo-0613 is retired.</p>
        </div>
      `;
            const mockApiModels = {
                data: [
                    { id: 'gpt-4-0314' },
                    { id: 'gpt-3.5-turbo-0613' },
                    { id: 'gpt-4o' }
                ]
            };

            // Mock first call to docs/deprecations and second call to API
            (global.fetch as any)
                .mockResolvedValueOnce({ ok: true, text: async () => mockHtml })
                .mockResolvedValueOnce({ ok: true, headers: new Headers({ etag: '123' }), json: async () => mockApiModels });

            const extractor = new OpenAIExtractor();
            const models = await extractor.extractModels({ OPENAI_API_KEY: 'test-key' });

            const gpt4_0314 = models.find((m: any) => m.name === 'gpt-4-0314');
            const gpt35_0613 = models.find((m: any) => m.name === 'gpt-3.5-turbo-0613');
            const gpt4o = models.find((m: any) => m.name === 'gpt-4o');

            expect(gpt4_0314?.status).toBe('deprecated');
            expect(gpt4_0314?.removal_date).toBe('June 13, 2024');

            expect(gpt35_0613?.status).toBe('retired');

            expect(gpt4o?.status).toBe('active');
            expect(gpt4o?.etag).toBe('123');
        });
    });

    describe('LLMManager Status Filtering', () => {
        it('generates provenance data and forces unverified state for missing models', () => {
            const syncService = ModelSyncService.getInstance();

            // Inject fake verified state
            vi.spyOn(syncService, 'getVerifiedModels').mockReturnValue([
                {
                    name: 'authorized-model',
                    label: 'Authorized Model',
                    provider: 'OpenRouter',
                    status: 'active',
                    doc_url: 'http://docs',
                    fetched_at: '2025-01-01T00:00:00.000Z',
                    maxTokenAllowed: 1000
                },
                {
                    name: 'deprecated-model',
                    label: 'Deprecated Model',
                    provider: 'OpenRouter',
                    status: 'deprecated',
                    doc_url: 'http://docs',
                    fetched_at: '2025-01-01T00:00:00.000Z',
                    maxTokenAllowed: 1000
                }
            ]);

            // Using the private apply filter mechanism through public api is hard, let's mock the ModelInfo list
            const llmManager = LLMManager.getInstance();

            // Inject models pre-verification via a hack for testing the private method
            const inputModels = [
                { name: 'authorized-model', label: 'Auth', provider: 'OpenRouter', maxTokenAllowed: 1 },
                { name: 'deprecated-model', label: 'Dep', provider: 'OpenRouter', maxTokenAllowed: 1 },
                { name: 'fake-rogue-model', label: 'Rogue', provider: 'OpenRouter', maxTokenAllowed: 1 }
            ];

            const filtered = (llmManager as any)._applyVerificationStatus(inputModels);

            // Deprecated should be removed
            expect(filtered.some((m: any) => m.name === 'deprecated-model')).toBe(false);

            // Authorized should have provenance
            const auth = filtered.find((m: any) => m.name === 'authorized-model');
            expect(auth?.provenance?.status).toBe('active');

            // Fake rogue model should be retained but marked unverified
            const rogue = filtered.find((m: any) => m.name === 'fake-rogue-model');
            expect(rogue?.isUnverified).toBe(true);
            expect(rogue?.label).toContain('(Unverified)');
        });
    });
});
