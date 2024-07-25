chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.sendMessage({action: "popupOpened"});
});

let lastActiveTabId = null;

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const currentTab = await chrome.tabs.get(activeInfo.tabId);
  
  // 如果有上一个激活的标签，取消其固定状态
  if (lastActiveTabId) {
    const lastTab = await chrome.tabs.get(lastActiveTabId);
    if (lastTab.pinned) {
      await chrome.tabs.update(lastActiveTabId, { pinned: false });
    }
  }
  
  // 固定当前激活的标签
  if (!currentTab.pinned) {
    await chrome.tabs.update(activeInfo.tabId, { pinned: true });
    
    // 将固定的标签移动到最左边
    await chrome.tabs.move(activeInfo.tabId, { index: 0 });
  }
  
  lastActiveTabId = activeInfo.tabId;
});