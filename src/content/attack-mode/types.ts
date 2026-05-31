export type AttackModeChunk = {
  id: string;
  section: string;
  module: string;
  title: string;
  tags: string[];
  content: string;
};

export type AttackModeSearchResult = {
  chunk: AttackModeChunk;
  score: number;
  snippet: string;
  matchIndices: number[];
};
