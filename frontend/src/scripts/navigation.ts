/**
 * Navigation Script
 * Handles tab switching between Chat, Handbook, Projects, and Team
 */

// Tab mapping
const TAB_MAP: Record<string, string> = {
  chat: 'chatTab',
  handbook: 'handbookTab',
  projects: 'projectsTab',
  team: 'teamTab',
};

/**
 * Initialize navigation
 */
function initializeNavigation() {
  console.log('[Navigation] Initializing...');
  
  // Get all nav links
  const navLinks = document.querySelectorAll('.nav-link[data-tab]');
  
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const tab = (link as HTMLElement).dataset.tab;
      if (tab) {
        switchTab(tab);
      }
    });
  });
  
  // Check URL hash for initial tab
  const hash = window.location.hash.substring(1);
  if (hash && TAB_MAP[hash]) {
    switchTab(hash);
  }
  
  console.log('[Navigation] Initialized');
}

/**
 * Switch to a specific tab
 */
function switchTab(tabName: string) {
  console.log('[Navigation] Switching to tab:', tabName);
  
  const tabId = TAB_MAP[tabName];
  if (!tabId) {
    console.error('[Navigation] Invalid tab:', tabName);
    return;
  }
  
  // Update nav links
  const navLinks = document.querySelectorAll('.nav-link[data-tab]');
  navLinks.forEach((link) => {
    const linkTab = (link as HTMLElement).dataset.tab;
    if (linkTab === tabName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Update tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach((content) => {
    if (content.id === tabId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
  
  // Update URL hash (without scrolling)
  history.pushState(null, '', `#${tabName}`);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
  initializeNavigation();
}

// Export for external use
export { switchTab };
