export class HistoryListGuard {
  private sequence = 0;
  private readonly deleted = new Set<number>();

  beginLoad(): number { return ++this.sequence; }
  isCurrent(sequence: number): boolean { return sequence === this.sequence; }
  markDeleted(id: number): void { this.deleted.add(id); }
  restore(id: number): void { this.deleted.delete(id); }
  visible<T extends { id: number }>(items: T[]): T[] { return items.filter(item => !this.deleted.has(item.id)); }
}
