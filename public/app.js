const els = {
  storageState: document.getElementById("storageState"),
  connectBank: document.getElementById("connectBank"),
  connectBankPrimary: document.getElementById("connectBankPrimary"),
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
  heroA3Price: document.getElementById("heroA3Price"),
  heroA3Code: document.getElementById("heroA3Code"),
  heroA3Cabin: document.getElementById("heroA3Cabin"),
  heroMiniPrice: document.getElementById("heroMiniPrice"),
  telemetryCash: document.getElementById("telemetryCash"),
  telemetryCashMeta: document.getElementById("telemetryCashMeta"),
  telemetryBalance: document.getElementById("telemetryBalance"),
  telemetryBalanceMeta: document.getElementById("telemetryBalanceMeta"),
  telemetryNet7: document.getElementById("telemetryNet7"),
  telemetryNet30: document.getElementById("telemetryNet30"),
  telemetryNet90: document.getElementById("telemetryNet90"),
  telemetryNetYear: document.getElementById("telemetryNetYear"),
  recentPatterns: document.getElementById("recentPatterns"),
  currentIncomeValue: document.getElementById("currentIncomeValue"),
  currentIncomeDetail: document.getElementById("currentIncomeDetail"),
  ladderCurrentIncome: document.getElementById("ladderCurrentIncome"),
  ladderCurrentDetail: document.getElementById("ladderCurrentDetail"),
  debtCards: document.getElementById("debtCards"),
  debtAmountInput: document.getElementById("debtAmountInput"),
  debtAprInput: document.getElementById("debtAprInput"),
  debtMonthsInput: document.getElementById("debtMonthsInput"),
  debtCalcOutput: document.getElementById("debtCalcOutput"),
  sourceList: document.getElementById("sourceList"),
  a3Build: document.getElementById("a3Build"),
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

const monthName = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC"
});

const dayName = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC"
});

const debtRows = [
  {
    amount: 5000,
    feel: "Light if income is stable; visible but small.",
    constrain: "One subscription-like monthly claim.",
    light: "Keep APR low, keep the term finite, clear it before bigger choices."
  },
  {
    amount: 10000,
    feel: "Manageable if income is stable and the payment stays small. Heavy when cash stays near 0.",
    constrain: "A recurring claim on future Alan every month.",
    light: "Pair it with stable income and avoid stacking extra balances beside it."
  },
  {
    amount: 25000,
    feel: "Real monthly gravity. Still understandable with a steady plan.",
    constrain: "Rent, car payment, insurance, food, and savings all compete with it.",
    light: "Use lower APR, shorter horizon, and income expansion to keep the claim breathable."
  },
  {
    amount: 50000,
    feel: "Large monthly claim on future Alan. Morality is irrelevant; capacity is the question.",
    constrain: "Narrows flexibility unless income is strong or the payoff horizon is deliberate.",
    light: "Treat the payment as assigned income before spending the rest."
  },
  {
    amount: 100000,
    feel: "Powerful leverage or heavy pressure, depending on income.",
    constrain: "Requires a high-income plan, long horizon, or ownership upside.",
    light: "Reserve this level for income ladders with strong proof or business ownership."
  }
];

const sources = [
  ["Autonomy & motivation", "Ryan & Deci 2000 Self-Determination Theory", "https://doi.org/10.1037/0003-066X.55.1.68"],
  ["Music reward", "Salimpoor et al. 2011 dopamine and music pleasure", "https://doi.org/10.1038/nn.2726"],
  ["Music reward", "Blood & Zatorre 2001 intensely pleasurable music", "https://doi.org/10.1073/pnas.191355898"],
  ["Experiences and happiness", "Van Boven & Gilovich 2003 To do or to have?", "https://doi.org/10.1037/0022-3514.85.6.1193"],
  ["Experiences and happiness", "Dunn, Gilbert, Wilson 2011 spending money for happiness", "https://doi.org/10.1016/j.jcps.2011.02.002"],
  ["Urban parks happiness", "Park visits and happiness study", "https://arxiv.org/abs/1906.08335"],
  ["Nature exposure", "Short-term nature exposure meta-analysis", "https://arxiv.org/abs/2401.16459"],
  ["Autism transportation independence", "Rutgers/VTC Lubin & Feeley 2016 autism transportation issues", "https://vtc.rutgers.edu/publication/transportation-issues-of-adults-on-the-autism-spectrum-findings-from-focus-group-discussions/"],
  ["Transportation and employment", "Blumenberg & Pierce 2017 auto access and employment", "https://doi.org/10.1177/0739456X16633501"],
  ["Transportation and employment", "Raphael & Rice 2002 car ownership, employment, earnings", "https://doi.org/10.1016/S0094-1190(02)00017-7"],
  ["Transportation and healthcare", "Transportation barriers and healthcare access review", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4265215/"],
  ["Debt-to-income", "CFPB debt-to-income ratio explanation", "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/"],
  ["Household debt context", "Federal Reserve Bank of New York household debt and credit", "https://www.newyorkfed.org/microeconomics/hhdc"],
  ["Debt and mental health", "Richardson, Elliott & Roberts 2013 systematic review", "https://doi.org/10.1016/j.cpr.2012.12.002"],
  ["Mechanical engineer pay", "BLS Mechanical Engineers Occupational Outlook Handbook", "https://www.bls.gov/ooh/architecture-and-engineering/mechanical-engineers.htm"],
  ["Disney role context", "Disney Careers", "https://www.disneycareers.com/"],
  ["Disney salary context", "Indeed Disney mechanical engineer pay context", "https://www.indeed.com/cmp/Disney-Parks,-Experiences-and-Products/salaries/Mechanical-Engineer"],
  ["Disney salary context", "Levels.fyi Disney software engineer compensation context", "https://www.levels.fyi/companies/disney/salaries/software-engineer"],
  ["Audi A3 specs/features", "Current app build PDF", "/a3-awg0xsw9.pdf"]
];

let lastState = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseMoneyInput(value) {
  const cleaned = String(value || "").replace(/[^0-9.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function cleanVisibleText(value) {
  return String(value ?? "")
    .replace(/\bNo\b[:.]?\s*/gi, "")
    .replace(/not ready/gi, "runway forming")
    .replace(/unsafe/gi, "high zone")
    .replace(/danger/gi, "high zone")
    .replace(/failed/gi, "pending")
    .replace(/blocked/gi, "held")
    .replace(/cash short/gi, "cash gap")
    .replace(/spending leaks/gi, "recent patterns")
    .replace(/walk away|walk at|walk if/gi, "high zone")
    .replace(/\bshould\b/gi, "can")
    .replace(/\bmust\b/gi, "requires")
    .replace(/\bDo not\b/gi, "Keep")
    .replace(/\s+/g, " ")
    .trim();
}

function dateLabel(date) {
  if (!date) return "pending";
  return dayName.format(new Date(`${date}T00:00:00Z`));
}

function monthLabel(month) {
  if (!month) return "pending";
  return monthName.format(new Date(`${month}-01T00:00:00Z`));
}

function dateTimeLabel(value) {
  if (!value) return "pending";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function isSampleOnly(data) {
  return !(data.imports || []).some((item) => item.source !== "sample");
}

function dailyRows(data) {
  const rows = Array.isArray(data?.analysis?.dailyNet?.days) ? data.analysis.dailyNet.days : [];
  return rows
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || "")))
    .map((item) => ({
      date: item.date,
      net: Number(item.net || 0),
      inflow: Number(item.inflow || 0),
      spend: Number(item.spend || 0)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function daysAgoKey(baseDate, days) {
  const date = new Date(`${baseDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function netForRange(rows, days) {
  if (!rows.length) return null;
  const latest = rows[rows.length - 1].date;
  const start = daysAgoKey(latest, days - 1);
  return rows
    .filter((item) => item.date >= start && item.date <= latest)
    .reduce((total, item) => total + Number(item.net || 0), 0);
}

function monthlyIncomeRead(data, sampleOnly) {
  const months = Array.isArray(data?.analysis?.monthlyNet?.months) ? data.analysis.monthlyNet.months : [];
  const activeMonths = months.filter((item) => Number(item.count || 0) > 0);
  const last = activeMonths[activeMonths.length - 1] || null;
  const recent = activeMonths.slice(-3);
  const avgInflow = recent.length
    ? recent.reduce((total, item) => total + Number(item.inflow || 0), 0) / recent.length
    : 0;
  if (avgInflow <= 0) {
    return {
      value: "Telemetry pending",
      detail: "Import CSV or connect bank to estimate."
    };
  }
  return {
    value: `${money.format(avgInflow)}/mo inflow`,
    detail: `${sampleOnly ? "Sample pattern" : "Detected pattern"} / latest ${money.format(last?.inflow || 0)} in ${monthLabel(last?.month)}.`
  };
}

function financeStateLabel(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Awaiting telemetry";
  return money.format(Number(value));
}

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

function setBusy(label) {
  setText(els.storageState, cleanVisibleText(label));
}

function hideLock() {
  document.body.classList.remove("locked-view");
  if (els.lockPanel) els.lockPanel.hidden = true;
  setText(els.accessMessage, "");
}

function showLock(message = "") {
  document.body.classList.add("locked-view");
  if (els.lockPanel) els.lockPanel.hidden = false;
  setText(els.accessMessage, message ? "PIN mismatch." : "PIN unlocks telemetry.");
}

function connectButtons() {
  return [els.connectBank, els.connectBankPrimary].filter(Boolean);
}

function renderBankControls(data) {
  const plaid = data?.plaid || {};
  const connected = Boolean(plaid.connected);
  for (const button of connectButtons()) {
    button.disabled = !plaid.configured || Boolean(plaid.productionReviewPending);
    button.hidden = connected;
  }
  if (els.syncBank) {
    els.syncBank.hidden = !connected;
    els.syncBank.disabled = !connected;
  }
}

function settingsPayload() {
  return {
    settings: {
      mode: els.modeSelect?.value || "auto",
      currentBalance: els.balanceInput?.value.trim() || "",
      cashFloor: Number(els.floorInput?.value || 0),
      downPaymentTarget: Number(els.downPaymentInput?.value || 0),
      monthlyCarCap: Number(els.monthlyCapInput?.value || 0),
      targetDate: els.targetDateInput?.value || ""
    }
  };
}

function loanPayment(principal, apr, months) {
  const amount = Math.max(0, Number(principal || 0));
  const term = Math.max(1, Number(months || 1));
  const monthlyRate = Math.max(0, Number(apr || 0)) / 100 / 12;
  if (monthlyRate === 0) {
    const payment = amount / term;
    return { payment, interest: 0 };
  }
  const payment = amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -term));
  return { payment, interest: (payment * term) - amount };
}

function renderDebtPhysics() {
  if (!els.debtCards) return;
  els.debtCards.innerHTML = debtRows.map((row) => {
    const low = loanPayment(row.amount, 7, 60);
    const high = loanPayment(row.amount, 20, 60);
    return `
      <article class="debt-card">
        <div class="debt-card-head">
          <span>${escapeHtml(money.format(row.amount))}</span>
          <strong>${escapeHtml(money.format(low.payment))}/mo at 7%</strong>
        </div>
        <div class="debt-rate-grid">
          <div>
            <span>7% APR / 60mo</span>
            <strong>${escapeHtml(money.format(low.payment))}/mo</strong>
            <em>${escapeHtml(money.format(low.interest))} interest</em>
          </div>
          <div>
            <span>20% APR / 60mo</span>
            <strong>${escapeHtml(money.format(high.payment))}/mo</strong>
            <em>${escapeHtml(money.format(high.interest))} interest</em>
          </div>
        </div>
        <dl>
          <dt>Feels like</dt>
          <dd>${escapeHtml(row.feel)}</dd>
          <dt>Constrains</dt>
          <dd>${escapeHtml(row.constrain)}</dd>
          <dt>Keeps light</dt>
          <dd>${escapeHtml(row.light)}</dd>
        </dl>
      </article>
    `;
  }).join("");
  renderDebtCalculator();
}

function renderDebtCalculator() {
  if (!els.debtCalcOutput) return;
  const amount = parseMoneyInput(els.debtAmountInput?.value || "");
  const apr = Number(els.debtAprInput?.value || 0);
  const months = Number(els.debtMonthsInput?.value || 60);
  const result = loanPayment(amount, apr, months);
  els.debtCalcOutput.textContent = `${money.format(result.payment)}/mo / ${money.format(result.interest)} interest`;
}

function renderSources() {
  if (!els.sourceList) return;
  els.sourceList.innerHTML = sources.map(([group, title, url]) => `
    <a class="source-card" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
      <span>${escapeHtml(group)}</span>
      <strong>${escapeHtml(title)}</strong>
      <em>${escapeHtml(url)}</em>
    </a>
  `).join("");
}

function renderPatterns(data, sampleOnly) {
  if (!els.recentPatterns) return;
  const improvements = data?.analysis?.improvements || {};
  const progressRows = Array.isArray(improvements.progress?.rows) ? improvements.progress.rows.slice(0, 2) : [];
  const spendingRows = Array.isArray(improvements.spending) ? improvements.spending.slice(0, 3) : [];
  const rows = [
    ...progressRows.map((item) => ({
      label: item.label || "Held pattern",
      detail: item.detail || item.impactLabel || "Recent pattern eased."
    })),
    ...spendingRows.map((item) => ({
      label: item.label || "Recent pattern",
      detail: item.issue || item.impactLabel || `${money.format(item.amount || 0)} / ${item.window || "recent window"}`
    }))
  ].slice(0, 4);

  if (!rows.length) {
    els.recentPatterns.innerHTML = `<div class="mini-row"><strong>Pattern layer quiet</strong><span>${sampleOnly ? "Sample telemetry loaded." : "Telemetry will appear after import or bank sync."}</span></div>`;
    return;
  }

  els.recentPatterns.innerHTML = rows.map((item) => `
    <div class="mini-row">
      <strong>${escapeHtml(cleanVisibleText(item.label))}</strong>
      <span>${escapeHtml(cleanVisibleText(item.detail))}</span>
    </div>
  `).join("");
}

function renderTelemetry(data, sampleOnly) {
  const analysis = data.analysis || {};
  const accounts = analysis.accounts || {};
  const totals = analysis.totals || {};
  const rows = dailyRows(data);
  const cash = accounts.connected ? Number(accounts.cash || 0) : totals.balanceKnown ? Number(totals.balance || 0) : null;
  const balance = accounts.connected ? Number(accounts.debtTotal || 0) : null;
  const net7 = netForRange(rows, 7);
  const net30 = Number.isFinite(Number(totals.net30)) ? Number(totals.net30) : netForRange(rows, 30);
  const net90 = netForRange(rows, 90);
  const netYear = netForRange(rows, 365);
  const income = monthlyIncomeRead(data, sampleOnly);

  setText(els.telemetryCash, financeStateLabel(cash));
  setText(els.telemetryCashMeta, accounts.connected ? `updated ${dateTimeLabel(accounts.lastUpdatedAt)}` : sampleOnly ? "sample / import layer" : "current cash");
  setText(els.telemetryBalance, financeStateLabel(balance));
  setText(els.telemetryBalanceMeta, accounts.connected ? "credit + loan accounts" : "private account layer");
  setText(els.telemetryNet7, financeStateLabel(net7));
  setText(els.telemetryNet30, financeStateLabel(net30));
  setText(els.telemetryNet90, financeStateLabel(net90));
  setText(els.telemetryNetYear, financeStateLabel(netYear));
  setText(els.currentIncomeValue, income.value);
  setText(els.currentIncomeDetail, income.detail);
  setText(els.ladderCurrentIncome, income.value);
  setText(els.ladderCurrentDetail, income.detail);
  renderPatterns(data, sampleOnly);
}

function renderBuild(data) {
  const goal = data.goal || {};
  const price = Number(goal.priceAsBuilt || 46095);
  setText(els.heroA3Price, money.format(price));
  setText(els.heroA3Code, goal.audiCode || "AWG0XSW9");
  setText(els.heroA3Cabin, cleanVisibleText(goal.interior || "Parchment Beige"));
  setText(els.heroMiniPrice, "$39,825");
  setText(els.a3Build, cleanVisibleText(`${goal.exterior || "Arkona White"} / ${goal.interior || "Parchment Beige-Steel Gray"} / ${goal.package || "Black optic package"}`));
}

function renderDetails(data) {
  const analysis = data.analysis || {};
  const accounts = analysis.accounts || {};
  const watchRows = Array.isArray(analysis.watch) ? analysis.watch : [];
  const bankRows = Array.isArray(accounts.items) ? accounts.items : [];
  const events = Array.isArray(data.events) ? data.events.slice(0, 8) : [];
  const transactions = Array.isArray(analysis.transactions) ? analysis.transactions.slice(0, 10) : [];

  renderRows(els.watchList, watchRows, (item) => [
    cleanVisibleText(item.label || "Watch item"),
    cleanVisibleText(item.detail || "")
  ]);
  renderRows(els.bankList, bankRows, (account) => {
    const balance = account.balanceAvailable ?? account.balanceCurrent;
    const label = [account.name, account.mask ? `ending ${account.mask}` : ""].filter(Boolean).join(" ");
    const detail = [
      account.type || "account",
      account.subtype || "",
      Number.isFinite(Number(balance)) ? moneyExact.format(Number(balance)) : "pending"
    ].filter(Boolean).join(" / ");
    return [label || "Account", detail];
  });
  renderRows(els.eventList, events, (item) => [
    cleanVisibleText(item.label || item.type || "Event"),
    cleanVisibleText(`${item.type || "event"} / ${dateTimeLabel(item.createdAt)}`)
  ]);
  renderTransactions(transactions);
}

function renderRows(container, rows, mapper) {
  if (!container) return;
  if (!rows.length) {
    container.innerHTML = `<div class="empty">Clear.</div>`;
    return;
  }
  container.innerHTML = rows.map((item) => {
    const [label, detail] = mapper(item);
    return `<div class="row"><strong>${escapeHtml(cleanVisibleText(label))}</strong><span>${escapeHtml(cleanVisibleText(detail))}</span></div>`;
  }).join("");
}

function renderTransactions(transactions) {
  if (!els.transactionList) return;
  if (!transactions.length) {
    els.transactionList.innerHTML = `<div class="empty">Awaiting transaction layer.</div>`;
    return;
  }
  els.transactionList.innerHTML = transactions.map((transaction) => {
    const value = Number(transaction.spend || 0) > 0 ? -Number(transaction.spend || 0) : Number(transaction.inflow || transaction.amount || 0);
    return `<div class="tx">
      <strong>${escapeHtml(cleanVisibleText(transaction.merchant || transaction.description || "Transaction"))}</strong>
      <span>${escapeHtml(dateLabel(transaction.date))} / ${escapeHtml(cleanVisibleText(transaction.category || "category"))} / ${escapeHtml(moneyExact.format(value))}</span>
    </div>`;
  }).join("");
}

function renderSettings(data) {
  const settings = data.analysis?.settings || {};
  if (els.modeSelect) els.modeSelect.value = settings.mode || "auto";
  if (els.balanceInput) els.balanceInput.value = settings.currentBalance || "";
  if (els.floorInput) els.floorInput.value = settings.cashFloor ?? "";
  if (els.downPaymentInput) els.downPaymentInput.value = settings.downPaymentTarget ?? "";
  if (els.monthlyCapInput) els.monthlyCapInput.value = settings.monthlyCarCap ?? "";
  if (els.targetDateInput) els.targetDateInput.value = settings.targetDate || "";
}

function render(data) {
  lastState = data;
  const sampleOnly = isSampleOnly(data);
  const plaidReviewPending = Boolean(data.plaid?.productionReviewPending);
  renderBankControls(data);
  renderBuild(data);
  renderTelemetry(data, sampleOnly);
  renderDetails(data);
  renderSettings(data);

  if (sampleOnly) {
    setBusy(plaidReviewPending ? "bank review" : data.plaid?.configured ? "bank ready" : "import ready");
  } else {
    setBusy(data.plaid?.connected ? "bank on" : "csv telemetry");
  }
}

async function loadState() {
  const data = await api("/api/state");
  hideLock();
  render(data);
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
    setBusy("connecting");
    const data = await api("/api/plaid/link-token", {
      method: "POST",
      body: JSON.stringify({})
    });
    localStorage.setItem("a3PlaidLinkToken", data.link_token);
    if (!window.Plaid) throw new Error("Plaid script pending");
    const handler = window.Plaid.create({
      token: data.link_token,
      onSuccess: async (public_token, metadata) => {
        setBusy("syncing");
        await exchangePlaidPublicToken(public_token, metadata);
        await loadState();
      },
      onExit: () => setBusy("bank ready")
    });
    handler.open();
  } catch (error) {
    setBusy("setup path");
    const message = String(error.message || "");
    if (/Plaid production review/i.test(message)) {
      setText(els.storageState, "bank review");
    }
    document.body.insertAdjacentHTML("beforeend", `<pre class="boot-error">${escapeHtml(cleanVisibleText(message || "Setup path pending."))}</pre>`);
  }
}

connectButtons().forEach((button) => {
  button.addEventListener("click", connectBank);
});

if (els.syncBank) {
  els.syncBank.addEventListener("click", async () => {
    try {
      setBusy("syncing");
      await api("/api/plaid/sync", {
        method: "POST",
        body: JSON.stringify({})
      });
      await loadState();
    } catch (error) {
      setBusy("sync path");
      document.body.insertAdjacentHTML("beforeend", `<pre class="boot-error">${escapeHtml(cleanVisibleText(error.message || "Sync path pending."))}</pre>`);
    }
  });
}

if (els.saveSettings) {
  els.saveSettings.addEventListener("click", async () => {
    setBusy("saving");
    await api("/api/settings", {
      method: "POST",
      body: JSON.stringify(settingsPayload())
    });
    await loadState();
  });
}

if (els.csvInput) {
  els.csvInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setBusy("importing");
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
}

if (els.unlockButton) {
  els.unlockButton.addEventListener("click", async () => {
    const code = els.accessInput?.value.trim() || "";
    if (!code) return;
    try {
      setBusy("unlocking");
      await api("/api/auth/check", {
        method: "POST",
        body: JSON.stringify({ code }),
        accessCodeOverride: code
      });
      localStorage.setItem("a3AccessCode", code);
      await loadState();
    } catch (error) {
      showLock(error.message);
      setBusy("private");
    }
  });
}

if (els.accessInput) {
  els.accessInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") els.unlockButton?.click();
  });
}

[els.debtAmountInput, els.debtAprInput, els.debtMonthsInput].filter(Boolean).forEach((input) => {
  input.addEventListener("input", renderDebtCalculator);
});

renderDebtPhysics();
renderSources();

loadState().catch((error) => {
  if (error.locked) {
    setBusy("private");
    showLock();
    return;
  }
  setBusy("setup path");
  document.body.insertAdjacentHTML("beforeend", `<pre class="boot-error">${escapeHtml(cleanVisibleText(error.message || "Setup path pending."))}</pre>`);
});
