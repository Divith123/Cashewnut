import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class GithubProvider extends BaseProvider {
  name = 'Github';
  getApiKeyLink = 'https://github.com/settings/personal-access-tokens';

  config = {
    apiTokenKey: 'GITHUB_API_KEY',
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
      defaultApiTokenKey: 'GITHUB_API_KEY',
    });

    console.log('GitHub: Attempting to fetch dynamic models from API...');

    try {
      // Fetch dynamic models from GitHub API (works with or without API key for public model listing)
      const fetchOptions: RequestInit = {};

      if (apiKey) {
        fetchOptions.headers = {
          Authorization: `Bearer ${apiKey}`,
        };
      }

      const response = await fetch('https://models.github.ai/v1/models', fetchOptions);

      if (response.ok) {
        const data = (await response.json()) as { data?: any[] };
        console.log('GitHub: Successfully fetched models from API');

        if (data.data && Array.isArray(data.data)) {
          return data.data.map((model: any) => ({
            name: model.id,
            label: model.name || model.id.split('/').pop() || model.id,
            provider: 'Github',
            maxTokenAllowed: model.limits?.max_input_tokens || 128000,
            maxCompletionTokens: model.limits?.max_output_tokens || 16384,
          }));
        }
      } else {
        console.warn('GitHub: API request failed with status:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('GitHub: Failed to fetch models:', error);
    }

    // Return empty array if fetching fails (no static fallback)
    return [];
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    console.log(`GitHub: Creating model instance for ${model}`);

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GITHUB_API_KEY',
    });

    if (!apiKey) {
      console.error('GitHub: No API key found');
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    console.log(`GitHub: Using API key (first 8 chars): ${apiKey.substring(0, 8)}...`);

    const openai = createOpenAI({
      baseURL: 'https://models.github.ai/inference',
      apiKey,
    });

    console.log(`GitHub: Created OpenAI client, requesting model: ${model}`);

    return openai(model);
  }
}
