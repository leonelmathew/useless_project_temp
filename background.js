// Anti-Productivity Timer - Background Service Worker
// Enforces 20m Break / 10m Work. STARTS WITH BREAK FIRST!

const DEFAULT_STATE = {
  isRunning: false,
  mode: 'break', // starts with break time first
  breakSeconds: 20 * 60,
  workSeconds: 10 * 60,
  timeLeft: 20 * 60,
  tabsClosedCount: 0
};

// Initialize default state
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['timerState']);
  if (!data.timerState) {
    await chrome.storage.local.set({ timerState: DEFAULT_STATE });
  }
  chrome.alarms.create('antiProductivityTick', { periodInMinutes: 1 / 60 }); // 1 second
});

// Alarm tick listener
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'antiProductivityTick') return;
  const { timerState } = await chrome.storage.local.get(['timerState']);
  if (!timerState || !timerState.isRunning) return;

  let newTimeLeft = timerState.timeLeft - 1;
  let newMode = timerState.mode;

  if (newTimeLeft <= 0) {
    if (timerState.mode === 'break') {
      newMode = 'work';
      newTimeLeft = timerState.workSeconds;
    } else {
      newMode = 'break';
      newTimeLeft = timerState.breakSeconds;
      // When break begins, enforce tab disruption!
      enforceBreakRoom();
    }
  }

  await chrome.storage.local.set({
    timerState: {
      ...timerState,
      timeLeft: newTimeLeft,
      mode: newMode
    }
  });

  // Update badge on extension icon
  const mins = Math.floor(newTimeLeft / 60);
  const secs = newTimeLeft % 60;
  const badgeText = mins > 0 ? `${mins}m` : `${secs}s`;
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({
    color: newMode === 'break' ? '#10b981' : '#f43f5e'
  });

  // If in break mode, ensure user is not working
  if (newMode === 'break') {
    checkActiveTabForWork();
  }
});

// Monitor when user switches or updates tabs
chrome.tabs.onActivated.addListener(() => {
  checkActiveTabForWork();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    checkActiveTabForWork();
  }
});

async function checkActiveTabForWork() {
  const { timerState } = await chrome.storage.local.get(['timerState']);
  if (!timerState || !timerState.isRunning || timerState.mode !== 'break') return;

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || !activeTab.url) return;

  const breakRoomUrl = chrome.runtime.getURL('breakroom.html');
  if (activeTab.url.startsWith(breakRoomUrl) || activeTab.url.startsWith('chrome://')) {
    return; // Break room and internal settings are permitted
  }

  // Work tab detected during break! Close it and redirect to Break Room!
  console.log('Work detected during mandatory break! Closing tab:', activeTab.url);
  try {
    // Increment closed count
    timerState.tabsClosedCount = (timerState.tabsClosedCount || 0) + 1;
    await chrome.storage.local.set({ timerState });

    // Open or switch to breakroom
    await enforceBreakRoom();
    // Close the unauthorized work tab
    await chrome.tabs.remove(activeTab.id);
  } catch (e) {
    console.error('Error closing work tab:', e);
  }
}

async function enforceBreakRoom() {
  const breakRoomUrl = chrome.runtime.getURL('breakroom.html');
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const existingBreakTab = tabs.find(t => t.url && t.url.startsWith(breakRoomUrl));

  if (existingBreakTab && existingBreakTab.id) {
    await chrome.tabs.update(existingBreakTab.id, { active: true });
  } else {
    await chrome.tabs.create({ url: breakRoomUrl, active: true });
  }
}
