import aliasData from '../data/aliases.json';

export interface RuntimeAliases {
  sections: Record<string, string[]>;
  topics: Record<string, string[]>;
  related: Record<string, string[]>;
}

export interface AliasesSource {
  sections: Record<string, string[]>;
  topics: Record<string, string[]>;
  related: Record<string, string[]>;
}

export function extractRuntimeAliases(source: AliasesSource): RuntimeAliases {
  return {
    sections: source.sections,
    topics: source.topics,
    related: source.related,
  };
}

export const runtimeAliases: RuntimeAliases = extractRuntimeAliases(aliasData);
