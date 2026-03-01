import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class HuggingFaceProvider extends BaseProvider {
  name = 'HuggingFace';
  getApiKeyLink = 'https://huggingface.co/settings/tokens';

  config = {
    apiTokenKey: 'HuggingFace_API_KEY',
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
      defaultApiTokenKey: 'HuggingFace_API_KEY',
    });

    if (!apiKey) {
      return [];
    }

    try {
      const response = await fetch('https://huggingface.co/api/models?pipeline_tag=text-generation&sort=trending&limit=50', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status}`);
      }

      const models: any[] = await response.json();

      return models.map((m) => ({
        name: m.id,
        label: `${m.id} (Dynamic)`,
        provider: this.name,
        maxTokenAllowed: 32000,
      }));
    } catch (error) {
      console.error('Failed to fetch HuggingFace models:', error);
      return [];
    }
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
      defaultApiTokenKey: 'HuggingFace_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      baseURL: 'https://api-inference.huggingface.co/v1/',
      apiKey,
    });

    return openai(model);
  }
}
