document.addEventListener('DOMContentLoaded', function () {
    const tabGroups = document.getElementById('tab-groups');
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort-select');
    const groupButton = document.getElementById('group-tabs');
    const saveSessionButton = document.getElementById('save-session');
    const loadSessionButton = document.getElementById('load-session');
    const closeSelectedButton = document.getElementById('close-selected');
    const statsDiv = document.getElementById('stats');

    let allTabs = [];

    // searchInput 自动聚焦
    searchInput.focus();

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
        let tabIndex = 1;
        const tabElements = [];

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
                tabElement.dataset.tabId = tab.id;

                if (tabIndex <= 9) {
                    const shortcutSpan = document.createElement('span');
                    shortcutSpan.className = 'tab-shortcut';
                    shortcutSpan.textContent = tabIndex;
                    tabElement.appendChild(shortcutSpan);
                }

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'tab-checkbox';
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                tabElement.appendChild(checkbox);

                const favicon = document.createElement('img');
                favicon.className = 'tab-favicon';
                favicon.src = tab.favIconUrl || 'default-favicon.png';
                tabElement.appendChild(favicon);

                const tabTitle = document.createElement('span');
                tabTitle.textContent = tab.title;
                tabElement.appendChild(tabTitle);

                const closeButton = document.createElement('span');
                closeButton.className = 'tab-close';
                closeButton.textContent = '✕';
                closeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    chrome.tabs.remove(tab.id);
                    tabElement.remove();
                    updateStats();
                });
                tabElement.appendChild(closeButton);

                tabElement.addEventListener('click', function (e) {
                    if (e.target !== checkbox) {
                        chrome.tabs.update(tab.id, { active: true });
                    }
                });

                groupElement.appendChild(tabElement);
                tabElements.push(tabElement);
                tabIndex++;
            });

            tabGroups.appendChild(groupElement);
        }

        updateStats();
        return tabElements;
    }

    function getDisplayWithFilter(searchTerm) {
        const filteredTabs = filterTabs(allTabs, searchTerm);
        const groups = groupTabs(filteredTabs);
        const tabElements = displayTabs(groups);
        return { count: filteredTabs.length, elements: tabElements };
    }

    function updateStats() {
        const totalTabs = allTabs.length;
        const totalDomains = Object.keys(groupTabs(allTabs)).length;
        statsDiv.textContent = `总标签数: ${totalTabs} | 总域名数: ${totalDomains}`;
    }

    function sortTabs(tabs, method) {
        switch (method) {
            case 'title':
                return tabs.sort((a, b) => a.title.localeCompare(b.title));
            case 'domain':
                return tabs.sort((a, b) => {
                    const domainA = new URL(a.url).hostname;
                    const domainB = new URL(b.url).hostname;
                    return domainA.localeCompare(domainB);
                });
            default:
                return tabs;
        }
    }

    function filterTabs(tabs, searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return tabs.filter(tab => {
            const title = tab.title.toLowerCase();
            const url = new URL(tab.url);
            const domain = url.hostname.toLowerCase();
            const fullUrl = tab.url.toLowerCase();

            // 检查标题
            if (title.includes(searchLower)) {
                return true;
            }

            // 检查完整URL
            if (fullUrl.includes(searchLower)) {
                return true;
            }

            // 检查域名及其部分
            const domainParts = domain.split('.');
            return domainParts.some(part => part.includes(searchLower));
        });
    }

    function updateDisplayWithFilter(searchTerm) {
        const filteredTabs = filterTabs(allTabs, searchTerm);
        const groups = groupTabs(filteredTabs);
        displayTabs(groups);
        return filteredTabs.length;
    }

    async function updateDisplay() {
        allTabs = await getTabs();
        const groups = groupTabs(allTabs);
        displayTabs(groups);
    }

    updateDisplay();

    // 修改搜索输入事件处理器
    searchInput.addEventListener('input', function () {
        updateDisplayWithFilter(this.value);
    });

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const filteredCount = updateDisplayWithFilter(this.value);
            if (filteredCount === 1) {
                const singleTab = document.querySelector('.tab-item');
                if (singleTab) {
                    const tabId = parseInt(singleTab.dataset.tabId);
                    chrome.tabs.update(tabId, { active: true });
                    window.close();
                }
            }
        } else if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault(); // 阻止默认行为，如 Ctrl+1 打开第一个书签
            const index = parseInt(e.key) - 1;
            const filteredResult = getDisplayWithFilter(searchInput.value);
            if (filteredResult.count <= 9 && index < filteredResult.count) {
                const tabElement = filteredResult.elements[index];
                const tabId = parseInt(tabElement.dataset.tabId);
                chrome.tabs.update(tabId, { active: true });
                window.close();
            }
        }
    });

    // 添加数字键快捷方式
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            window.close();  // 关闭弹出窗口
        } else if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
            e.preventDefault(); // 阻止默认行为，如 Ctrl+1 打开第一个书签
            const index = parseInt(e.key) - 1;
            const filteredResult = getDisplayWithFilter(searchInput.value);
            if (filteredResult.count <= 9 && index < filteredResult.count) {
                const tabElement = filteredResult.elements[index];
                const tabId = parseInt(tabElement.dataset.tabId);
                chrome.tabs.update(tabId, { active: true });
                window.close();
            }
        }
    });

    sortSelect.addEventListener('change', function () {
        const sortedTabs = sortTabs(allTabs, this.value);
        const groups = groupTabs(sortedTabs);
        displayTabs(groups);
    });

    groupButton.addEventListener('click', async function () {
        const tabs = await getTabs();
        const groups = groupTabs(tabs);

        for (const domain in groups) {
            const tabIds = groups[domain].map(tab => tab.id);
            chrome.tabs.group({ tabIds }, function (groupId) {
                chrome.tabGroups.update(groupId, { title: domain });
            });
        }

        updateDisplay();
    });

    saveSessionButton.addEventListener('click', function () {
        const session = allTabs.map(tab => ({ url: tab.url, title: tab.title }));
        localStorage.setItem('savedSession', JSON.stringify(session));
        alert('会话已保存');
    });

    loadSessionButton.addEventListener('click', function () {
        const savedSession = JSON.parse(localStorage.getItem('savedSession'));
        if (savedSession) {
            savedSession.forEach(tab => {
                chrome.tabs.create({ url: tab.url });
            });
            alert('会话已加载');
        } else {
            alert('没有保存的会话');
        }
    });

    closeSelectedButton.addEventListener('click', function () {
        const checkboxes = document.querySelectorAll('.tab-checkbox:checked');
        const tabIds = Array.from(checkboxes).map(checkbox =>
            parseInt(checkbox.closest('.tab-item').dataset.tabId)
        );
        chrome.tabs.remove(tabIds);
        updateDisplay();
    });


    const recentTabsList = document.getElementById('recent-tabs-list');
    // 获取并显示最近关闭的标签页
    function displayRecentTabs() {
        chrome.history.search({ text: '', maxResults: 10 }, function (historyItems) {
            recentTabsList.innerHTML = '';
            const recentTabs = historyItems.filter(item => item.url !== undefined);

            recentTabs.forEach((tab, index) => {
                const tabElement = document.createElement('div');
                tabElement.className = 'recent-tab-item';

                const favicon = document.createElement('img');
                favicon.className = 'tab-favicon';
                favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}`;
                tabElement.appendChild(favicon);

                const tabTitle = document.createElement('span');
                tabTitle.textContent = tab.title || tab.url;
                tabElement.appendChild(tabTitle);

                tabElement.addEventListener('click', function () {
                    chrome.tabs.create({ url: tab.url });
                });

                recentTabsList.appendChild(tabElement);
            });
        });
    }

    // 初始显示最近关闭的标签页
    displayRecentTabs();

    // 每次打开插件时刷新最近关闭的标签页列表
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action === "popupOpened") {
            displayRecentTabs();
        }
    });




    const commandInput = document.getElementById('command-input');

    // 命令处理函数
    const commands = {
        '/help': () => {
            return `可用命令：
        /help - 显示帮助信息
        /close_duplicates - 关闭所有重复标签
        /bookmark_all - 将所有标签保存为书签
        /close_all - 关闭所有标签（保留当前标签）
        /close_left - 关闭左侧所有标签
        /close_right - 关闭右侧所有标签`;
        },
        '/close_duplicates': async () => {
            const tabs = await getTabs();
            const uniqueUrls = new Set();
            const duplicates = [];
            tabs.forEach(tab => {
                if (uniqueUrls.has(tab.url)) {
                    duplicates.push(tab.id);
                } else {
                    uniqueUrls.add(tab.url);
                }
            });
            await chrome.tabs.remove(duplicates);
            return `已关闭 ${duplicates.length} 个重复标签`;
        },
        '/bookmark_all': async () => {
            const tabs = await getTabs();
            const folder = await chrome.bookmarks.create({ title: 'Saved Tabs ' + new Date().toLocaleString() });
            for (const tab of tabs) {
                await chrome.bookmarks.create({ parentId: folder.id, title: tab.title, url: tab.url });
            }
            return `已将 ${tabs.length} 个标签保存为书签`;
        },
        '/close_all': async () => {
            const tabs = await getTabs();
            const currentTab = tabs.find(tab => tab.active);
            const tabsToClose = tabs.filter(tab => tab.id !== currentTab.id).map(tab => tab.id);
            await chrome.tabs.remove(tabsToClose);
            return `已关闭 ${tabsToClose.length} 个标签`;
        },
        '/close_left': async () => {
            const tabs = await getTabs();
            const currentTabIndex = tabs.findIndex(tab => tab.active);
            const tabsToClose = tabs.slice(0, currentTabIndex).map(tab => tab.id);
            await chrome.tabs.remove(tabsToClose);
            return `已关闭左侧 ${tabsToClose.length} 个标签`;
        },
        '/close_right': async () => {
            const tabs = await getTabs();
            const currentTabIndex = tabs.findIndex(tab => tab.active);
            const tabsToClose = tabs.slice(currentTabIndex + 1).map(tab => tab.id);
            await chrome.tabs.remove(tabsToClose);
            return `已关闭右侧 ${tabsToClose.length} 个标签`;
        }
    };

    // 处理命令输入
    commandInput.addEventListener('keydown', async function (e) {
        if (e.key === 'Enter') {
            const command = this.value.trim().toLowerCase();
            let result = '';

            if (commands[command]) {
                result = await commands[command]();
            } else {
                result = '未知命令。输入 /help 查看可用命令。';
            }

            // 显示命令执行结果
            const resultElement = document.createElement('div');
            resultElement.className = 'command-result';
            resultElement.textContent = result;
            this.parentNode.insertBefore(resultElement, this.nextSibling);

            // 清空输入框
            this.value = '';

            // 更新标签页显示
            updateDisplay();
        }
    });
});