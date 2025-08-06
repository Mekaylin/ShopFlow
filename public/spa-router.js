/* For SPA routing support */

/* Development server fallback for client-side routing */
if ('serviceWorker' in navigator) {
  // Register service worker for production builds
  navigator.serviceWorker.register('/service-worker.js');
}

/* Handle direct navigation to routes in development */
(function() {
  const currentPath = window.location.pathname;
  
  // If we're not on the root path and this looks like a route navigation
  if (currentPath !== '/' && !currentPath.includes('.') && !currentPath.includes('_expo')) {
    // For development, ensure the router can handle the current path
    console.log('[SPA Router] Handling direct navigation to:', currentPath);
    
    // This will help Expo Router understand we're doing client-side routing
    window.history.replaceState(null, '', currentPath);
  }
})();
