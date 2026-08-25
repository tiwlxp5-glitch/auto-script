import { lazy } from 'react';

/**
 * lazyWithRetry — Fixes FE-01 (ChunkLoadError on new deployments)
 *
 * Analogy: When you push a new Cloudflare build, old JS file names are replaced
 * with new hashes. If a user has the tab open and clicks "Pricing", the browser
 * looks for the OLD file and gets a 404 error.
 *
 * lazyWithRetry acts like an intelligent mechanic: if the file isn't found,
 * it automatically refreshes the page once in the background to grab the
 * newest version, WITHOUT showing a scary crash screen to the user.
 */
export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_force_refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      // Reset the flag on successful load
      window.sessionStorage.setItem('page_has_been_force_refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        // First failure: force reload once to get fresh bundle
        window.sessionStorage.setItem('page_has_been_force_refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      // Second failure: something else is wrong, throw to ErrorBoundary
      throw error;
    }
  });
}
