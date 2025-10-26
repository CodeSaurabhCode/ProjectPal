const TAB_MAP: Record<string, string> = {
  chat: 'chatTab',
  handbook: 'handbookTab',
  projects: 'projectsTab',
  team: 'teamTab',
};

function initializeNavigation() {
  console.log('[Navigation] Initializing...');
  
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
  
  const hash = window.location.hash.substring(1);
  if (hash && TAB_MAP[hash]) {
    switchTab(hash);
  }
  
  console.log('[Navigation] Initialized');
}

function switchTab(tabName: string) {
  console.log('[Navigation] Switching to tab:', tabName);
  
  const tabId = TAB_MAP[tabName];
  if (!tabId) {
    console.error('[Navigation] Invalid tab:', tabName);
    return;
  }

  const navLinks = document.querySelectorAll('.nav-link[data-tab]');
  navLinks.forEach((link) => {
    const linkTab = (link as HTMLElement).dataset.tab;
    if (linkTab === tabName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach((content) => {
    if (content.id === tabId) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  history.pushState(null, '', `#${tabName}`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
  initializeNavigation();
}

export { switchTab };
