import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { LanguageModelV1 } from 'ai';
import type { IProviderSetting } from '~/types/model';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';

interface AWSBedRockConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export default class AmazonBedrockProvider extends BaseProvider {
  name = 'AmazonBedrock';
  getApiKeyLink = 'https://console.aws.amazon.com/iam/home';

  config = {
    apiTokenKey: 'AWS_BEDROCK_CONFIG',
  };



  private _parseAndValidateConfig(apiKey: string): AWSBedRockConfig {
    let parsedConfig: AWSBedRockConfig;

    try {
      parsedConfig = JSON.parse(apiKey);
    } catch {
      throw new Error(
        'Invalid AWS Bedrock configuration format. Please provide a valid JSON string containing region, accessKeyId, and secretAccessKey.',
      );
    }

    const { region, accessKeyId, secretAccessKey, sessionToken } = parsedConfig;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing required AWS credentials. Configuration must include region, accessKeyId, and secretAccessKey.',
      );
    }

    return {
      region,
      accessKeyId,
      secretAccessKey,
      ...(sessionToken && { sessionToken }),
    };
  }

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
      defaultApiTokenKey: 'AWS_BEDROCK_CONFIG',
    });

    if (!apiKey) {
      return [];
    }

    try {
      const config = this._parseAndValidateConfig(apiKey);
      const client = new BedrockClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          sessionToken: config.sessionToken,
        },
      });

      const command = new ListFoundationModelsCommand({});
      const response = await client.send(command);

      const models = response.modelSummaries || [];

      // Filter to only include text/chat capable models
      const textModels = models.filter(m =>
        m.outputModalities?.includes('TEXT') &&
        m.modelLifecycle?.status === 'ACTIVE'
      );

      return textModels.map((m) => {
        let contextWindow = 32000; // default safe fallback

        // Try to estimate context window based on model ID since Bedrock API doesn't return it
        const id = m.modelId || '';
        if (id.includes('claude-3-5-sonnet') || id.includes('claude-3-haiku') || id.includes('claude-3-opus') || id.includes('claude-3-sonnet')) {
          contextWindow = 200000;
        } else if (id.includes('llama3-1') || id.includes('llama3-2') || id.includes('llama3-8b') || id.includes('llama3-70b')) {
          contextWindow = 128000;
        } else if (id.includes('mistral-large')) {
          contextWindow = 128000;
        } else if (id.includes('cohere.command-r')) {
          contextWindow = 128000;
        } else if (id.includes('titan-text-premier')) {
          contextWindow = 32000;
        }

        return {
          name: m.modelId as string,
          label: `${m.providerName} ${m.modelName} (Dynamic)`,
          provider: this.name,
          maxTokenAllowed: contextWindow,
        };
      });

    } catch (error) {
      console.error('Failed to fetch Amazon Bedrock models:', error);
      return [];
    }
  }

  getModelInstance(options: {
    model: string;
    serverEnv: any;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'AWS_BEDROCK_CONFIG',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const config = this._parseAndValidateConfig(apiKey);
    const bedrock = createAmazonBedrock(config);

    return bedrock(model);
  }
}
