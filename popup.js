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
            });

            tabGroups.appendChild(groupElement);
        }
        updateStats();
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
        return tabs.filter(tab =>
            tab.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
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

    // 添加对 ESC 键的监听
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            window.close();  // 关闭弹出窗口
        }
    });
});