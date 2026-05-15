const els = {
  storageState: document.getElementById("storageState"),
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

function isSampleOnly(data) {
  return !(data.imports || []).some((item) => item.source !== "sample");
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

  els.modeSelect.value = settings.mode;
  els.balanceInput.value = settings.currentBalance;
  els.floorInput.value = settings.cashFloor;
  els.downPaymentInput.value = settings.downPaymentTarget;
  els.monthlyCapInput.value = settings.monthlyCarCap;
  els.targetDateInput.value = settings.targetDate || "";

  els.a3Price.textContent = money.format(data.goal.priceAsBuilt);
  els.a3Code.textContent = data.goal.audiCode;
  els.a3Build.textContent = `${data.goal.exterior} / ${data.goal.interior} / ${data.goal.package}`;

  document.documentElement.dataset.state = sampleOnly ? "danger" : analysis.readiness.color;

  if (sampleOnly) {
    els.storageState.textContent = "Not current";
    els.stateLabel.textContent = "Not current";
    els.stateReason.textContent = "Sample data only. Chase is not connected.";
    els.gapValue.textContent = "No bank data";
    els.gapLabel.textContent = "Debt and balances are missing.";
    els.actionLabel.textContent = "Import CSV";
    els.actionDetail.textContent = "Use a current Chase export.";
    els.advisorStatus.textContent = "Paused";
    els.advisorAction.textContent = "Do not use sample numbers.";
    els.advisorSummary.textContent = "Current debt is not in this app yet.";
    els.advisorEffect.textContent = "";
    renderRows(els.watchList, [{ label: "Data missing", detail: "Current Chase activity not imported." }], (item) => [item.label, item.detail]);
    renderRows(els.eventList, data.events, (item) => [item.label, item.type]);
    els.transactionList.innerHTML = `<div class="empty">Hidden until current data is imported.</div>`;
    return;
  }

  els.storageState.textContent = latestRun?.error
    ? "AI blocked"
    : data.openaiConfigured
      ? "AI on"
      : "CSV data";
  els.stateLabel.textContent = analysis.readiness.label;
  els.stateReason.textContent = latestImport
    ? `${latestImport.name || "CSV"} / ${analysis.latestDate || "no date"}`
    : analysis.readiness.reason;
  els.gapValue.textContent = money.format(goal.downPaymentGap);
  els.gapLabel.textContent = `${money.format(goal.availableForDownPayment)} above floor`;
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
