// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const tabGroups = document.getElementById('tab-groups');
    const searchInput = document.getElementById('search');
    const groupButton = document.getElementById('group-tabs');
  
    function getTabs() {
      return new Promise((resolve) => {
        chrome.tabs.query({}, resolve);
      });
    }
  
    function groupTabs(tabs) {
      const groups = {};
      tabs.forEach(tab => {
        const domain = new URL(tab.url).hostname;
        if (!groups[domain]) groups[domain] = [];
        groups[domain].push(tab);
      });
      return groups;
    }
  
    function displayTabs(groups) {
      tabGroups.innerHTML = '';
      for (const domain in groups) {
        const groupElement = document.createElement('div');
        groupElement.className = 'group';
  
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-header';
        groupHeader.textContent = domain;
        groupElement.appendChild(groupHeader);
  
        groups[domain].forEach(tab => {
          const tabElement = document.createElement('div');
          tabElement.className = 'tab-item';
  
          const favicon = document.createElement('img');
          favicon.className = 'tab-favicon';
          favicon.src = tab.favIconUrl || 'default-favicon.png';
          tabElement.appendChild(favicon);
  
          const tabTitle = document.createElement('span');
          tabTitle.textContent = tab.title;
          tabElement.appendChild(tabTitle);
  
          tabElement.addEventListener('click', function() {
            chrome.tabs.update(tab.id, {active: true});
          });
  
          groupElement.appendChild(tabElement);
        });
  
        tabGroups.appendChild(groupElement);
      }
    }
  
    async function updateDisplay() {
      const tabs = await getTabs();
      const groups = groupTabs(tabs);
      displayTabs(groups);
    }
  
    updateDisplay();
  
    searchInput.addEventListener('input', async function() {
      const tabs = await getTabs();
      const filteredTabs = tabs.filter(tab => 
        tab.title.toLowerCase().includes(searchInput.value.toLowerCase())
      );
      const groups = groupTabs(filteredTabs);
      displayTabs(groups);
    });
  
    groupButton.addEventListener('click', async function() {
      const tabs = await getTabs();
      const groups = groupTabs(tabs);
      
      for (const domain in groups) {
        const tabIds = groups[domain].map(tab => tab.id);
        chrome.tabs.group({tabIds}, function(groupId) {
          chrome.tabGroups.update(groupId, {title: domain});
        });
      }
  
      updateDisplay();
    });
  });