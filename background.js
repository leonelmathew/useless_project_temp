const WORK_TIME = 10 * 60;  // 10 minutes
const BREAK_TIME = 20 * 60; // 20 minutes

// Initialize state to BREAK mode on load
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    mode: 'BREAK',
    timeLeft: BREAK_TIME,
    active: true
  });
  startTimer();
});

function startTimer() {
  chrome.alarms.create('timerTick', { periodInMinutes: 1 / 60 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'timerTick') {
    chrome.storage.local.get(['mode', 'timeLeft', 'active'], (data) => {
      if (!data.active) return;

      let newTime = data.timeLeft - 1;
      let currentMode = data.mode;

      if (newTime <= 0) {
        currentMode = (currentMode === 'BREAK') ? 'WORK' : 'BREAK';
        newTime = (currentMode === 'BREAK') ? BREAK_TIME : WORK_TIME;
      }

      chrome.storage.local.set({ mode: currentMode, timeLeft: newTime });

      if (currentMode === 'BREAK') {
        enforceBreakRoom();
      }
    });
  }
});

// Tab closure engine with safety locks
async function enforceBreakRoom() {
  const breakPageUrl = chrome.runtime.getURL('breakroom.html');
  const tabs = await chrome.tabs.query({});

  let breakRoomExists = false;

  for (const tab of tabs) {
    if (!tab.url) continue;

    // SAFE SPOTS: Ignore extensions page, new tabs, or internal chrome/brave pages
    const isSafeUrl = tab.url.startsWith('chrome://') || 
                      tab.url.startsWith('brave://') || 
                      tab.url.startsWith('chrome-extension://');

    if (tab.url.includes('breakroom.html')) {
      breakRoomExists = true;
    } else if (!isSafeUrl) {
      // Close any actual work/web tab during break time
      chrome.tabs.remove(tab.id);
    }
  }

  // Open the Break Room if it's not already open
  if (!breakRoomExists) {
    chrome.tabs.create({ url: breakPageUrl });
  }
}