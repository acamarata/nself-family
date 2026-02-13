'use client';

/**
 * Skip-to-content link for keyboard navigation (WCAG 2.1 AA).
 * Rendered at the top of the page, visible only on focus.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}
