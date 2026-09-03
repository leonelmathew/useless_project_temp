const quotes = [
  "Why do today what can be put off indefinitely?",
  "Hard work pays off in the future. Laziness pays off right now.",
  "Your pull request can wait. Your mental void cannot.",
  "Every 10 minutes of work deserves 20 minutes of staring into space.",
  "Rome wasn't built in a day, and whoever was building it definitely took a nap."
];

document.addEventListener('DOMContentLoaded', () => {
  const quoteText = document.getElementById('quoteText');
  quoteText.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  const grid = document.getElementById('bubbleGrid');
  for (let i = 0; i < 24; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.addEventListener('click', () => {
      if (!bubble.classList.contains('popped')) {
        bubble.classList.add('popped');
      }
    });
    grid.appendChild(bubble);
  }
});