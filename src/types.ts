export interface DayMeta {
  title: string;
  description?: string;
  tags?: string[];
  ogImage?: string;
  shellMode?: "default" | "compact" | "immersive";
  /**
   * If true, this day is excluded from the main index.
   */
  draft?: boolean;
  /**
   * The content/theme keys if this day was generated from catalogs.
   */
  catalogKeys?: {
    content: string;
    theme: string;
  };
}
