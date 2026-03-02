import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class GithubCopilotProvider extends BaseProvider {
  name = 'GithubCopilot';
  getApiKeyLink = 'https://github.com/settings/copilot';

  config = {
    apiTokenKey: 'GITHUB_COPILOT_API_KEY',
  };

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GITHUB_COPILOT_API_KEY',
    });

    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch(`https://api.githubcopilot.com/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const res = (await response.json()) as any;

        if (res.data && Array.isArray(res.data)) {
          return res.data.map((m: any) => ({
            name: m.id,
            label: `${m.name || m.id} (Copilot)`,
            provider: this.name,
            maxTokenAllowed: m.context_length || 128000,
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch GithubCopilot models via API, falling back to static list', e);
    }

    // Fallback to known Copilot models
    const models = [
      { id: 'gpt-4o', name: 'GPT-4o', context_length: 128000 },
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', context_length: 200000 },
      { id: 'o1-preview', name: 'o1-preview', context_length: 128000 },
      { id: 'o1-mini', name: 'o1-mini', context_length: 128000 },
    ];

    return models.map((m) => ({
      name: m.id,
      label: `${m.name} (Copilot)`,
      provider: this.name,
      maxTokenAllowed: m.context_length,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GITHUB_COPILOT_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      baseURL: 'https://api.githubcopilot.com/',
      apiKey,
    });

    return openai(model);
  }
}
