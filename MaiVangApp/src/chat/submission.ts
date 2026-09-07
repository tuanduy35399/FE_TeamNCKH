export type CapturedSubmission = { submittedText: string; nextComposerText: string };

export function captureSubmission(composerText: string, hasImage: boolean, retry: boolean, isSuggestion: boolean): CapturedSubmission {
  return {
    submittedText: composerText.trim(),
    nextComposerText: !hasImage && !retry && !isSuggestion ? '' : composerText,
  };
}

export type SubmissionLock = { current: boolean };
export function acquireSubmissionLock(lock: SubmissionLock): boolean {
  if (lock.current) return false;
  lock.current = true;
  return true;
}
export function releaseSubmissionLock(lock: SubmissionLock): void { lock.current = false; }

export function imageAfterRequest<T>(selected: T | undefined, outcome: 'success' | 'failed'): T | undefined {
  return outcome === 'success' ? undefined : selected;
}
