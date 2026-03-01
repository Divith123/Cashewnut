import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class PerplexityProvider extends BaseProvider {
  name = 'Perplexity';
  getApiKeyLink = 'https://www.perplexity.ai/settings/api';

  config = {
    apiTokenKey: 'PERPLEXITY_API_KEY',
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
      defaultApiTokenKey: 'PERPLEXITY_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    // Perplexity does NOT have a /models enumeration endpoint that exists.
    // To prevent a completely empty UI, we fallback to hardcoding their official known models
    // inside getDynamicModels so the provider structure remains intact without triggering 404s.
    const models = [
      { id: 'sonar', name: 'Sonar', context_length: 128000 },
      { id: 'sonar-pro', name: 'Sonar Pro', context_length: 128000 },
      { id: 'sonar-reasoning', name: 'Sonar Reasoning', context_length: 128000 },
      { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', context_length: 128000 },
    ];

    return models.map((m) => ({
      name: m.id,
      label: m.name,
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
      defaultApiTokenKey: 'PERPLEXITY_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const perplexity = createOpenAI({
      baseURL: 'https://api.perplexity.ai/',
      apiKey,
    });

    return perplexity(model);
  }
}
