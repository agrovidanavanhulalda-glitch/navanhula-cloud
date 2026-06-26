/**
 * Team event bus — invalidates team-member caches across modules.
 * Emitted by user mutations (create/update/role change/branch change).
 */
export type TeamEventName =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'ROLE_CHANGED'
  | 'BRANCH_CHANGED';

const target: EventTarget =
  typeof window !== 'undefined' ? window : new EventTarget();

export function emitTeamEvent(name: TeamEventName, detail?: unknown) {
  target.dispatchEvent(new CustomEvent(`team:${name}`, { detail }));
  target.dispatchEvent(new CustomEvent('team:ANY', { detail: { name, detail } }));
}

export function onTeamEvent(
  name: TeamEventName | 'ANY',
  cb: (detail?: unknown) => void,
): () => void {
  const handler = (e: Event) => cb((e as CustomEvent).detail);
  target.addEventListener(`team:${name}`, handler);
  return () => target.removeEventListener(`team:${name}`, handler);
}
