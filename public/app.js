const els = {
  storageState: document.getElementById("storageState"),
  connectBank: document.getElementById("connectBank"),
  connectBankPrimary: document.getElementById("connectBankPrimary"),
  syncBank: document.getElementById("syncBank"),
  csvInput: document.getElementById("csvInput"),
  csvButton: document.getElementById("csvButton"),
  lockPanel: document.getElementById("lockPanel"),
  accessInput: document.getElementById("accessInput"),
  unlockButton: document.getElementById("unlockButton"),
  accessMessage: document.getElementById("accessMessage"),
  modeSelect: document.getElementById("modeSelect"),
  balanceInput: document.getElementById("balanceInput"),
  floorInput: document.getElementById("floorInput"),
  downPaymentInput: document.getElementById("downPaymentInput"),
  monthlyCapInput: document.getElementById("monthlyCapInput"),
  targetDateInput: document.getElementById("targetDateInput"),
  saveSettings: document.getElementById("saveSettings"),
  stateLabel: document.getElementById("stateLabel"),
  stateReason: document.getElementById("stateReason"),
  goalMeterFill: document.getElementById("goalMeterFill"),
  goalSaved: document.getElementById("goalSaved"),
  goalTarget: document.getElementById("goalTarget"),
  goalPace: document.getElementById("goalPace"),
  gapValue: document.getElementById("gapValue"),
  gapLabel: document.getElementById("gapLabel"),
  actionLabel: document.getElementById("actionLabel"),
  actionDetail: document.getElementById("actionDetail"),
  a3Price: document.getElementById("a3Price"),
  a3Code: document.getElementById("a3Code"),
  a3Build: document.getElementById("a3Build"),
  advisorStatus: document.getElementById("advisorStatus"),
  advisorSummary: document.getElementById("advisorSummary"),
  advisorAction: document.getElementById("advisorAction"),
  advisorEffect: document.getElementById("advisorEffect"),
  primaryFixLabel: document.getElementById("primaryFixLabel"),
  primaryFixDetail: document.getElementById("primaryFixDetail"),
  improvementState: document.getElementById("improvementState"),
  improvementList: document.getElementById("improvementList"),
  cutTitle: document.getElementById("cutTitle"),
  cutReason: document.getElementById("cutReason"),
  cutSteps: document.getElementById("cutSteps"),
  spendWindow: document.getElementById("spendWindow"),
  spendLeakList: document.getElementById("spendLeakList"),
  watchList: document.getElementById("watchList"),
  bankList: document.getElementById("bankList"),
  eventList: document.getElementById("eventList"),
  transactionList: document.getElementById("transactionList")
};

let lastState = null;
let activeCutItem = null;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const moneyExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

async function api(path, options = {}) {
  const { accessCodeOverride, headers = {}, ...fetchOptions } = options;
  const code = accessCodeOverride ?? localStorage.getItem("a3AccessCode") ?? "";
  const response = await fetch(path, {
    cache: "no-store",
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(code ? { "x-a3-access": code } : {}),
      ...headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `${response.status}`);
    error.locked = Boolean(data.locked || response.status === 401);
    throw error;
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function dateLabel(date) {
  if (!date) return "--";
  return shortDate.format(new Date(`${date}T00:00:00Z`));
}

function dateTimeLabel(value) {
  if (!value) return "not synced";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function isSampleOnly(data) {
  return !(data.imports || []).some((item) => item.source !== "sample");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function replacementStep(item) {
  const text = `${item?.label || ""} ${item?.category || ""}`.toLowerCase();
  if (/shar|music|instrument|violin/.test(text)) return "Open existing music or supplies.";
  if (/chipotle|restaurant|food|coffee|cafe|dining|takeout|delivery/.test(text)) return "Eat something already available first.";
  if (/openai|chatgpt|subscription|software|app|internet|online/.test(text)) return "Use the active plan only.";
  if (/lyft|uber|taxi|rideshare|transport/.test(text)) return "Walk or transit first.";
  if (/lululemon|clothing|apparel|shop|retail|merchandise/.test(text)) return "Close the cart and wait.";
  return "Use what is already paid for.";
}

function primaryCutItem(spending) {
  return spending[0] || null;
}

function renderGoalMeter(goal, sampleOnly, data) {
  const target = Math.max(0, Number(goal.downPaymentTarget || 0));
  const saved = Math.max(0, Number(goal.availableForDownPayment || 0));
  const progress = !sampleOnly && target > 0 ? clamp(saved / target, 0, 1) : 0;
  els.goalMeterFill.style.width = `${Math.round(progress * 100)}%`;
  els.goalSaved.textContent = sampleOnly ? "Bank link pending" : `${money.format(saved)} above floor`;
  els.goalTarget.textContent = target > 0 ? `${money.format(target)} target` : "Target not set";

  if (sampleOnly) {
    els.goalPace.textContent = data.plaid?.productionReviewPending
      ? "Plaid approval is the next step."
      : data.plaid?.configured
        ? "Connect Chase to start tracking."
        : "Plaid setup needed before Chase can connect.";
    return;
  }

  if (target <= 0) {
    els.goalPace.textContent = "Set a down payment target.";
    return;
  }

  if (goal.downPaymentGap <= 0) {
    els.goalPace.textContent = "Down payment target covered.";
    return;
  }

  const pace = Math.max(0, Number(goal.monthlySavingsPace || 0));
  const needed = Math.max(0, Number(goal.monthlySavingsNeeded || 0));
  els.goalPace.textContent = goal.targetDate
    ? `${money.format(pace)}/mo pace / ${money.format(Math.ceil(needed))}/mo needed`
    : `${money.format(goal.downPaymentGap)} remaining`;
}

function setBusy(text) {
  els.storageState.textContent = text;
}

function connectButtons() {
  return [els.connectBank, els.connectBankPrimary].filter(Boolean);
}

function showLock(message = "PIN required") {
  document.body.classList.add("locked-view");
  els.lockPanel.hidden = false;
  connectButtons().forEach((button) => { button.hidden = true; });
  els.syncBank.hidden = true;
  els.csvButton.hidden = true;
  els.storageState.textContent = "Locked";
  els.accessMessage.textContent = message;
  els.accessInput.focus();
}

function hideLock() {
  document.body.classList.remove("locked-view");
  els.lockPanel.hidden = true;
  connectButtons().forEach((button) => { button.hidden = false; });
  els.csvButton.hidden = false;
  els.accessMessage.textContent = "";
}

function renderBankControls(data) {
  const plaid = data.plaid || {};
  const needsRelink = plaid.connected && /login|required|expired|invalid|item/i.test(String(plaid.lastError || ""));
  connectButtons().forEach((button) => { button.disabled = false; });
  els.syncBank.disabled = !plaid.connected;
  els.connectBank.textContent = plaid.connected ? needsRelink ? "relink" : "linked" : "connect";
  els.connectBank.disabled = plaid.connected && !needsRelink;
  if (els.connectBankPrimary) {
    els.connectBankPrimary.textContent = needsRelink ? "relink Chase" : "connect Chase";
    els.connectBankPrimary.hidden = plaid.connected && !needsRelink;
  }
  els.syncBank.hidden = !plaid.connected;
  const title = plaid.productionReviewPending
    ? "Plaid review pending"
    : plaid.connected && !needsRelink
      ? "Bank linked through Plaid"
      : plaid.configured
      ? "Connect bank through Plaid"
      : "Plaid setup needed";
  connectButtons().forEach((button) => { button.title = title; });
}

function compactAdvisor(latestRun, analysis) {
  const accounts = analysis.accounts || {};
  const settings = analysis.settings || {};
  const connected = Boolean(accounts.connected);
  const creditLoanBalance = Number(accounts.debtTotal || 0);
  const cash = Number(accounts.cash || 0);
  const floor = Number(settings.cashFloor || 0);
  const advice = latestRun?.advice || {};

  if (connected && creditLoanBalance > 0) {
    const payment = paymentStatus(analysis);
    const action = payment.status === "posted" || payment.status === "posted_partial"
      ? "No Chase login needed."
      : payment.status === "pending"
        ? `${moneyExact.format(payment.amount)} is pending in Plaid.`
        : "A3 has not seen the payment in Plaid yet.";
    const summary = payment.amount > 0
      ? `${moneyExact.format(payment.amount)} payment ${payment.status === "pending" ? "is pending" : "is posted"} in Plaid.`
      : `No extra A3 saving today. ${money.format(cash)} cash right now.`;
    return {
      status: payment.status === "pending" ? "A3 is watching" : payment.status === "not_visible" ? "A3 is checking" : "Already checked",
      action,
      summary,
      effect: `${money.format(cash)} cash; ${money.format(creditLoanBalance)} card/loan balance.`
    };
  }

  if (latestRun) {
    return {
      status: titleCase(advice.status),
      action: shortText(advice.one_action, 86),
      summary: shortText(advice.summary, 92),
      effect: shortText([advice.why, advice.a3_effect].filter(Boolean).join(" "), 180)
    };
  }

  return {
    status: "Ready",
    action: shortText(analysis.action.label, 86),
    summary: shortText(analysis.action.detail, 92),
    effect: ""
  };
}

function shortText(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 40 ? lastSpace : slice.length).trim()}.`;
}

function recentAutopay(transactions) {
  return (transactions || []).find((transaction) => {
    const text = `${transaction.merchant || ""} ${transaction.description || ""}`.toLowerCase();
    return /autopay|credit crd|credit card payment|automatic payment|payment thank/.test(text)
      && (Number(transaction.spend || 0) >= 500 || Number(transaction.inflow || 0) >= 500);
  });
}

function paymentStatus(analysis) {
  const fromServer = analysis.paymentStatus || {};
  if (fromServer.status) return fromServer;
  const payment = recentAutopay(analysis.transactions);
  if (!payment) return { status: "not_visible", amount: 0 };
  return {
    status: payment.pending ? "pending" : "posted_partial",
    amount: Math.max(Number(payment.spend || 0), Number(payment.inflow || 0)),
    date: payment.date,
    detail: payment.pending ? "Plaid sees it pending." : "Plaid sees it posted."
  };
}

function financialMoves(analysis) {
  const accounts = analysis.accounts || {};
  const settings = analysis.settings || {};
  const goal = analysis.goal || {};
  const floor = Number(settings.cashFloor || 0);
  const cash = Number(accounts.cash || 0);
  const creditLoanBalance = Number(accounts.debtTotal || 0);
  const cashRoom = Math.max(0, cash - floor);
  const payment = paymentStatus(analysis);
  const moves = [];

  if (!accounts.connected) {
    moves.push({
      label: "Connect Chase",
      detail: "Use current balances."
    });
  }
  if (accounts.connected && creditLoanBalance > 0 && payment.status !== "not_visible") {
    moves.push({
      label: payment.status === "pending" ? "A3 is watching" : "Already checked",
      detail: `${moneyExact.format(payment.amount)} ${payment.status === "pending" ? "pending" : "posted"} in Plaid.`
    });
    moves.push({
      label: "Do not move A3 cash",
      detail: payment.status === "pending" ? "Wait for posted status." : "Keep the floor while balance remains."
    });
  } else if (accounts.connected) {
    moves.push({
      label: "A3 is checking",
      detail: "Plaid will be checked again."
    });
  }
  if (creditLoanBalance > 0) {
    moves.push({
      label: `Keep ${money.format(floor)} cash`,
      detail: `${money.format(cashRoom)} cushion right now`
    });
  } else if (goal.downPaymentGap > 0) {
    moves.push({
      label: "A3 down payment",
      detail: `${money.format(goal.downPaymentGap)} left after cash floor`
    });
  }
  const fallbackMoves = [
    { label: "Keep cash steady", detail: "Do not guess with old numbers." },
    { label: "A3 down payment", detail: "Wait for current Chase data." },
    { label: "One move", detail: "No extra action until data is current." }
  ];
  for (const fallback of fallbackMoves) {
    if (moves.length >= 3) break;
    if (!moves.some((move) => move.label === fallback.label)) moves.push(fallback);
  }
  return moves.slice(0, 3);
}

function renderFinancialMoves(moves) {
  if (!els.moveOneLabel) return;
  const slots = [
    [els.moveOneLabel, els.moveOneDetail],
    [els.moveTwoLabel, els.moveTwoDetail],
    [els.moveThreeLabel, els.moveThreeDetail]
  ];
  slots.forEach(([labelNode, detailNode], index) => {
    const move = moves[index] || { label: "", detail: "" };
    labelNode.textContent = move.label;
    detailNode.textContent = move.detail;
  });
}

function itemDetail(item) {
  return String(item?.detail || item?.body || "").trim();
}

function findImprovement(items, label) {
  return items.find((item) => item.label === label);
}

function primaryFix(items, accounts) {
  const biggestLeak = findImprovement(items, "Biggest leak");
  if (biggestLeak) {
    const detail = itemDetail(biggestLeak);
    const match = detail.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      return {
        label: `Freeze ${match[1].trim()}`,
        detail: match[2].trim(),
        severity: biggestLeak.severity || "watch"
      };
    }
    return { label: "Freeze biggest leak", detail, severity: biggestLeak.severity || "watch" };
  }

  const mistake = findImprovement(items, "Mistake to avoid");
  if (mistake) return { label: "Do not move A3 cash", detail: itemDetail(mistake), severity: "danger" };

  const first = items[0];
  if (first) return { label: actionLabel(first), detail: itemDetail(first), severity: first.severity || "watch" };

  return {
    label: accounts.connected ? "Hold cash steady" : "Connect Chase",
    detail: accounts.connected ? "A3 is waiting for current spending patterns." : "Current bank data is needed before moving A3 cash.",
    severity: "watch"
  };
}

function actionLabel(item) {
  switch (item?.label) {
    case "Mistake to avoid":
      return "Do not move A3 cash";
    case "Cash floor":
      return "Keep cash floor";
    case "Biggest leak":
      return "Freeze biggest leak";
    case "Food leak":
      return "Cut food 7 days";
    case "7-day rule":
      return "Pause card spending";
    case "Payment posted":
      return "Already posted";
    case "Payment pending":
      return "Still pending";
    case "Missing":
      return "Connect Chase";
    default:
      return item?.label || "";
  }
}

function orderedImprovements(items, primary) {
  const labels = ["Mistake to avoid", "7-day rule", "Food leak", "Cash floor", "Payment posted", "Payment pending", "A3 cash", "Missing", "Floor"];
  const ordered = [];
  for (const label of labels) {
    const item = findImprovement(items, label);
    if (item && itemDetail(item) !== primary.detail) ordered.push(item);
  }
  for (const item of items) {
    if (!ordered.includes(item) && itemDetail(item) !== primary.detail) ordered.push(item);
  }
  return ordered.slice(0, 3);
}

function renderCutAssist(improvements, accounts) {
  const spending = Array.isArray(improvements.spending) ? improvements.spending : [];
  const first = primaryCutItem(spending);
  activeCutItem = first;

  if (!first) {
    els.cutTitle.textContent = accounts.connected ? "Hold spending" : "Connect Chase";
    els.cutReason.textContent = accounts.connected ? "A3 needs more current transactions." : "Current transactions are needed first.";
    els.cutSteps.innerHTML = `
      <li>Keep the cash floor.</li>
      <li>Do not add new card spend.</li>
      <li>Sync again tomorrow.</li>
    `;
    return;
  }

  els.cutTitle.textContent = `No ${first.label} today`;
  els.cutReason.textContent = `${first.impactLabel || ""}. ${first.next || "Freeze this for 7 days."}`.trim();
  els.cutSteps.innerHTML = `
    <li>Close checkout.</li>
    <li>${escapeHtml(replacementStep(first))}</li>
    <li>Wait 20 minutes.</li>
  `;
}

function renderSpendLeaks(improvements, accounts, locks = []) {
  const spending = Array.isArray(improvements.spending) ? improvements.spending : [];
  els.spendWindow.textContent = accounts.connected ? "14d + 90d" : "Waiting for Chase";
  const visibleSpending = spending;

  if (!visibleSpending.length) {
    els.spendLeakList.innerHTML = `<div class="spend-leak-row">
      <div>
        <strong>${accounts.connected ? "No leak list yet" : "Connect Chase"}</strong>
        <span>${accounts.connected ? "A3 needs more current transactions." : "Bank data is needed."}</span>
      </div>
      <p>${accounts.connected ? "Keep the cash floor and wait for the next sync." : "No spending recommendations until current transactions are available."}</p>
    </div>`;
    return;
  }

  els.spendLeakList.innerHTML = visibleSpending.map((item) => {
    const rank = String(item.priorityRank || "").padStart(2, "0");
    const pattern = item.pattern ? `${item.pattern} - ` : "";
    return `
      <div class="spend-leak-row" data-severity="${escapeHtml(item.severity || "watch")}">
        <span class="spend-rank">${escapeHtml(rank)}</span>
        <div>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(`${pattern}${item.issue || `${money.format(item.amount || 0)} / ${item.window || "90 days"}`}`)}</span>
          <em>${escapeHtml(item.impactLabel || `+${money.format(item.monthlyImpact || 0)}/mo if cut`)}</em>
        </div>
        <p>${escapeHtml(item.next || "Freeze for 7 days unless it is necessary.")}</p>
      </div>
    `;
  }).join("");
}

function renderImprovements(analysis, locks = []) {
  const improvements = analysis.improvements || {};
  const accounts = analysis.accounts || {};
  const goal = analysis.goal || {};
  const settings = analysis.settings || {};
  const floor = Number(settings.cashFloor || 0);
  const items = Array.isArray(improvements.items) ? improvements.items : [];
  const fallback = accounts.connected
    ? [
        {
          label: "Mistake to avoid",
          detail: accounts.debtTotal > 0
            ? `Do not add A3 cash while ${money.format(accounts.debtTotal)} card/loan balance remains.`
            : `Keep ${money.format(floor)} untouched before moving A3 cash.`,
          severity: accounts.debtTotal > 0 ? "danger" : "watch"
        },
        {
          label: "Missing",
          detail: `${money.format(goal.downPaymentGap || 0)} A3 gap after the cash floor.`,
          severity: "watch"
        }
      ]
    : [
        { label: "Missing", detail: "Connect Chase before moving A3 cash.", severity: "watch" },
        { label: "Floor", detail: `${money.format(floor)} stays untouched.`, severity: "watch" }
      ];
  const rows = (items.length ? items : fallback).slice(0, 6);
  const primary = primaryFix(rows, accounts);
  const ordered = orderedImprovements(rows, primary);
  els.primaryFixLabel.textContent = primary.label;
  els.primaryFixDetail.textContent = primary.detail;
  els.improvementState.textContent = improvements.state || (accounts.connected ? "Live Chase data." : "Chase not connected.");
  els.improvementList.innerHTML = ordered.map((item, index) => `
    <div class="improvement-row" data-severity="${escapeHtml(item.severity || "watch")}" data-step="${String(index + 1).padStart(2, "0")}">
      <strong>${escapeHtml(actionLabel(item))}</strong>
      <span>${escapeHtml(itemDetail(item))}</span>
    </div>
  `).join("");
  renderCutAssist(improvements, accounts, locks);
  renderSpendLeaks(improvements, accounts, locks);
}

async function loadState() {
  const data = await api("/api/state");
  hideLock();
  render(data);
}

function render(data) {
  lastState = data;
  const analysis = data.analysis;
  const settings = analysis.settings;
  const goal = analysis.goal;
  const latestRun = data.advisorRuns[0];
  const latestImport = data.imports[0];
  const sampleOnly = isSampleOnly(data);
  const accounts = analysis.accounts || {};

  renderBankControls(data);
  els.modeSelect.value = settings.mode;
  els.balanceInput.value = settings.currentBalance;
  els.floorInput.value = settings.cashFloor;
  els.downPaymentInput.value = settings.downPaymentTarget;
  els.monthlyCapInput.value = settings.monthlyCarCap;
  els.targetDateInput.value = settings.targetDate || "";

  els.a3Price.textContent = money.format(data.goal.priceAsBuilt);
  els.a3Code.textContent = data.goal.audiCode;
  els.a3Build.textContent = `${data.goal.exterior} / ${data.goal.interior} / ${data.goal.package}`;

  document.documentElement.dataset.state = sampleOnly ? "watch" : analysis.readiness.color;
  renderGoalMeter(goal, sampleOnly, data);

  if (sampleOnly) {
    const plaidReviewPending = Boolean(data.plaid?.productionReviewPending);
    els.storageState.textContent = plaidReviewPending ? "Plaid review" : data.plaid?.configured ? "Bank off" : "Setup needed";
    els.stateLabel.textContent = plaidReviewPending
      ? "Plaid review"
      : data.plaid?.configured
        ? "Chase"
        : "Plaid";
    els.stateReason.textContent = plaidReviewPending
      ? "Chase pending."
      : "Connect Chase.";
    els.gapValue.textContent = "No bank data";
    els.gapLabel.textContent = "Balances are not connected.";
    els.actionLabel.textContent = plaidReviewPending ? "Plaid review pending" : data.plaid?.configured ? "Connect bank" : "Plaid setup needed";
    els.actionDetail.textContent = plaidReviewPending
      ? "Waiting for Plaid production approval."
      : data.plaid?.configured
        ? "Use Chase through Plaid."
        : "Plaid API keys missing.";
    els.advisorStatus.textContent = "Paused";
    els.advisorAction.textContent = plaidReviewPending ? "Chase tracking pending." : "Connect Chase first.";
    els.advisorSummary.textContent = "No sample numbers are used.";
    els.advisorEffect.textContent = plaidReviewPending ? "Spending plan starts after bank link." : "";
    renderImprovements(analysis, data.spendingLocks || []);
    renderRows(els.watchList, [{ label: "Bank off", detail: "No connected Chase data." }], (item) => [item.label, item.detail]);
    renderBankAccounts(accounts.items || []);
    renderRows(els.eventList, data.events, (item) => [item.label, item.type]);
    els.transactionList.innerHTML = `<div class="empty">Hidden until current data is imported.</div>`;
    return;
  }

  els.storageState.textContent = latestRun?.error
    ? "AI blocked"
    : data.plaid?.connected
      ? "Bank on"
      : data.openaiConfigured
      ? "AI on"
      : "CSV data";
  const targetProgress = goal.downPaymentTarget > 0
    ? Math.round(clamp(goal.availableForDownPayment / goal.downPaymentTarget, 0, 1) * 100)
    : 0;
  els.stateLabel.textContent = goal.downPaymentGap <= 0 ? "A3 ready" : `${targetProgress}% funded`;
  els.stateReason.textContent = goal.downPaymentGap <= 0
    ? "Down payment target covered above floor."
    : `${money.format(goal.downPaymentGap)} left for down payment target.`;
  els.gapValue.textContent = accounts.debtTotal > 0 ? money.format(accounts.debtTotal) : money.format(goal.downPaymentGap);
  els.gapLabel.textContent = accounts.connected
    ? `${money.format(accounts.cash || 0)} cash / ${dateTimeLabel(accounts.lastUpdatedAt)}`
    : `${money.format(goal.availableForDownPayment)} above floor`;
  const advisorDisplay = compactAdvisor(latestRun, analysis);
  els.actionLabel.textContent = accounts.debtTotal > 0 ? advisorDisplay.status : latestRun?.advice?.one_action || analysis.action.label;
  els.actionDetail.textContent = accounts.debtTotal > 0 ? advisorDisplay.summary : latestRun?.advice?.why || analysis.action.detail;
  els.advisorStatus.textContent = advisorDisplay.status;
  els.advisorAction.textContent = advisorDisplay.action;
  els.advisorSummary.textContent = advisorDisplay.summary;
  els.advisorEffect.textContent = advisorDisplay.effect;
  renderImprovements(analysis, data.spendingLocks || []);

  renderRows(els.watchList, analysis.watch, (item) => [item.label, item.detail]);
  renderBankAccounts(accounts.items || []);
  renderRows(els.eventList, data.events.slice(0, 8), (item) => [item.label, `${item.type} / ${new Date(item.createdAt).toLocaleString()}`]);
  renderTransactions(analysis.transactions);
}

function renderRows(container, items, mapper) {
  container.innerHTML = items.length ? items.map((item) => {
    const [label, detail] = mapper(item);
    return `<div class="row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>`;
  }).join("") : `<div class="empty">None.</div>`;
}

function titleCase(value) {
  const text = String(value || "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function renderTransactions(transactions) {
  els.transactionList.innerHTML = transactions.slice(0, 8).map((transaction) => {
    const value = transaction.spend > 0 ? -transaction.spend : transaction.inflow;
    return `<div class="tx">
      <strong>${escapeHtml(transaction.merchant)}</strong>
      <span>${escapeHtml(dateLabel(transaction.date))} / ${escapeHtml(transaction.category)} / ${escapeHtml(moneyExact.format(value))}</span>
    </div>`;
  }).join("") || `<div class="empty">No transactions.</div>`;
}

function renderBankAccounts(accounts) {
  els.bankList.innerHTML = accounts.length ? accounts.map((account) => {
    const balance = account.balanceAvailable ?? account.balanceCurrent;
    const label = [account.name, account.mask ? `ending ${account.mask}` : ""].filter(Boolean).join(" ");
    const detail = [
      account.type || "account",
      account.subtype || "",
      Number.isFinite(Number(balance)) ? moneyExact.format(Number(balance)) : "--"
    ].filter(Boolean).join(" / ");
    return `<div class="row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(detail)}</span>
    </div>`;
  }).join("") : `<div class="empty">Not connected.</div>`;
}

function settingsPayload() {
  return {
    settings: {
      mode: els.modeSelect.value,
      currentBalance: els.balanceInput.value.trim(),
      cashFloor: Number(els.floorInput.value || 0),
      downPaymentTarget: Number(els.downPaymentInput.value || 0),
      monthlyCarCap: Number(els.monthlyCapInput.value || 0),
      targetDate: els.targetDateInput.value
    }
  };
}

async function exchangePlaidPublicToken(publicToken, metadata) {
  await api("/api/plaid/exchange-public-token", {
    method: "POST",
    body: JSON.stringify({ public_token: publicToken, metadata })
  });
  localStorage.removeItem("a3PlaidLinkToken");
}

async function connectBank() {
  try {
    setBusy("Connecting");
    const data = await api("/api/plaid/link-token", {
      method: "POST",
      body: JSON.stringify({})
    });
    localStorage.setItem("a3PlaidLinkToken", data.link_token);
    if (!window.Plaid) throw new Error("Plaid blocked");
    const handler = window.Plaid.create({
      token: data.link_token,
      onSuccess: async (public_token, metadata) => {
        setBusy("Syncing");
        await exchangePlaidPublicToken(public_token, metadata);
        await loadState();
      },
      onExit: (error) => {
        if (error) setBusy("Blocked");
      }
    });
    handler.open();
  } catch (error) {
    setBusy("Setup needed");
    if (/Plaid is not configured/i.test(error.message)) {
      els.actionLabel.textContent = "Plaid setup needed";
      els.actionDetail.textContent = "Plaid API keys missing.";
      return;
    }
    if (/Plaid production review pending/i.test(error.message)) {
      els.actionLabel.textContent = "Plaid review pending";
      els.actionDetail.textContent = "Waiting for Plaid production approval.";
      return;
    }
    if (/Production Plaid key needed/i.test(error.message)) {
      els.actionLabel.textContent = "Production key needed";
      els.actionDetail.textContent = "Use the Plaid Production secret.";
      return;
    }
    if (/Plaid redirect URI needed/i.test(error.message)) {
      els.actionLabel.textContent = "Redirect URI needed";
      els.actionDetail.textContent = "Save the A3 OAuth URI in Plaid.";
      return;
    }
    document.body.insertAdjacentHTML("beforeend", `<pre class="boot-error">${escapeHtml(error.message)}</pre>`);
  }
}

connectButtons().forEach((button) => {
  button.addEventListener("click", connectBank);
});

els.syncBank.addEventListener("click", async () => {
  try {
    setBusy("Syncing");
    await api("/api/plaid/sync", {
      method: "POST",
      body: JSON.stringify({})
    });
    await loadState();
  } catch (error) {
    setBusy("Blocked");
    document.body.insertAdjacentHTML("beforeend", `<pre class="boot-error">${escapeHtml(error.message)}</pre>`);
  }
});

els.saveSettings.addEventListener("click", async () => {
  setBusy("Saving");
  await api("/api/settings", {
    method: "POST",
    body: JSON.stringify(settingsPayload())
  });
  await loadState();
});

els.csvInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    setBusy("Importing");
    const text = await file.text();
    await api("/api/import-csv", {
      method: "POST",
      body: JSON.stringify({ name: file.name, text })
    });
    await loadState();
  } finally {
    event.target.value = "";
  }
});

els.unlockButton.addEventListener("click", async () => {
  const code = els.accessInput.value.trim();
  if (!code) return;
  try {
    setBusy("Unlocking");
    await api("/api/auth/check", {
      method: "POST",
      body: JSON.stringify({ code }),
      accessCodeOverride: code
    });
    localStorage.setItem("a3AccessCode", code);
    await loadState();
  } catch (error) {
    showLock(error.message);
    setBusy("Locked");
  }
});

els.accessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") els.unlockButton.click();
});

loadState().catch((error) => {
  if (error.locked) {
    setBusy("Locked");
    showLock(error.message);
    return;
  }
  setBusy("Blocked");
  document.body.insertAdjacentHTML("beforeend", `<pre class="boot-error">${escapeHtml(error.message)}</pre>`);
});
