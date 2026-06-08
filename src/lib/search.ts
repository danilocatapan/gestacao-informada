export interface SearchItem {
  title: string;
  summary: string;
  url: string;
  type: string;
  text: string;
}

export function deduplicateSearchItems(items: SearchItem[]): SearchItem[] {
  const byUrl = new Map<string, SearchItem>();
  for (const item of items) {
    byUrl.set(item.url, item);
  }
  return [...byUrl.values()];
}
