import type { LanguageModelV1 } from 'ai';
import type { IProviderSetting } from '~/types/model';

export interface ModelInfo {
  name: string;
  label: string;
  provider: string;

  /** Maximum context window size (input tokens) - how many tokens the model can process */
  maxTokenAllowed: number;

  /** Maximum completion/output tokens - how many tokens the model can generate. If not specified, falls back to provider defaults */
  maxCompletionTokens?: number;

  isUnverified?: boolean;
  provenance?: {
    doc_url: string;
    fetched_at: string;
    status: string;
  };
}

export interface VerifiedModel extends ModelInfo {
  status: 'active' | 'deprecated' | 'retired' | 'unverified';
  doc_url: string; // The authoritative source URL
  fetched_at: string; // ISO timestamp
  etag?: string; // Optional HTTP ETag or Last-Modified header
  removal_date?: string; // If announced deprecated/retired
  replacement_id?: string; // If provider formally documents a replacement
}

export interface ProviderInfo {
  name: string;
  staticModels: ModelInfo[];
  getDynamicModels?: (
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ) => Promise<ModelInfo[]>;
  getModelInstance: (options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }) => LanguageModelV1;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;
}
export interface ProviderConfig {
  baseUrlKey?: string;
  baseUrl?: string;
  apiTokenKey?: string;
}
