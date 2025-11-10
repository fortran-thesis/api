export interface Investigation {
  scanned_molds: Array<string>;
  treatment: Array<{
    title: string;
    description: string;
  }>;
}
