export type GameMode = 'standard' | 'extended';
export type GameState = 
  | 'START' 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'TRANSFER_STEP_1' 
  | 'TRANSFER_STEP_2' 
  | 'TRANSFER_OTP' 
  | 'PAUSED'
  | 'ENDED';

export interface MachineContext {
  state: GameState;
  previousState: GameState | null;
  mode: GameMode;
  startTime: number;
  pauseTime: number;
  totalPausedTime: number;
  globalDurationMs: number;
  
  // OTP logic
  otpQueue: number[];
  otpDelivered: boolean;
  otpResendCount: number;
  lastOtpArrival: number | null;
  
  notifiedIds: Set<string>;
  currentCaptcha: string;
}

const SCAMMER_NOTIFICATIONS: { id: string; triggerMs: number; text: string; modes: GameMode[] }[] = [
  { id: 'n1', triggerMs: 5000, text: 'You have 3 minutes.', modes: ['standard'] },
  { id: 'n1_ext', triggerMs: 5000, text: 'You have 10 minutes. Do exactly as I say.', modes: ['extended'] },
  { id: 'n2', triggerMs: 45000, text: 'Why is this taking so long? Do not call anyone. We are monitoring your phone.', modes: ['standard', 'extended'] },
  { id: 'n3', triggerMs: 90000, text: 'Your child is crying. Transfer the 1 Crore now.', modes: ['standard', 'extended'] },
  { id: 'n4', triggerMs: 140000, text: '50 seconds left. The FIR gets filed and you go to jail.', modes: ['standard'] },
  { id: 'n5', triggerMs: 165000, text: 'JUST PRESS SUBMIT! PRESS IT!', modes: ['standard'] },
  { id: 'n4_ext', triggerMs: 300000, text: '5 minutes left. The FIR gets filed and you go to jail.', modes: ['extended'] },
  { id: 'n5_ext', triggerMs: 580000, text: 'JUST PRESS SUBMIT! PRESS IT!', modes: ['extended'] },
];

let ctx: MachineContext = {
  state: 'START',
  previousState: null,
  mode: 'standard',
  startTime: 0,
  pauseTime: 0,
  totalPausedTime: 0,
  globalDurationMs: 180000,
  otpQueue: [],
  otpDelivered: false,
  otpResendCount: 0,
  lastOtpArrival: null,
  notifiedIds: new Set(),
  currentCaptcha: ''
};

function getEl(id: string) { return document.getElementById(id); }

function getElapsedMs() {
  if (ctx.state === 'START' || ctx.startTime === 0) return 0;
  if (ctx.state === 'PAUSED') {
    return ctx.pauseTime - ctx.startTime - ctx.totalPausedTime;
  }
  return Date.now() - ctx.startTime - ctx.totalPausedTime;
}

function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjklmnpqrstuvwxyz23456789';
  let res = '';
  let displayHtml = '';
  for (let i=0; i<5; i++) {
    const char = chars.charAt(Math.floor(Math.random() * chars.length));
    res += char;
    
    displayHtml += `<span class="inline-block transform" style="rotate: ${Math.random() * 20 - 10}deg">${char}</span>`;
  }
  ctx.currentCaptcha = res;
  
  const display = getEl('captcha-display');
  const sr = getEl('captcha-sr-text');
  if (display && sr) {
    display.innerHTML = displayHtml;
    display.style.textTransform = 'none'; // Clear the global lowercase
    sr.textContent = `Security code is: ${res}`;
  }
}

function executeEnding(title: string, desc: string, isWin: boolean) {
  const modal = getEl('fade-screen');
  if (!modal) return;
  getEl('fade-title')!.textContent = title;
  getEl('fade-desc')!.textContent = desc;
  
  getEl('bank-ui')?.setAttribute('inert', 'true');
  getEl('simulated-phone')?.setAttribute('inert', 'true');
  
  modal.classList.remove('hidden');
  getEl('fade-title')?.focus(); // Force screen reader to read the title
  
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
  });
  
  setTimeout(() => {
    getEl('btn-restart')?.classList.remove('hidden');
  }, 2000);
}

function triggerEnding(endingKey: string) {
  if (ctx.state === 'PAUSED' || ctx.state === 'ENDED') return;
  
  const elapsed = getElapsedMs();
  if (endingKey !== 'TIMEOUT' && elapsed >= ctx.globalDurationMs) {
    endingKey = 'TIMEOUT';
  }
  
  ctx.state = 'ENDED';

  if (endingKey === 'TIMEOUT') {
    pushNotification('Time is up. The FIR is filed.');
    setTimeout(() => executeEnding('YOU WON', 'The session timed out. You survived the pressure.', true), 3000);
  } else if (endingKey === 'OTP_EXPIRY') {
    pushNotification('You took too long! Submit it!');
    setTimeout(() => executeEnding('YOU WON', 'The OTP expired and the session was terminated.', true), 3000);
  } else if (endingKey === 'TRAGIC') {
    const amt = getEl('transfer-amount') as HTMLInputElement;
    if (amt) amt.disabled = true;
    pushNotification('We received it. Thanks idiot.');
    setTimeout(() => executeEnding('YOU LOST', '₹1,00,00,000.00 was successfully debited to the scammer.', false), 3000);
  } else if (endingKey === 'RESISTANCE' || endingKey === 'FRAUD_FREEZE') {
    pushNotification('Who are you calling?! We can see your screen!');
    setTimeout(() => executeEnding('YOU WON', 'You successfully froze the account and thwarted the scammer.', true), 3000);
  } else if (endingKey === 'DEBT') {
    pushNotification('What are you doing? Transfer the money!');
    setTimeout(() => executeEnding('YOU LOST', 'You took out a ₹50 Lakh loan while panicking.', false), 3000);
  } else if (endingKey === 'CORRUPT_COP') {
    pushNotification('WHAT?! Who is banging on my door?!');
    setTimeout(() => executeEnding('SECRET GOOD ENDING', 'You called the cyber police. They immediately deployed a SWAT team through the scammer\'s ceiling tiles.', true), 3000);
  } else if (endingKey === 'MAINTENANCE') {
    pushNotification('What are you doing?! Do the transfer!');
    setTimeout(() => executeEnding('YOU WON', 'The bank went down for scheduled maintenance.', true), 3000);
  } else if (endingKey === 'WAF') {
    getEl('waf-container')?.classList.remove('hidden');
    pushNotification('Why is it saying blocked?! Use another browser!');
    setTimeout(() => executeEnding('YOU WON', 'You were blocked by CloudFront WAF rate limiting.', true), 3000);
  }
}

function pushNotification(text: string) {
  if (ctx.state === 'PAUSED' || ctx.state === 'START') return;
  const tray = getEl('notification-tray');
  if (!tray) return;

  const notif = document.createElement('div');
  notif.className = 'bg-white border-l-4 border-red-500 shadow-xl p-3 transform transition-all duration-300 translate-x-full pointer-events-auto flex items-start justify-between';
  notif.innerHTML = `
    <div>
      <div class="text-[10px] text-red-500 font-bold mb-1">NEW MESSAGE</div>
      <div class="text-sm text-slate-800 font-medium">${text}</div>
    </div>
    <button class="notif-close text-slate-400 hover:text-slate-600 ml-2" aria-label="Dismiss">✕</button>
  `;
  tray.appendChild(notif);

  requestAnimationFrame(() => {
    notif.classList.remove('translate-x-full');
  });

  notif.querySelector('.notif-close')?.addEventListener('click', () => {
    notif.classList.add('translate-x-full');
    setTimeout(() => notif.remove(), 300);
  });
}


function triggerFakeAlert(msg: string) {
  const modal = getEl('fake-alert-modal');
  const msgEl = getEl('fake-alert-msg');
  if (modal && msgEl) {
    msgEl.textContent = msg;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    getEl('btn-ok-alert')?.focus();
  }
}

// Global blockers
document.addEventListener('contextmenu', e => {
  e.preventDefault();
  triggerFakeAlert('Right-click is disabled for security purposes.');
});

document.addEventListener('paste', e => {
  e.preventDefault();
  triggerFakeAlert('Pasting is strictly forbidden. Please use the virtual keyboard.');
});

getEl('btn-close-alert')?.addEventListener('click', () => {
  getEl('fake-alert-modal')?.classList.add('hidden');
  getEl('fake-alert-modal')?.classList.remove('flex');
});
getEl('btn-ok-alert')?.addEventListener('click', () => {
  getEl('fake-alert-modal')?.classList.add('hidden');
  getEl('fake-alert-modal')?.classList.remove('flex');
});

// Virtual Keyboard logic
function initVirtualKeyboard() {
  const pinInput = getEl('pin-input') as HTMLInputElement;
  const vkContainer = getEl('virtual-keyboard');
  const vkKeys = getEl('vk-keys');
  
  if (!pinInput || !vkContainer || !vkKeys) return;

  function shuffleKeys() {
    const digits = ['0','1','2','3','4','5','6','7','8','9'];
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    
    vkKeys!.innerHTML = '';
    digits.forEach(d => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bg-white border border-slate-400 p-2 text-sm font-bold hover:bg-slate-200 focus:bg-blue-200';
      btn.textContent = d;
      btn.addEventListener('click', () => {
        if (pinInput.value.length < 4) {
          pinInput.value += d;
          shuffleKeys(); // Reshuffle on every keystroke
        }
      });
      vkKeys!.appendChild(btn);
    });
  }

  pinInput.addEventListener('click', () => {
    if (vkContainer.classList.contains('hidden')) {
      vkContainer.classList.remove('hidden');
      shuffleKeys();
    }
  });
  
  getEl('vk-close')?.addEventListener('click', () => {
    vkContainer.classList.add('hidden');
  });
  
  getEl('vk-clear')?.addEventListener('click', () => {
    pinInput.value = '';
    shuffleKeys();
  });
}

function handleStartSubmit(e: Event) {
  e.preventDefault();
  const formData = new FormData(e.target as HTMLFormElement);
  ctx.mode = formData.get('pressure') as GameMode;
  ctx.globalDurationMs = ctx.mode === 'extended' ? 600000 : 180000;
  ctx.startTime = Date.now();
  ctx.totalPausedTime = 0;
  ctx.state = 'LOGIN';
  generateCaptcha();
  
  history.pushState({ screen: 'LOGIN' }, '', '');
  
  getEl('start-screen')?.classList.add('hidden');
  getEl('login-screen')?.classList.remove('hidden');
  getEl('user-id')?.focus();
}

let isFirstLogin = true;

function handleLogin() {
  if (ctx.state !== 'LOGIN') return;
  const pin = (getEl('pin-input') as HTMLInputElement).value;
  const captcha = (getEl('captcha-input') as HTMLInputElement).value;
  
  if (captcha !== ctx.currentCaptcha) {
    getEl('captcha-error')?.classList.remove('hidden');
    (getEl('captcha-input') as HTMLInputElement).value = '';
    generateCaptcha();
    return;
  }
  getEl('captcha-error')?.classList.add('hidden');

  if (isFirstLogin) {
    if (pin === '1984') {
      isFirstLogin = false;
      triggerFakeAlert('Mandatory Password Change Required. For your security, your profile password has been automatically changed.');
      const postIt = getEl('post-it-pin');
      if (postIt) {
        postIt.textContent = '8839';
        postIt.classList.add('text-red-600');
      }
      (getEl('pin-input') as HTMLInputElement).value = '';
      (getEl('captcha-input') as HTMLInputElement).value = '';
      generateCaptcha();
      return;
    } else {
      triggerFakeAlert('Invalid PIN. Check your sticky note.');
      (getEl('pin-input') as HTMLInputElement).value = '';
      (getEl('captcha-input') as HTMLInputElement).value = '';
      generateCaptcha();
      return;
    }
  } else {
    if (pin === '8839') {
      ctx.state = 'DASHBOARD';
      getEl('login-screen')?.classList.add('hidden');
      getEl('dashboard-screen')?.classList.remove('hidden');
      getEl('dash-title')?.focus();

      // Trigger Ad Modal
      setTimeout(() => {
        if (ctx.state === 'DASHBOARD') {
          getEl('ad-modal-overlay')?.classList.remove('hidden');
          getEl('ad-modal-overlay')?.classList.add('flex');
          getEl('btn-apply-ad')?.focus();
        }
      }, 3000);
    } else {
      triggerFakeAlert('Invalid PIN.');
      (getEl('pin-input') as HTMLInputElement).value = '';
      (getEl('captcha-input') as HTMLInputElement).value = '';
      generateCaptcha();
      return;
    }
  }
}

function setupMachine() {

getEl('btn-close-ad')?.addEventListener('click', () => {
  getEl('ad-modal-overlay')?.classList.add('hidden');
  getEl('ad-modal-overlay')?.classList.remove('flex');
  getEl('btn-fund-transfer')?.focus();
});
getEl('btn-apply-ad')?.addEventListener('click', () => {
  getEl('ad-modal-overlay')?.classList.add('hidden');
  getEl('ad-modal-overlay')?.classList.remove('flex');
  getEl('btn-fund-transfer')?.focus();
});
  initVirtualKeyboard();
  getEl('start-form')?.addEventListener('submit', handleStartSubmit);
  getEl('btn-login')?.addEventListener('click', handleLogin);
  getEl('btn-refresh-captcha')?.addEventListener('click', generateCaptcha);
  
  // Dashboard dummy features with maintenance chance
  document.querySelectorAll('.dummy-icon-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const isSunday = new Date().getDay() === 0;
      const r = Math.random();
      if (isSunday || r < 0.05) {
        // Maintenance ending
        triggerEnding('MAINTENANCE');
      } else {
        const feature = (btn as HTMLElement).dataset.feature || 'Feature';
        getEl('feature-title')!.textContent = feature;
        getEl('dash-main-view')?.classList.add('hidden');
        getEl('dash-feature-view')?.classList.remove('hidden');
      }
    });
  });

  getEl('btn-back-dash')?.addEventListener('click', () => {
    getEl('dash-feature-view')?.classList.add('hidden');
    getEl('dash-main-view')?.classList.remove('hidden');
  });

  getEl('btn-fund-transfer')?.addEventListener('click', () => {
    if (ctx.state !== 'DASHBOARD') return;
    ctx.state = 'TRANSFER_STEP_1';
    getEl('dashboard-screen')?.classList.add('hidden');
    getEl('transfer-screen')?.classList.remove('hidden');
    getEl('transfer-step-1')?.classList.remove('hidden');
    getEl('transfer-title')?.focus();
  });

  const amtInput = getEl('transfer-amount') as HTMLInputElement;
  getEl('btn-transfer-proceed')?.addEventListener('click', () => {
    if (ctx.state !== 'TRANSFER_STEP_1') return;
    if (amtInput.value !== '10000000' && amtInput.value !== '10000000.00') {
      getEl('transfer-error')?.classList.remove('hidden');
      return;
    }
    getEl('transfer-error')?.classList.add('hidden');
    ctx.state = 'TRANSFER_STEP_2';
    getEl('transfer-step-1')?.classList.add('hidden');
    getEl('transfer-step-2')?.classList.remove('hidden');
  });

  const ackCheck = getEl('transfer-warning-ack') as HTMLInputElement;
  getEl('transfer-warning-ack')?.addEventListener('change', (e) => {
    const btn = getEl('btn-transfer-confirm') as HTMLButtonElement;
    if (btn) btn.disabled = !(e.target as HTMLInputElement).checked;
  });

  getEl('btn-transfer-back')?.addEventListener('click', () => {
    if (ctx.state !== 'TRANSFER_STEP_2') return;
    ctx.state = 'TRANSFER_STEP_1';
    getEl('transfer-step-2')?.classList.add('hidden');
    getEl('transfer-step-1')?.classList.remove('hidden');
  });

  getEl('btn-transfer-confirm')?.addEventListener('click', () => {
    if (ctx.state !== 'TRANSFER_STEP_2') return;
    ctx.state = 'TRANSFER_OTP';
    // Queue the first OTP arrival at +20s
    ctx.otpQueue.push(getElapsedMs() + 20000);
    getEl('transfer-step-2')?.classList.add('hidden');
    getEl('transfer-step-3')?.classList.remove('hidden');
    getEl('otp-input')?.focus();
  });

  getEl('btn-transfer-submit')?.addEventListener('click', () => {
    if (ctx.state !== 'TRANSFER_OTP') return;
    
    // Check if expired
    const elapsed = getElapsedMs();
    if (ctx.lastOtpArrival !== null) {
      const otpElapsed = elapsed - ctx.lastOtpArrival;
      const otpRemaining = 10000 - otpElapsed; // 10s expiry
      if (otpRemaining <= 0) {
        triggerEnding('OTP_EXPIRY');
        return;
      }
    }
    
    const input = (getEl('otp-input') as HTMLInputElement).value;
    if (input === '942187' && ctx.otpDelivered) {
      triggerEnding('TRAGIC');
    }
  });
  
  getEl('btn-transfer-cancel')?.addEventListener('click', () => {
      ctx.state = 'DASHBOARD';
      getEl('transfer-screen')?.classList.add('hidden');
      getEl('dashboard-screen')?.classList.remove('hidden');
  });

  getEl('btn-resend-otp')?.addEventListener('click', () => {
    if (ctx.state === 'PAUSED' || ctx.state === 'ENDED') return;
    ctx.otpResendCount++;
    if (ctx.otpResendCount >= 3) {
      triggerEnding('WAF');
    } else {
      // Queue another OTP with random delay between 5s and 15s
      const delay = 5000 + Math.random() * 10000;
      ctx.otpQueue.push(getElapsedMs() + delay);
    }
  });

  getEl('btn-dismiss-phone')?.addEventListener('click', () => {
    getEl('simulated-phone')?.classList.add('translate-y-[120%]');
  });

  // Endings
  getEl('nav-report-fraud')?.addEventListener('click', (e) => { e.preventDefault(); triggerEnding('FRAUD_FREEZE'); });
  getEl('link-resistance-dash')?.addEventListener('click', () => triggerEnding('RESISTANCE'));
  getEl('banner-loan')?.addEventListener('click', () => triggerEnding('DEBT'));
  getEl('btn-corrupt-cop')?.addEventListener('click', () => triggerEnding('CORRUPT_COP'));
  getEl('btn-corrupt-cop-marquee')?.addEventListener('click', () => triggerEnding('CORRUPT_COP'));
  
  getEl('btn-act-fast')?.addEventListener('click', () => {
    triggerEnding('FRAUD_FREEZE');
  });

  getEl('btn-restart')?.addEventListener('click', () => location.reload());

  getEl('btn-pause')?.addEventListener('click', () => {
    if (ctx.state === 'START' || ctx.state === 'ENDED') return;
    if (ctx.state !== 'PAUSED') {
      ctx.previousState = ctx.state;
      ctx.state = 'PAUSED';
      ctx.pauseTime = Date.now();
      getEl('btn-pause')!.textContent = 'Resume';
    } else {
      ctx.state = ctx.previousState!;
      ctx.totalPausedTime += Date.now() - ctx.pauseTime;
      getEl('btn-pause')!.textContent = 'Pause';
    }
  });

  window.addEventListener('popstate', () => {
    if (ctx.state !== 'START') {
      location.reload();
    }
  });

  requestAnimationFrame(gameLoop);
}

function gameLoop() {
  if (ctx.state !== 'PAUSED' && ctx.state !== 'START' && ctx.state !== 'ENDED') {
    const elapsed = getElapsedMs();
    
    if (elapsed >= ctx.globalDurationMs) {
      triggerEnding('TIMEOUT');
      return;
    }

    // Process notifications
    for (const n of SCAMMER_NOTIFICATIONS) {
      if (elapsed >= n.triggerMs && !ctx.notifiedIds.has(n.id) && n.modes.includes(ctx.mode)) {
        ctx.notifiedIds.add(n.id);
        pushNotification(n.text);
      }
    }

    // OTP Logic
    if (ctx.state === 'TRANSFER_OTP') {
      // Check if next OTP in queue has arrived
      if (ctx.otpQueue.length > 0 && elapsed >= ctx.otpQueue[0]) {
        ctx.lastOtpArrival = ctx.otpQueue[0];
        ctx.otpQueue.shift(); // Remove arrived OTP
        ctx.otpDelivered = true;
        getEl('simulated-otp-code')!.textContent = '942187';
        getEl('simulated-phone')?.classList.remove('translate-y-[120%]');
      }

      // Display timer for 40s expiry from LAST arrived OTP
      if (ctx.lastOtpArrival !== null) {
        const otpElapsed = elapsed - ctx.lastOtpArrival;
        const otpRemaining = 40000 - otpElapsed;
        const display = getEl('otp-timer-display');
        
        if (otpRemaining <= 0) {
          triggerEnding('OTP_EXPIRY');
          return;
        }

        if (display) {
          display.textContent = Math.ceil(otpRemaining / 1000) + 's';
        }
      }
    }
  }
  
  if (ctx.state !== 'ENDED') {
    requestAnimationFrame(gameLoop);
  }
}

if (typeof window !== 'undefined') {
  setupMachine();
  (window as any).ctx = ctx;
  (window as any).taeglichDebug = {
    jumpTo: (stateName: string) => {
      // Hide all main screens
      ['start-screen', 'login-screen', 'dashboard-screen', 'transfer-screen'].forEach(id => {
        getEl(id)?.classList.add('hidden');
      });
      // Ensure the bank shell is visible
      getEl('bank-ui')?.classList.remove('hidden');
      getEl('bank-ui')?.classList.add('flex');
      
      // Route to requested state
      ctx.state = stateName === 'OTP' ? 'TRANSFER_OTP' : (stateName === 'TRANSFER' ? 'TRANSFER_STEP_1' : stateName as any);
      ctx.startTimeMs = Date.now();
      ctx.pausedAtMs = 0;
      
      if (stateName === 'LOGIN') getEl('login-screen')?.classList.remove('hidden');
      if (stateName === 'DASHBOARD') getEl('dashboard-screen')?.classList.remove('hidden');
      if (stateName === 'TRANSFER') {
        getEl('transfer-screen')?.classList.remove('hidden');
        ['transfer-step-2', 'transfer-step-3'].forEach(id => getEl(id)?.classList.add('hidden'));
        getEl('transfer-step-1')?.classList.remove('hidden');
      }
      if (stateName === 'OTP') {
        getEl('transfer-screen')?.classList.remove('hidden');
        ['transfer-step-1', 'transfer-step-2'].forEach(id => getEl(id)?.classList.add('hidden'));
        getEl('transfer-step-3')?.classList.remove('hidden');
        ctx.otpDelivered = true;
        ctx.lastOtpArrival = getElapsedMs();
      }
    },
    triggerEnding: (key: string) => triggerEnding(key),
    pushMessage: (text: string) => pushNotification(text)
  };
}
