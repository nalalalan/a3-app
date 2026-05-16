const els = {
  storageState: document.getElementById("storageState"),
  connectBank: document.getElementById("connectBank"),
  syncBank: document.getElementById("syncBank"),
  csvInput: document.getElementById("csvInput"),
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
  watchList: document.getElementById("watchList"),
  bankList: document.getElementById("bankList"),
  eventList: document.getElementById("eventList"),
  transactionList: document.getElementById("transactionList")
};

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

function renderGoalMeter(goal, sampleOnly, data) {
  const target = Math.max(0, Number(goal.downPaymentTarget || 0));
  const saved = Math.max(0, Number(goal.availableForDownPayment || 0));
  const progress = !sampleOnly && target > 0 ? clamp(saved / target, 0, 1) : 0;
  els.goalMeterFill.style.width = `${Math.round(progress * 100)}%`;
  els.goalSaved.textContent = sampleOnly ? "Live progress pending" : `${money.format(saved)} above floor`;
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

function showLock(message = "PIN required") {
  els.lockPanel.hidden = false;
  els.accessMessage.textContent = message;
  els.accessInput.focus();
}

function hideLock() {
  els.lockPanel.hidden = true;
  els.accessMessage.textContent = "";
}

function renderBankControls(data) {
  const plaid = data.plaid || {};
  els.connectBank.disabled = false;
  els.syncBank.disabled = !plaid.connected;
  els.connectBank.textContent = plaid.connected ? "relink" : "connect";
  els.syncBank.hidden = !plaid.connected;
  els.connectBank.title = plaid.productionReviewPending
    ? "Plaid review pending"
    : plaid.configured
      ? "Connect bank through Plaid"
      : "Plaid setup needed";
}

async function loadState() {
  const data = await api("/api/state");
  hideLock();
  render(data);
}

function render(data) {
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
    els.stateLabel.textContent = "A3 fund";
    els.stateReason.textContent = plaidReviewPending
      ? "Plaid approval unlocks Chase tracking."
      : "Connect Chase before using numbers.";
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
  els.actionLabel.textContent = latestRun?.advice?.one_action || analysis.action.label;
  els.actionDetail.textContent = latestRun?.advice?.why || analysis.action.detail;

  if (latestRun) {
    els.advisorStatus.textContent = titleCase(latestRun.advice.status);
    els.advisorAction.textContent = latestRun.advice.one_action;
    els.advisorSummary.textContent = latestRun.advice.summary;
    els.advisorEffect.textContent = latestRun.advice.a3_effect;
  } else {
    els.advisorStatus.textContent = "Ready";
    els.advisorAction.textContent = analysis.action.label;
    els.advisorSummary.textContent = analysis.action.detail;
    els.advisorEffect.textContent = "";
  }

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

els.connectBank.addEventListener("click", async () => {
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
