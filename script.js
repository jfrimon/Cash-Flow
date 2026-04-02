// Global Error Handling for Debugging
window.onerror = function (msg, url, line) {
  alert("System Error: " + msg + "\nAt: " + line);
  return false;
};

document.addEventListener('DOMContentLoaded', () => {
  init();
});

let mainChartInstance = null;
let expenseChartInstance = null;
let payChartInstance = null;
let receiveChartInstance = null;
let incomeChartInstance = null;
let personCharts = {}; // Store charts for each person
let personDataCache = {}; // Global cache for toggle-based re-rendering
let allPeopleChartInstance = null;
let receivedAllChartInstance = null;
let givenAllChartInstance = null;
let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();
let currentView = 'home'; // 'home', 'months', 'monthDetail', 'settings'
let activeTab = 'overview'; // 'overview', 'people', 'transactions', 'history'
let summaryViewState = 'none'; // 'none', 'income', 'expense-options', 'expense-overview', 'expense-mine', 'expense-person'
let peopleViewState = 'none'; // 'none', 'received', 'given', 'balance'

const QUOTES = [
  "The best way to predict your future is to create it.",
  "Financial freedom begins with a single step and a clear view.",
  "Master your money, master your life.",
  "Every coin has a story. Let's write yours beautifully.",
  "Precision in planning, excellence in execution.",
  "Wealth consists not in having great possessions, but in having few wants.",
  "A penny saved is a penny earned."
];

const GREETINGS = [
  "Welcome Back!",
  "Sparking Joy in Your Finances!",
  "Ready to Build Your Empire?",
  "Financial Mastery Awaits.",
  "Hello, Wealth Builder!"
];

const EMOTICONS = ["💰", "💳", "📈", "✨", "💎", "🏛️"];

function init() {
  // Splash screen logic
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) splash.classList.add('hidden');

    const userName = localStorage.getItem('userName');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // Explicitly hide all screens before showing the correct one
    ['setupScreen', 'loginScreen', 'currencyScreen', 'dashboardScreen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });

    if (!userName) {
      document.getElementById('setupScreen').classList.add('active');
    } else if (isLoggedIn) {
      showDashboard();
    } else {
      document.getElementById('loginScreen').classList.add('active');
    }
  }, 2500);

  // Set random elements for Home
  const quoteEl = document.getElementById('dailyQuote');
  const greetingEl = document.getElementById('greetingText');
  const animEl = document.querySelector('.animation-box');

  if (quoteEl) quoteEl.innerText = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  if (greetingEl) greetingEl.innerText = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  if (animEl) animEl.innerText = EMOTICONS[Math.floor(Math.random() * EMOTICONS.length)];

  setupEventListeners();
  setDefaultDates();
}

function setupEventListeners() {
  // Floating Menu Toggle
  const menuBtn = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  function toggleSidebar() {
    menuBtn.classList.toggle('open');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');

    // Hide FAB when sidebar is open to prevent clutter
    const fab = document.getElementById('fab');
    if (fab) {
      if (sidebar.classList.contains('open')) {
        fab.style.opacity = '0';
        fab.style.pointerEvents = 'none';
      } else {
        // Only show if the current view should have a FAB
        if (currentView === 'months' || currentView === 'monthDetail') {
          fab.style.opacity = '1';
          fab.style.pointerEvents = 'auto';
        }
      }
    }
  }

  if (menuBtn) {
    menuBtn.onclick = toggleSidebar;
    overlay.onclick = toggleSidebar;
  }

  // Sidebar Navigation
  document.querySelectorAll('.sidebar .nav-btn').forEach(btn => {
    btn.onclick = function () {
      const section = this.getAttribute('data-section');
      navigateTo(section);
      toggleSidebar();
    };
  });

  // Top Nav (Month Details Tabs)
  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.onclick = function () {
      document.querySelectorAll('.top-nav-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeTab = this.getAttribute('data-tab');
      renderTabContent();
    };
  });

  // Floating Action Button
  const fab = document.getElementById('fab');
  if (fab) {
    fab.onclick = () => {
      if (fab.classList.contains('back-btn')) {
        navigateTo('months');
      } else {
        openAddMonthModal();
      }
    };
  }

  // Add Month Form
  const addMonthForm = document.getElementById('addMonthForm');
  if (addMonthForm) {
    addMonthForm.onsubmit = (e) => {
      e.preventDefault();
      const m = parseInt(document.getElementById('newMonthSelect').value);
      const y = parseInt(document.getElementById('newYearInput').value);
      addMonthManually(m, y);
    };
  }




  // History navigation
  document.querySelectorAll('.history-tab').forEach(tab => {
    tab.onclick = function () {
      document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.history-view').forEach(v => v.classList.remove('active'));
      this.classList.add('active');
      const targetId = this.getAttribute('data-history') + 'History';
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.classList.add('active');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };
  });

  // Chart Type Changes with Persistence
  ['mainChartType', 'incomeChartType', 'expenseChartType', 'haveToPayChartType', 'willReceiveChartType', 'allPeopleChartType', 'receivedAllChartType', 'givenAllChartType'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // Restore saved chart type
      const savedType = localStorage.getItem('chart_' + id);
      if (savedType) el.value = savedType;

      el.onchange = () => {
        localStorage.setItem('chart_' + id, el.value);
        if (id === 'allPeopleChartType') renderPersonwise();
        else updateUI();
      };
    }
  });

  // Forms
  document.getElementById('setupForm').onsubmit = handleSetup;
  document.getElementById('currencyForm').onsubmit = handleCurrencySetup;
  document.getElementById('loginForm').onsubmit = handleLogin;
  document.getElementById('registerForm').onsubmit = handleRegister;
  document.getElementById('incomeForm').onsubmit = handleIncome;
  document.getElementById('expenseForm').onsubmit = handleExpense;
  document.getElementById('peopleForm').onsubmit = handlePeople;
  document.getElementById('updateProfileForm').onsubmit = handleUpdateProfile;
  document.getElementById('updateCurrencyForm').onsubmit = handleUpdateCurrency;
}

function setSummaryView(view) {
  summaryViewState = view;

  // Update nav buttons if any
  document.querySelectorAll('.expense-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === view.replace('expense-', ''));
  });

  updateUI();
}

function setPeopleView(view) {
  peopleViewState = view;
  updateUI();
}

// ===== EVENT HANDLERS =====

function handleSetup(e) {
  e.preventDefault();
  const name = document.getElementById('userName').value.trim();
  const pass = document.getElementById('userPass').value;
  const confirm = document.getElementById('confirmPass').value;
  if (pass.length < 6) return showError('setupError', 'Password min 6 symbols');
  if (pass !== confirm) return showError('setupError', 'Passwords do not match');
  localStorage.setItem('tempName', name);
  localStorage.setItem('tempPass', pass);
  document.getElementById('setupScreen').classList.remove('active');
  document.getElementById('currencyScreen').classList.add('active');
}

function handleCurrencySetup(e) {
  e.preventDefault();
  const cur = document.getElementById('currencySelect').value;
  localStorage.setItem('userName', localStorage.getItem('tempName'));
  localStorage.setItem('userPass', localStorage.getItem('tempPass'));
  localStorage.setItem('selectedCurrency', cur);
  localStorage.setItem('transactions', JSON.stringify([]));
  document.getElementById('currencyScreen').classList.remove('active');
  showDashboard();
}

function handleLogin(e) {
  e.preventDefault();
  const name = document.getElementById('loginName').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (name === localStorage.getItem('userName') && pass === localStorage.getItem('userPass')) {
    document.getElementById('loginScreen').classList.remove('active');
    showDashboard();
  } else {
    showError('loginError', 'Invalid credentials');
  }
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const pass = document.getElementById('registerPass').value;
  if (name.length < 2) return showError('registerError', 'Name too short');
  if (pass.length < 6) return showError('registerError', 'Password min 6 symbols');
  localStorage.setItem('tempName', name);
  localStorage.setItem('tempPass', pass);
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('currencyScreen').classList.add('active');
}

function handleIncome(e) {
  e.preventDefault();
  const amtInput = document.getElementById('incomeAmount');
  const dateInput = document.getElementById('incomeDate');
  const catInput = document.getElementById('incomeCategory');
  const noteInput = document.getElementById('incomeNote');

  const amt = parseFloat(amtInput.value);
  const dateValue = dateInput.value;

  if (isNaN(amt) || amt <= 0) return alert("Please enter a valid amount");
  if (!catInput.value) return alert("Please select a category");

  let validDateString;
  try {
    const parts = dateValue.split('-');
    const d = new Date();
    d.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    validDateString = d.toISOString();
  } catch (err) {
    validDateString = new Date().toISOString();
  }

  saveTx({
    type: 'income',
    amount: amt,
    category: catInput.value,
    note: noteInput.value || catInput.value,
    date: validDateString
  });

  e.target.reset();
  setDefaultDates();
  showMessage("Income added successfully!");
}

function handleExpense(e) {
  e.preventDefault();
  const amtInput = document.getElementById('expenseAmount');
  const dateInput = document.getElementById('expenseDate');
  const catInput = document.getElementById('expenseCategory');
  const personInput = document.getElementById('expensePerson');
  const relInput = document.getElementById('expenseRelation');
  const noteInput = document.getElementById('expenseNote');

  const amt = parseFloat(amtInput.value);
  const dateValue = dateInput.value;

  if (isNaN(amt) || amt <= 0) return alert("Please enter a valid amount");
  if (!catInput.value) return alert("Please select a category");

  let validDateString;
  try {
    const parts = dateValue.split('-');
    const d = new Date();
    d.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    validDateString = d.toISOString();
  } catch (err) {
    validDateString = new Date().toISOString();
  }

  saveTx({
    type: 'expense',
    amount: amt,
    category: catInput.value,
    person: personInput.value.trim() || null,
    relation: relInput.value.trim() || null,
    note: noteInput.value || catInput.value,
    date: validDateString
  });

  e.target.reset();
  setDefaultDates();
  showMessage("Expense added successfully!");
}

function handlePeople(e) {
  e.preventDefault();
  const nameInput = document.getElementById('personName');
  const amtInput = document.getElementById('personAmount');
  const dateInput = document.getElementById('personDate');
  const typeInput = document.getElementById('personType');
  const noteInput = document.getElementById('personNote');

  const person = nameInput.value.trim();
  const amt = parseFloat(amtInput.value);
  const dateValue = dateInput.value;

  if (!person) return alert("Please enter a person name");
  if (isNaN(amt) || amt <= 0) return alert("Please enter a valid amount");
  if (!typeInput.value) return alert("Please select a transaction type");

  let validDateString;
  try {
    const parts = dateValue.split('-');
    const d = new Date();
    d.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    validDateString = d.toISOString();
  } catch (err) {
    validDateString = new Date().toISOString();
  }

  saveTx({
    type: 'people',
    person: person,
    amount: amt,
    action: typeInput.value,
    note: noteInput.value || `${typeInput.value === 'Paid' ? 'given to' : 'receive from'} ${person}`,
    date: validDateString
  });

  e.target.reset();
  setDefaultDates();
  showMessage("People transaction saved!");
}

function setDefaultDates() {
  syncDateInputs();
}

function handleUpdateProfile(e) {
  e.preventDefault();
  const newName = document.getElementById('updateName').value.trim();
  const newPass = document.getElementById('updatePass').value;
  if (newName) localStorage.setItem('userName', newName);
  if (newPass) {
    if (newPass.length < 6) return showMessage('Password must be at least 6 characters', true);
    localStorage.setItem('userPass', newPass);
  }
  showMessage('Profile updated successfully!');
  updateUI();
  e.target.reset();
}

function handleUpdateCurrency(e) {
  e.preventDefault();
  const newCur = document.getElementById('updateCurrencySelect').value;
  localStorage.setItem('selectedCurrency', newCur);
  showMessage('Currency updated successfully!');
  updateUI();
}

// ===== UI LOGIC =====

function saveTx(tx) {
  try {
    let txs = [];
    const stored = localStorage.getItem('transactions');
    if (stored) {
      txs = JSON.parse(stored);
      if (!Array.isArray(txs)) txs = [];
    }
    txs.push(tx);
    localStorage.setItem('transactions', JSON.stringify(txs));

    // Auto add month to tracked if new
    const d = new Date(tx.date);
    addMonthToTracked(d.getMonth(), d.getFullYear());

    updateUI();
  } catch (e) {
    alert("Error saving transaction: " + e.message);
  }
}

function showDashboard() {
  try {
    localStorage.setItem('isLoggedIn', 'true');
    // Hide ALL screens before showing dashboard
    const screens = ['setupScreen', 'loginScreen', 'currencyScreen', 'splashScreen'];
    screens.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('active');
        el.style.display = 'none';
      }
    });

    const dash = document.getElementById('dashboardScreen');
    if (dash) dash.classList.add('active');

    // Default to Home Section
    navigateTo('home');
    autoCreateMonth();
    updateUI();
  } catch (e) {
    console.error("Show Dashboard error:", e);
  }
}

function navigateTo(section) {
  currentView = section;
  document.querySelectorAll('.section-content').forEach(s => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  document.querySelectorAll('.sidebar .nav-btn').forEach(b => b.classList.remove('active'));

  const fab = document.getElementById('fab');
  const menuBtn = document.getElementById('menuToggle');

  // Reset defaults
  if (fab) {
    fab.style.display = 'flex';
    fab.classList.remove('back-btn');
    fab.innerHTML = '<i class="fas fa-plus"></i>';
  }
  if (menuBtn) menuBtn.style.display = 'flex';

  if (section === 'home') {
    document.getElementById('homeSection').style.display = 'block';
    const homeBtn = document.querySelector('.sidebar .nav-btn[data-section="home"]');
    if (homeBtn) homeBtn.classList.add('active');
    if (fab) fab.style.display = 'none';
  } else if (section === 'months') {
    document.getElementById('monthsSection').style.display = 'block';
    const monthBtn = document.querySelector('.sidebar .nav-btn[data-section="months"]');
    if (monthBtn) monthBtn.classList.add('active');
    renderMonthList();
  } else if (section === 'settings') {
    document.getElementById('settingsSection').style.display = 'block';
    const settingsBtn = document.querySelector('.sidebar .nav-btn[data-section="settings"]');
    if (settingsBtn) settingsBtn.classList.add('active');
    if (fab) fab.style.display = 'none';
  } else if (section === 'monthDetail') {
    document.getElementById('monthDetailSection').style.display = 'block';
    // Hide Global Controls in Detail View as requested
    if (fab) fab.style.display = 'none';
    if (menuBtn) menuBtn.style.display = 'none';
    renderTabContent();
  }
}

function renderTabContent() {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  const targetTab = document.getElementById(activeTab + 'Tab');
  if (targetTab) targetTab.style.display = 'block';

  // Highlight tab button
  document.querySelectorAll('.top-nav-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === activeTab);
  });

  if (activeTab === 'overview') {
    summaryViewState = 'none';
    document.querySelectorAll('.sub-section').forEach(s => s.style.display = 'none');
    document.getElementById('personalSub').style.display = 'block';
  } else if (activeTab === 'people') {
    peopleViewState = 'none';
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const titleEl = document.getElementById('selectedMonthTitle');
  if (titleEl) titleEl.innerText = `${monthNames[selectedMonth]} ${selectedYear}`;

  updateUI();
  syncDateInputs();
}

function syncDateInputs() {
  const year = selectedYear;
  const month = (selectedMonth + 1).toString().padStart(2, '0');
  const day = new Date().getDate().toString().padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  ['incomeDate', 'expenseDate', 'personDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = dateStr;
      el.onchange = () => {
        const val = el.value;
        const parts = val.split('-');
        if (parts[0] != selectedYear || parts[1] != (selectedMonth + 1)) {
          alert(`You can only change the day for this month (${monthNames[selectedMonth]} ${selectedYear})`);
          el.value = `${selectedYear}-${month}-${parts[2]}`;
        }
      };
    }
  });
}

function autoCreateMonth() {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  addMonthToTracked(m, y);
}

function addMonthToTracked(m, y) {
  let tracked = JSON.parse(localStorage.getItem('trackedMonths') || '[]');
  const key = `${m}-${y}`;
  if (!tracked.includes(key)) {
    tracked.push(key);
    tracked.sort((a, b) => {
      const [m1, y1] = a.split('-').map(Number);
      const [m2, y2] = b.split('-').map(Number);
      return (y1 * 12 + m1) - (y2 * 12 + m2);
    });
    localStorage.setItem('trackedMonths', JSON.stringify(tracked));
  }
}

function renderMonthList() {
  const container = document.getElementById('monthListContainer');
  if (!container) return;
  container.innerHTML = '';

  const tracked = JSON.parse(localStorage.getItem('trackedMonths') || '[]');
  const now = new Date();
  const currM = now.getMonth();
  const currY = now.getFullYear();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthIcons = ["❄️", "🌨️", "🌱", "🌸", "☀️", "🌿", "⛱️", "🌊", "🍂", "🎃", "🍁", "🎄"];

  if (tracked.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px; background: white; border-radius: 20px;">
      <i class="fas fa-calendar-times" style="font-size: 40px; margin-bottom: 10px; opacity: 0.3;"></i><br>
      No months tracked yet. Click the + button to add your first month!
    </div>`;
    return;
  }

  tracked.forEach(key => {
    const [m, y] = key.split('-').map(Number);
    const isCurrent = (m === currM && y === currY);

    const card = document.createElement('div');
    card.className = 'month-card';
    card.onclick = () => {
      selectedMonth = m;
      selectedYear = y;
      navigateTo('monthDetail');
    };

    card.innerHTML = `
      ${isCurrent ? '<div class="active-indicator"></div>' : ''}
      <button class="delete-month-btn" title="Delete Month Data"><i class="fas fa-trash"></i></button>
      <div class="month-icon">${monthIcons[m]}</div>
      <div class="month-name">${monthNames[m]}</div>
      <div class="month-year">${y}</div>
    `;

    // Handle delete button click separately
    const delBtn = card.querySelector('.delete-month-btn');
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteMonth(key);
    };

    container.appendChild(card);
  });
}

function deleteMonth(key) {
  const [m, y] = key.split('-').map(Number);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  showBeautifulPopup({
    icon: '🗑️',
    title: 'Delete Month Data?',
    message: `This will permanently delete all records and transactions for ${monthNames[m]} ${y}. This action cannot be undone!`,
    confirmText: 'Delete Data',
    confirmCallback: () => {
      // 1. Remove from tracked months
      let tracked = JSON.parse(localStorage.getItem('trackedMonths') || '[]');
      tracked = tracked.filter(k => k !== key);
      localStorage.setItem('trackedMonths', JSON.stringify(tracked));

      // 2. Remove all related transactions
      let txs = JSON.parse(localStorage.getItem('transactions') || '[]');
      const initialCount = txs.length;
      txs = txs.filter(t => {
        const d = new Date(t.date);
        return !(d.getMonth() === m && d.getFullYear() === y);
      });
      localStorage.setItem('transactions', JSON.stringify(txs));

      renderMonthList();
      showMessage(`Removed ${monthNames[m]} ${y} and deleted ${initialCount - txs.length} transactions.`);
    }
  });
}

function openAddMonthModal() {
  document.getElementById('addMonthModal').classList.add('active');
  document.getElementById('newYearInput').value = new Date().getFullYear();
}

function closeMonthModal() {
  document.getElementById('addMonthModal').classList.remove('active');
}

function addMonthManually(m, y) {
  addMonthToTracked(m, y);
  closeMonthModal();
  renderMonthList();
  showMessage("New month added to tracker!");
}


function updateUI() {
  try {
    const name = localStorage.getItem('userName') || 'User';
    const cur = localStorage.getItem('selectedCurrency') || '$';
    let txs = [];
    try {
      txs = JSON.parse(localStorage.getItem('transactions') || '[]');
    } catch (e) {
      console.error("JSON parse error", e);
      txs = [];
    }

    // Filter transactions by selected month/year
    const filteredTxs = txs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const greeting = document.getElementById('greetingText');
    if (greeting) greeting.innerText = `Hi ${name} 👋`;

    // Personal Totals
    let personalInc = 0, personalExp = 0, othersExp = 0;
    const expenseCategories = {};
    const incomeCategories = {};

    // People Totals
    let peopleReceived = 0, peoplePaid = 0;
    const peopleData = {};

    filteredTxs.forEach(t => {
      if (t.type === 'income') {
        personalInc += t.amount;
        incomeCategories[t.category] = (incomeCategories[t.category] || 0) + t.amount;
      } else if (t.type === 'expense') {
        const isFamily = (t.category === 'Family' || t.relation === 'Family' || (t.note && t.note.toLowerCase().includes('family')));
        const isPersonExp = t.person || isFamily;

        if (!isPersonExp) {
          personalExp += t.amount;
          expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.amount;
        } else {
          othersExp += t.amount;
        }
      } else if (t.type === 'people') {
        if (t.action === 'Received') {
          peopleReceived += t.amount;
          peopleData[t.person] = (peopleData[t.person] || 0) + t.amount;
        } else {
          peoplePaid += t.amount;
          peopleData[t.person] = (peopleData[t.person] || 0) - t.amount;
        }
      }
    });

    // Personal Dashboard
    const personalBal = personalInc - personalExp - othersExp;
    const totalAllExp = personalExp + othersExp;

    const incEl = document.getElementById('totalIncome');
    const allExpEl = document.getElementById('totalAllExpense');
    const balEl = document.getElementById('totalBalance');

    if (incEl) incEl.innerText = `${cur}${personalInc.toFixed(2)}`;
    if (allExpEl) allExpEl.innerText = `${cur}${totalAllExp.toFixed(2)}`;
    if (balEl) balEl.innerText = `${cur}${personalBal.toFixed(2)}`;

    // Manage visibility of Summary areas
    document.querySelectorAll('.summary-view-area').forEach(el => el.style.display = 'none');
    const expenseMenu = document.getElementById('expenseMenu');
    if (expenseMenu) expenseMenu.style.display = 'none';

    if (summaryViewState === 'income') {
      const area = document.getElementById('incomeViewArea');
      if (area) area.style.display = 'block';
    } else if (summaryViewState.startsWith('expense-')) {
      if (expenseMenu) expenseMenu.style.display = 'flex';

      const subView = summaryViewState.replace('expense-', '');
      if (subView === 'overview') {
        const area = document.getElementById('expenseOverviewArea');
        if (area) area.style.display = 'block';
      } else if (subView === 'mine') {
        const area = document.getElementById('expenseMineArea');
        if (area) area.style.display = 'block';
      } else if (subView === 'person') {
        const area = document.getElementById('expensePersonArea');
        if (area) area.style.display = 'block';
      }
    }

    // People Dashboard
    const peopleBal = peopleReceived - peoplePaid;
    const statusLabel = document.getElementById('peopleStatusLabel');

    if (peopleReceived > peoplePaid) {
      statusLabel.innerText = "🔴 Have to Pay";
      statusLabel.style.color = "var(--danger)";
    } else if (peoplePaid > peopleReceived) {
      statusLabel.innerText = "🟢 Will Receive";
      statusLabel.style.color = "var(--success)";
    } else {
      statusLabel.innerText = "People Balance Clear";
      statusLabel.style.color = "var(--text-muted)";
    }

    const receivedEl = document.getElementById('totalPeopleReceived');
    const paidEl = document.getElementById('totalPeoplePaid');
    const peopleBalEl = document.getElementById('totalPeopleBalance');

    if (receivedEl) receivedEl.innerText = `${cur}${peopleReceived.toFixed(2)}`;
    if (paidEl) paidEl.innerText = `${cur}${peoplePaid.toFixed(2)}`;
    if (peopleBalEl) {
      peopleBalEl.innerText = `${cur}${Math.abs(peopleBal).toFixed(2)}`;
      // Correct color for Balance card
      peopleBalEl.classList.remove('income', 'expense', 'balance');
      if (peopleReceived > peoplePaid) peopleBalEl.classList.add('expense');
      else if (peoplePaid > peopleReceived) peopleBalEl.classList.add('income');
      else peopleBalEl.classList.add('balance');
    }

    // Manage visibility of People areas
    document.getElementById('peopleBackBtnContainer').style.display = (peopleViewState === 'none' ? 'none' : 'block');
    document.getElementById('cardReceived').style.display = (peopleViewState === 'none' || peopleViewState === 'received' ? 'block' : 'none');
    document.getElementById('cardGiven').style.display = (peopleViewState === 'none' || peopleViewState === 'given' ? 'block' : 'none');
    document.getElementById('cardBalance').style.display = (peopleViewState === 'none' || peopleViewState === 'balance' ? 'block' : 'none');

    document.getElementById('receivedChartArea').style.display = (peopleViewState === 'received' ? 'block' : 'none');
    document.getElementById('givenChartArea').style.display = (peopleViewState === 'given' ? 'block' : 'none');
    document.getElementById('balanceChartsArea').style.display = (peopleViewState === 'balance' ? 'block' : 'none');

    renderHistory(filteredTxs, cur);
    // Gather additional data for new People charts
    const peopleReceivedData = {};
    const peoplePaidData = {};
    filteredTxs.forEach(t => {
      if (t.type === 'people') {
        if (t.action === 'Received') {
          peopleReceivedData[t.person] = (peopleReceivedData[t.person] || 0) + t.amount;
        } else {
          peoplePaidData[t.person] = (peoplePaidData[t.person] || 0) + t.amount;
        }
      }
    });

    updateCharts(personalInc, personalExp, othersExp, expenseCategories, incomeCategories, peopleData, peopleReceivedData, peoplePaidData);

    // Automatically update personwise if it's the current sub-section
    if (summaryViewState === 'expense-person' || activeTab === 'people') {
      renderPersonwise(filteredTxs);
    }
  } catch (e) {
    console.error("Update UI error:", e);
  }
}

// Utility for consistent chart configurations
function getSharedChartConfig(type, labels, data, colors) {
  const isArc = ['pie', 'doughnut'].includes(type);
  const cur = localStorage.getItem('selectedCurrency') || '$';

  return {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        hoverBackgroundColor: colors,
        hoverBorderColor: '#fff',
        hoverBorderWidth: isArc ? 4 : 8,
        borderColor: 'transparent',
        borderWidth: 1,
        hoverOffset: isArc ? 30 : 15, // Prominent enlargement on hover
        borderRadius: type === 'bar' ? 10 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: isArc ? 45 : 25
      },
      interaction: {
        mode: 'point',
        intersect: true
      },
      plugins: {
        legend: {
          position: 'bottom',
          display: labels.length > 0 && type !== 'bar',
          labels: { usePointStyle: true, padding: 30, font: { size: 11, weight: '600' } }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          padding: 14,
          cornerRadius: 12,
          displayColors: false,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: function (context) {
              const label = context.label || '';
              const value = context.parsed.y !== undefined ? context.parsed.y : (context.parsed || 0);
              const total = context.dataset.data.reduce((a, b) => a + Number(b), 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
              return ` ${label}: ${cur}${value.toFixed(2)} (${percentage})`;
            }
          }
        }
      },
      scales: type === 'bar' ? {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      } : {},
      onHover: (event, elements) => {
        if (event.native && event.native.target) {
          event.native.target.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
        }
      },
      animation: {
        duration: 1250, // Premium smooth duration
        easing: 'easeOutBack', // Bouncy/Elastic motion transition
        delay: (context) => {
          let delay = 0;
          if (context.type === 'data' && context.mode === 'default' && !context.active) {
            delay = context.dataIndex * 100; // Staggered entry
          }
          return delay;
        }
      },
      // Ensure smooth morphing when type changes
      transitions: {
        active: { animation: { duration: 800 } },
        resize: { animation: { duration: 400 } }
      }
    }
  };
}

function updateCharts(inc, exp, othersExp, categories, incomeCategories, peopleData, peopleReceivedData, peoplePaidData) {
  // Income Chart
  const incomeTypeEl = document.getElementById('incomeChartType');
  if (incomeTypeEl) {
    const incomeType = incomeTypeEl.value;
    const incLabels = Object.keys(incomeCategories);
    const incValues = Object.values(incomeCategories);
    const mixedColors = ['#51cf66', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];
    incomeChartInstance = renderChart('incomeChart', incomeChartInstance, incomeType,
      incLabels, incValues, mixedColors);
  }

  // Main Chart (Expense Overview)
  const mainTypeEl = document.getElementById('mainChartType');
  if (mainTypeEl) {
    const mainType = mainTypeEl.value;
    mainChartInstance = renderChart('financialChart', mainChartInstance, mainType,
      ['My Expense', 'Person\'s Expense'], [exp, othersExp], ['#ff6b6b', '#ffa94d']);
  }

  // Expense Chart
  const expTypeEl = document.getElementById('expenseChartType');
  if (expTypeEl) {
    const expType = expTypeEl.value;
    const expLabels = Object.keys(categories);
    const expValues = Object.values(categories);
    const mixedColors = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#4f46e5', '#7c3aed'];
    expenseChartInstance = renderChart('expenseChart', expenseChartInstance, expType,
      expLabels, expValues, mixedColors);
  }

  // People Data Separation
  const haveToPayData = {};
  const willReceiveData = {};

  for (const person in peopleData) {
    const balance = peopleData[person]; // Received - Paid
    if (balance > 0) haveToPayData[person] = balance;
    else if (balance < 0) willReceiveData[person] = Math.abs(balance);
  }

  // Have to Pay Chart
  const payTypeEl = document.getElementById('haveToPayChartType');
  if (payTypeEl) {
    const payType = payTypeEl.value;
    const payLabels = Object.keys(haveToPayData);
    const payValues = Object.values(haveToPayData);
    const mixedColors = ['#ef4444', '#f97316', '#db2777', '#9333ea', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16'];
    payChartInstance = renderChart('haveToPayChart', payChartInstance, payType,
      payLabels, payValues, mixedColors);
  }

  // Will Receive Chart
  const receiveTypeEl = document.getElementById('willReceiveChartType');
  if (receiveTypeEl) {
    const receiveType = receiveTypeEl.value;
    const receiveLabels = Object.keys(willReceiveData);
    const receiveValues = Object.values(willReceiveData);
    const mixedColors = ['#22c55e', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#9333ea', '#db2777', '#f97316', '#ef4444'];
    receiveChartInstance = renderChart('willReceiveChart', receiveChartInstance, receiveType,
      receiveLabels, receiveValues, mixedColors);
  }

  // Total Received (All) Chart
  const receivedAllTypeEl = document.getElementById('receivedAllChartType');
  if (receivedAllTypeEl) {
    const type = receivedAllTypeEl.value;
    const labels = Object.keys(peopleReceivedData || {});
    const values = Object.values(peopleReceivedData || {});
    const colors = ['#ef4444', '#f97316', '#db2777', '#9333ea', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16'];
    receivedAllChartInstance = renderChart('receivedAllChart', receivedAllChartInstance, type,
      labels, values, colors);
  }

  // Total Given (All) Chart
  const givenAllTypeEl = document.getElementById('givenAllChartType');
  if (givenAllTypeEl) {
    const type = givenAllTypeEl.value;
    const labels = Object.keys(peoplePaidData || {});
    const values = Object.values(peoplePaidData || {});
    const colors = ['#22c55e', '#84cc16', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#9333ea', '#db2777', '#f97316', '#ef4444'];
    givenAllChartInstance = renderChart('givenAllChart', givenAllChartInstance, type,
      labels, values, colors);
  }
}

function renderChart(id, instance, type, labels, data, colors) {
  const canvas = document.getElementById(id);
  if (!canvas) return null;

  const wrapper = canvas.parentElement;
  const isEmpty = !data || data.length === 0 || data.every(v => parseFloat(v) === 0);

  // Maintain or Create Overlay
  let overlay = wrapper.querySelector('.no-data-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'no-data-overlay';
    overlay.innerHTML = `
      <div class="no-data-icon">📊</div>
      <div class="no-data-text">No data to visualize yet</div>
    `;
    wrapper.appendChild(overlay);
  }

  if (isEmpty) {
    overlay.classList.add('show');
    if (instance) instance.destroy();
    return null;
  } else {
    overlay.classList.remove('show');
  }

  if (typeof Chart === 'undefined') return null;

  const ctx = canvas.getContext('2d');
  const config = getSharedChartConfig(type, labels, data, colors);

  // If a chart already exists on this EXACT canvas, update it for "motion transitions"
  if (instance && instance.canvas.id === id) {
    instance.config.type = type;
    instance.config.data = config.data;
    instance.config.options = config.options;
    instance.update();
    return instance;
  }

  // Otherwise clean up old and create new
  if (instance) instance.destroy();
  return new Chart(ctx, config);
}

function renderHistory(txs, cur) {
  const personalList = document.getElementById('personalHistory');
  const peopleList = document.getElementById('peopleHistory');
  if (!personalList || !peopleList) return;

  personalList.innerHTML = '';
  peopleList.innerHTML = '';

  // Tag transactions with original index and sort by date descending
  const taggedTxs = txs.map((t, idx) => ({ ...t, originalIndex: idx }));
  taggedTxs.sort((a, b) => new Date(b.date) - new Date(a.date));

  const personalTxs = taggedTxs.filter(t => t.type !== 'people');
  const peopleTxs = taggedTxs.filter(t => t.type === 'people');

  if (personalTxs.length === 0) {
    personalList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No records yet</p>';
  } else {
    renderMonthWiseList(personalTxs, personalList, cur);
  }

  if (peopleTxs.length === 0) {
    peopleList.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">No records yet</p>';
  } else {
    renderMonthWiseList(peopleTxs, peopleList, cur);
  }
}

function createTxItem(t, cur, index, fullTxs) {
  const d = new Date(t.originalDate || t.date);
  const dateStr = d.getDate() + ' ' + d.toLocaleString('default', { month: 'short' });
  const isPos = (t.type === 'income' || (t.type === 'people' && t.action === 'Paid'));

  const item = document.createElement('div');
  item.className = 'transaction-item';
  item.innerHTML = `
    <div class="transaction-info">
      <strong>${t.person || t.category || t.type}</strong><br>
      <small>${t.note.replace('Received with', 'receive from').replace('Paid with', 'given to').replace('Received from', 'receive from').replace('Given to', 'given to')} • ${dateStr}</small>
    </div>
    <div class="transaction-right">
      <div class="transaction-amount ${isPos ? 'income' : 'expense'}">
        ${isPos ? '+' : '-'}${t.amount.toFixed(2)} ${cur}
      </div>
      <div class="transaction-actions">
        <button class="action-btn btn-edit" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="action-btn btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `;

  // Attach Events
  const actualIndex = t.originalIndex;
  item.querySelector('.btn-delete').onclick = () => deleteTx(actualIndex);
  item.querySelector('.btn-edit').onclick = () => editTx(actualIndex);

  return item;
}

function deleteTx(index) {
  showBeautifulPopup({
    icon: '🗑️',
    title: 'Delete Transaction?',
    message: 'Are you sure you want to remove this record?',
    confirmText: 'Delete',
    confirmCallback: () => {
      let txs = JSON.parse(localStorage.getItem('transactions') || '[]');
      txs.splice(index, 1);
      localStorage.setItem('transactions', JSON.stringify(txs));
      updateUI();
      showMessage("Transaction deleted");
    }
  });
}

function editTx(index) {
  let txs = JSON.parse(localStorage.getItem('transactions') || '[]');
  const t = txs[index];
  if (!t) return;

  const modal = document.getElementById('editModal');
  const indexInput = document.getElementById('editTxIndex');
  const personInput = document.getElementById('editTxPerson');
  const catInput = document.getElementById('editTxCategory');
  const amtInput = document.getElementById('editTxAmount');
  const dateInput = document.getElementById('editTxDate');
  const noteInput = document.getElementById('editTxNote');

  indexInput.value = index;
  amtInput.value = t.amount;
  noteInput.value = t.note || '';

  // Format date for <input type="date">
  const d = new Date(t.date);
  dateInput.value = d.toISOString().split('T')[0];

  // Show/Hide relevant fields based on type
  if (t.type === 'people') {
    document.getElementById('editPersonGroup').style.display = 'block';
    document.getElementById('editCategoryGroup').style.display = 'none';
    personInput.value = t.person || '';
  } else {
    document.getElementById('editPersonGroup').style.display = 'none';
    document.getElementById('editCategoryGroup').style.display = 'block';
    catInput.value = t.category || (t.type === 'income' ? 'Income' : '');
  }

  modal.classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
}

function saveEditedTx() {
  const index = parseInt(document.getElementById('editTxIndex').value);
  let txs = JSON.parse(localStorage.getItem('transactions') || '[]');
  const t = txs[index];
  if (!t) return;

  const amt = parseFloat(document.getElementById('editTxAmount').value);
  const dateVal = document.getElementById('editTxDate').value;
  const noteVal = document.getElementById('editTxNote').value;

  if (isNaN(amt) || amt <= 0) return alert("Invalid amount");

  // Update common fields
  txs[index].amount = amt;
  txs[index].note = noteVal;

  try {
    const parts = dateVal.split('-');
    const existingDate = new Date(t.date);
    const d = new Date();
    d.setFullYear(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    // If it's the same day as before, keep the old time, otherwise use current time
    if (d.toDateString() === existingDate.toDateString()) {
      d.setHours(existingDate.getHours(), existingDate.getMinutes(), existingDate.getSeconds());
    } else {
      // If date changed, use current time for the new date
      const now = new Date();
      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }
    txs[index].date = d.toISOString();
  } catch (e) { }

  // Update specific fields
  if (t.type === 'people') {
    txs[index].person = document.getElementById('editTxPerson').value.trim() || t.person;
  } else {
    txs[index].category = document.getElementById('editTxCategory').value.trim() || t.category;
  }

  localStorage.setItem('transactions', JSON.stringify(txs));
  updateUI();
  closeEditModal();
  showMessage("Transaction updated successfully");
}

function renderMonthWiseList(items, container, cur) {
  const grouped = {};
  items.forEach(t => {
    const d = new Date(t.date);
    const monthYear = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!grouped[monthYear]) grouped[monthYear] = [];
    grouped[monthYear].push(t);
  });

  // Sort months chronologically reversed
  const sortedMonths = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  sortedMonths.forEach(month => {
    let monthNet = 0;
    grouped[month].forEach(t => {
      const isPos = (t.type === 'income' || (t.type === 'people' && t.action === 'Paid'));
      monthNet += isPos ? t.amount : -t.amount;
    });

    const monthEl = document.createElement('div');
    monthEl.className = 'month-group';
    monthEl.innerHTML = `
      <div class="month-header">
        <span>${month}</span>
        <span class="month-net ${monthNet >= 0 ? 'income' : 'expense'}">
          Net: ${monthNet >= 0 ? '+' : ''}${monthNet.toFixed(2)} ${cur}
        </span>
      </div>
    `;

    grouped[month].forEach(t => {
      monthEl.appendChild(createTxItem(t, cur));
    });

    container.appendChild(monthEl);
  });
}

function logout() {
  showBeautifulPopup({
    icon: '👋',
    title: 'Ending Session',
    message: 'Are you sure you want to log out of your account?',
    confirmText: 'Logout',
    confirmCallback: () => {
      localStorage.removeItem('isLoggedIn');
      document.getElementById('dashboardScreen').classList.remove('active');
      document.getElementById('loginScreen').classList.add('active');
    }
  });
}

function clearAllData() {
  showBeautifulPopup({
    icon: '🚨',
    title: 'Wipe All Data?',
    message: 'This will permanently delete all your transactions and settings. This action cannot be undone!',
    confirmText: 'Delete Everything',
    confirmCallback: () => {
      localStorage.setItem('transactions', JSON.stringify([]));
      updateUI();
      showMessage("All data has been wiped.");
    }
  });
}

function renderPersonwise(filteredTxs) {
  const container = document.getElementById('personwiseList');
  if (!container) return;

  container.innerHTML = '';

  let txs = filteredTxs;
  if (!txs) {
    const allTxs = JSON.parse(localStorage.getItem('transactions') || '[]');
    txs = allTxs.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }
  const cur = localStorage.getItem('selectedCurrency') || '$';

  // Grouping expenses by unique Name + Relation combination
  const dataMap = {};
  txs.forEach(t => {
    // Only process person-related expenses
    const isFamily = (t.category === 'Family' || t.relation === 'Family' || (t.note && t.note.toLowerCase().includes('family')));
    const name = (t.person || (isFamily ? 'Family' : null))?.trim();
    const relation = (t.relation || (isFamily ? 'Family' : 'Other'))?.trim();

    if (t.type === 'expense' && name) {
      // Unique combination of Name and Relation
      const key = `${name} (${relation})`;
      if (!dataMap[key]) {
        dataMap[key] = {
          name: name,
          relation: relation,
          total: 0
        };
      }
      dataMap[key].total += t.amount;
    }
  });

  const uniqueEntries = Object.keys(dataMap).sort((a, b) => dataMap[b].total - dataMap[a].total);

  if (uniqueEntries.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">No person-specific records yet. Tag a person and relation when adding an expense!</p>';
    document.getElementById('allPeopleChartContainer').style.display = 'none';
    return;
  }

  document.getElementById('allPeopleChartContainer').style.display = 'block';

  // Update Summary Chart for All unique Name + Relation combinations
  const allPeopleTypeSelect = document.getElementById('allPeopleChartType');
  const allPeopleType = allPeopleTypeSelect ? allPeopleTypeSelect.value : 'bar';
  const mixedColors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#51cf66', '#94d82d', '#fab005', '#ff6b6b', '#20c997', '#ae3ec9'];

  // Labels show both Name and Relation to distinguish unique combinations in the graph
  allPeopleChartInstance = renderChart('allPeopleChart', allPeopleChartInstance, allPeopleType,
    uniqueEntries, uniqueEntries.map(key => dataMap[key].total), mixedColors);
}

function showBeautifulPopup({ icon, title, message, confirmText, confirmCallback }) {
  const modal = document.getElementById('customModal');
  const iconEl = document.getElementById('modalIcon');
  const titleEl = document.getElementById('modalTitle');
  const messageEl = document.getElementById('modalMessage');
  const confirmBtn = document.getElementById('modalConfirmBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');

  if (!modal || !iconEl || !titleEl || !messageEl || !confirmBtn || !cancelBtn) return;

  iconEl.innerText = icon || '⚠️';
  titleEl.innerText = title || 'Confirm Action';
  messageEl.innerText = message || 'Are you sure?';
  confirmBtn.innerText = confirmText || 'Confirm';

  modal.classList.add('active');

  const close = () => modal.classList.remove('active');

  confirmBtn.onclick = () => {
    confirmCallback();
    close();
  };

  cancelBtn.onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

function showMessage(msg, isError = false) {
  const id = isError ? 'globalError' : 'globalSuccess';
  const el = document.getElementById(id);
  if (!el) return;
  el.innerText = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}
