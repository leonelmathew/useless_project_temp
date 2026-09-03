document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startBtn');
  const timerDisplay = document.getElementById('timerDisplay');
  const modeBadge = document.getElementById('modeBadge');
  const openBreakRoom = document.getElementById('openBreakRoom');

  async function updateUI() {
    const { timerState } = await chrome.storage.local.get(['timerState']);
    if (!timerState) return;

    const mins = Math.floor(timerState.timeLeft / 60);
    const secs = timerState.timeLeft % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (timerState.mode === 'break') {
      modeBadge.textContent = '🌴 Mandatory Break (20m)';
      modeBadge.className = 'badge break';
    } else {
      modeBadge.textContent = '⚠️ Dreaded Work (10m)';
      modeBadge.className = 'badge work';
    }

    if (timerState.isRunning) {
      startBtn.textContent = 'Pause Timer';
      startBtn.classList.add('running');
    } else {
      startBtn.textContent = 'Start Slacking Off';
      startBtn.classList.remove('running');
    }
  }

  startBtn.addEventListener('click', async () => {
    const { timerState } = await chrome.storage.local.get(['timerState']);
    if (!timerState) return;

    timerState.isRunning = !timerState.isRunning;
    await chrome.storage.local.set({ timerState });
    updateUI();

    // If starting and in break mode, open break room right away!
    if (timerState.isRunning && timerState.mode === 'break') {
      const breakUrl = chrome.runtime.getURL('breakroom.html');
      chrome.tabs.create({ url: breakUrl });
    }
  });

  openBreakRoom.addEventListener('click', () => {
    const breakUrl = chrome.runtime.getURL('breakroom.html');
    chrome.tabs.create({ url: breakUrl });
  });

  updateUI();
  setInterval(updateUI, 500);
});