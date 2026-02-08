import confetti from 'canvas-confetti';

// Kubidu brand colors for confetti
const KUBIDU_COLORS = ['#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#10B981', '#0D9488'];

/**
 * Celebrate a successful deployment with confetti 🎉
 */
export function celebrateDeploy() {
  // First burst
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: KUBIDU_COLORS,
  });

  // Second burst after slight delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: KUBIDU_COLORS,
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: KUBIDU_COLORS,
    });
  }, 400);
}

/**
 * Celebrate a project creation
 */
export function celebrateProjectCreation() {
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.5, x: 0.5 },
    colors: KUBIDU_COLORS,
    shapes: ['circle', 'square'],
    scalar: 1.2,
  });
}

/**
 * Subtle success animation
 */
export function subtleSuccess() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: KUBIDU_COLORS,
    gravity: 1.5,
    scalar: 0.8,
  });
}

/**
 * Fireworks-style celebration for milestones
 */
export function fireworksCelebration() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0, colors: KUBIDU_COLORS };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

/**
 * Green leaves falling animation (eco-friendly vibe)
 */
export function greenLeaves() {
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0.5,
    decay: 0.94,
    startVelocity: 20,
    colors: ['#16A34A', '#22C55E', '#4ADE80'],
  };

  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
    shapes: ['circle'],
    origin: { x: 0.2, y: 0.2 },
  });

  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
    shapes: ['circle'],
    origin: { x: 0.8, y: 0.2 },
  });

  confetti({
    ...defaults,
    particleCount: 60,
    scalar: 1.5,
    shapes: ['circle'],
    origin: { x: 0.5, y: 0 },
  });
}

/**
 * Play a subtle success sound
 */
export function playSuccessSound() {
  // Only play if user has interacted with the page
  if (typeof window !== 'undefined' && localStorage.getItem('kubidu_sounds_enabled') === 'true') {
    try {
      const audio = new Audio('data:audio/mp3;base64,//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (e) {
      // Silently fail - sound is optional
    }
  }
}

/**
 * Combined success celebration
 */
export function successCelebration() {
  celebrateDeploy();
  playSuccessSound();
}
