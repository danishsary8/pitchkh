/**
 * Route changes run inside the View Transitions API where the browser has it
 * (crossfade + the venue photo morphing from card to page). Browsers without
 * it, and users who prefer reduced motion, get the plain page-enter fade.
 */
let finish: (() => void) | null = null;
let active = false;

type TransitionDocument = Document & { startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> } };

export function isViewTransitionActive(): boolean {
  return active;
}

export function navigateWithTransition(run: () => void): void {
  const doc = document as TransitionDocument;
  if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    run();
    return;
  }
  active = true;
  const transition = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
        run();
        // Never hold the screen hostage if the next route is slow.
        window.setTimeout(resolve, 600);
      }),
  );
  transition.finished.catch(() => undefined).finally(() => {
    active = false;
  });
}

/** Called when the new route has committed to the DOM. */
export function completeTransition(): void {
  // Two frames lets the new page paint before the browser snapshots it.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    finish?.();
    finish = null;
  }));
}
