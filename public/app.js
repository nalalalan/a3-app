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
  heroCashMeta: document.getElementById("heroCashMeta"),
  heroA3Price: document.getElementById("heroA3Price"),
  heroA5Price: document.getElementById("heroA5Price"),
  blockerTitle: document.getElementById("blockerTitle"),
  blockerSummary: document.getElementById("blockerSummary"),
  blockerList: document.getElementById("blockerList"),
  simStatus: document.getElementById("simStatus"),
  simDownPaymentInput: document.getElementById("simDownPaymentInput"),
  simCashAfter: document.getElementById("simCashAfter"),
  simDebtAfter: document.getElementById("simDebtAfter"),
  simCarAfter: document.getElementById("simCarAfter"),
  simHealth: document.getElementById("simHealth"),
  simHealthRow: document.getElementById("simHealthRow"),
  affordabilityHealth: document.getElementById("affordabilityHealth"),
  affordabilityVerdict: document.getElementById("affordabilityVerdict"),
  affordabilityWhen: document.getElementById("affordabilityWhen"),
  affordabilityPace: document.getElementById("affordabilityPace"),
  affordabilityAssumption: document.getElementById("affordabilityAssumption"),
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
  dailyScanWindow: document.getElementById("dailyScanWindow"),
  dailyScanList: document.getElementById("dailyScanList"),
  spendWindow: document.getElementById("spendWindow"),
  spendLeakList: document.getElementById("spendLeakList"),
  autoUpdateState: document.getElementById("autoUpdateState"),
  reviewVerdict: document.getElementById("reviewVerdict"),
  reviewSummary: document.getElementById("reviewSummary"),
  reviewGood: document.getElementById("reviewGood"),
  reviewBad: document.getElementById("reviewBad"),
  reviewMust: document.getElementById("reviewMust"),
  netWindow: document.getElementById("netWindow"),
  netCurrent: document.getElementById("netCurrent"),
  netChart: document.getElementById("netChart"),
  netAverage: document.getElementById("netAverage"),
  netRange: document.getElementById("netRange"),
  watchList: document.getElementById("watchList"),
  bankList: document.getElementById("bankList"),
  eventList: document.getElementById("eventList"),
  transactionList: document.getElementById("transactionList")
};

let lastState = null;
let activeCutItem = null;
const downPaymentSimStorageKey = "a3DownPaymentTodayAmount";

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

function monthLabel(value) {
  if (!value) return "--";
  return new Date(`${value}-01T00:00:00Z`).toLocaleString([], { month: "short", year: "numeric", timeZone: "UTC" });
}

function weekLabel(value) {
  if (!value) return "--";
  return `Week of ${dateLabel(value)}`;
}

function forecastMonthLabel(monthsAhead) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + Math.max(0, monthsAhead));
  return date.toLocaleString([], { month: "long", year: "numeric" });
}

function moneyShort(value) {
  const numeric = Number(value || 0);
  const sign = numeric < 0 ? "-" : "";
  const abs = Math.abs(numeric);
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}m`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function isSampleOnly(data) {
  return !(data.imports || []).some((item) => item.source !== "sample");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function replacementStep(item) {
  const text = `${item?.label || ""} ${item?.category || ""}`.toLowerCase();
  if (/shar|music|instrument|violin/.test(text)) return "Music repeat.";
  if (/chipotle|restaurant|food|coffee|cafe|dining|takeout|delivery/.test(text)) return "Food repeat.";
  if (/openai|chatgpt|subscription|software|app|internet|online/.test(text)) return "Subscription repeat.";
  if (/lyft|uber|taxi|rideshare|transport/.test(text)) return "Ride repeat.";
  if (/amazon|bestbuy|best buy|samsung|electronics|lululemon|clothing|apparel|shop|retail|merchandise/.test(text)) return "Retail repeat.";
  return "Repeat spend.";
}

function isRepeatableSpend(item) {
  const pattern = String(item?.pattern || "").toLowerCase();
  return Number(item?.recentCount || 0) > 0 || /subscription|recurring|repeated/.test(pattern);
}

function isPastSpend(item) {
  const pattern = String(item?.pattern || "").toLowerCase();
  return /past purchase|one-off/.test(pattern) && !isRepeatableSpend(item);
}

function displayMerchantLabel(label) {
  const raw = String(label || "spending").trim();
  const lower = raw.toLowerCase();
  const titled = lower.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  return titled
    .replace(/\bOpenai\b/g, "OpenAI")
    .replace(/\bCvs\b/g, "CVS")
    .replace(/\bAtm\b/g, "ATM");
}

function displaySafeText(value) {
  return String(value ?? "")
    .replace(/Connect Chase/gi, "Live bank data")
    .replace(/Chase not connected/gi, "Bank data unavailable")
    .replace(/live Chase data/gi, "live bank data")
    .replace(/\bChase\b/g, "bank");
}

function primaryCutItem(spending) {
  return spending.find(isRepeatableSpend) || spending[0] || null;
}

function primaryCutTitle(item) {
  const label = displayMerchantLabel(item?.label);
  if (isPastSpend(item)) return `${label}: resolved`;
  return label;
}

function primaryCutReason(item) {
  const issue = item?.issue || `${money.format(item?.amount || 0)} / ${item?.window || "90 days"}`;
  const impact = item?.impactLabel || `+${money.format(item?.monthlyImpact || 0)}/mo if reduced`;
  return `${issue}. ${impact}.`;
}

function parseMoneyInput(value) {
  const cleaned = String(value || "").replace(/[^0-9.-]/g, "");
  const number = Number(cleaned);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function defaultDownPaymentSimAmount(data) {
  const saved = parseMoneyInput(localStorage.getItem(downPaymentSimStorageKey));
  if (saved > 0) return saved;
  return 10000;
}

function wholePurchaseProgressText(goal, cash, a3Price) {
  const price = Math.max(1, Number(a3Price || goal?.a3?.priceAsBuilt || 46690));
  const progress = clamp(Number(cash || 0) / price, 0, 1);
  return `${Math.round(progress * 100)}% of whole price in cash`;
}

function monthlyForecastPace(analysis) {
  const last6 = Number(analysis?.monthlyNet?.last6Average || 0);
  const current = Number(analysis?.monthlyNet?.current?.net || 0);
  const net30 = Number(analysis?.totals?.net30 || 0);
  return Math.max(0, last6 > 0 ? last6 : current > 0 ? current : net30 > 0 ? net30 : 0);
}

function renderAffordabilityForecast(data, sampleOnly, downPayment, cashAfter, carAfter) {
  if (!els.affordabilityVerdict) return;
  const analysis = data?.analysis || {};
  const accounts = analysis.accounts || {};
  const settings = analysis.settings || {};
  const connected = Boolean(accounts.connected) && !sampleOnly;
  const cash = Number(accounts.cash || 0);
  const balance = Number(accounts.debtTotal || 0);
  const cashFloor = Math.max(0, Number(settings.cashFloor || 0));
  const pace = monthlyForecastPace(analysis);

  if (!connected) {
    els.affordabilityHealth.dataset.severity = "watch";
    els.affordabilityVerdict.textContent = "No forecast.";
    els.affordabilityWhen.textContent = "Live balances and monthly net are required.";
    els.affordabilityPace.textContent = "--/mo pace";
    els.affordabilityAssumption.textContent = `${money.format(downPayment)} down / ${money.format(cashFloor)} kept`;
    return;
  }

  const safeCashNeeded = downPayment + balance + cashFloor;
  const cashGap = Math.max(0, safeCashNeeded - cash);
  const months = pace > 0 ? Math.ceil(cashGap / pace) : null;
  const drainsCash = downPayment >= cash || cashAfter <= cashFloor;
  let severity = "watch";
  let verdict = "Not yet.";
  let when = "Payment, insurance, tax, fees, and loan terms still decide.";

  if (downPayment <= 0) {
    verdict = "Enter a down payment.";
    when = "Use an amount that still keeps the cash buffer.";
  } else if (downPayment > cash) {
    severity = "danger";
    verdict = "No. The down payment exceeds cash.";
    when = pace > 0
      ? `Around ${forecastMonthLabel(months)} for ${money.format(downPayment)} down after balance and buffer.`
      : "No date: monthly pace is not positive.";
  } else if (drainsCash && balance > 0) {
    severity = "danger";
    verdict = "No. Draining cash while balance remains is not smart.";
    when = pace > 0
      ? `Around ${forecastMonthLabel(months)} after balance and ${money.format(cashFloor)} buffer.`
      : "No date: monthly pace is not positive.";
  } else if (drainsCash) {
    severity = "danger";
    verdict = "No. Do not spend the whole bank account.";
    when = pace > 0
      ? `Around ${forecastMonthLabel(months)} if the cash buffer survives.`
      : "No date: monthly pace is not positive.";
  } else if (balance > 0) {
    severity = "danger";
    verdict = "No. Pay the existing balance first.";
    when = pace > 0
      ? `Around ${forecastMonthLabel(months)} for balance + down payment + buffer.`
      : "No date: monthly pace is not positive.";
  } else if (pace <= 0) {
    severity = "danger";
    verdict = "No. Monthly pace is not positive.";
    when = "No reliable afford-by date.";
  } else if (cashGap > 0) {
    verdict = "Not yet.";
    when = `Around ${forecastMonthLabel(months)} for balance + down payment + buffer.`;
  } else {
    verdict = "Maybe. Buffer survives.";
    when = "Still needs payment, insurance, tax, fees, and loan terms.";
  }

  els.affordabilityHealth.dataset.severity = severity;
  els.affordabilityVerdict.textContent = verdict;
  els.affordabilityWhen.textContent = when;
  els.affordabilityPace.textContent = pace > 0 ? `${money.format(pace)}/mo recent net pace` : "No positive $/mo pace";
  els.affordabilityAssumption.textContent = `${money.format(downPayment)} down / ${money.format(cashFloor)} kept / ${money.format(carAfter)} financed before tax and fees`;
}

function renderPurchaseSimulation(data, sampleOnly) {
  if (!els.simDownPaymentInput) return;
  const analysis = data?.analysis || {};
  const accounts = analysis.accounts || {};
  const goal = analysis.goal || {};
  const settings = analysis.settings || {};
  const connected = Boolean(accounts.connected) && !sampleOnly;
  const cash = Number(accounts.cash || 0);
  const balance = Number(accounts.debtTotal || 0);
  const cashFloor = Number(settings.cashFloor || 0);
  const a3Price = Math.max(0, Number(data?.goal?.priceAsBuilt || goal.a3?.priceAsBuilt || 46690));

  if (!els.simDownPaymentInput.value.trim()) {
    els.simDownPaymentInput.value = money.format(defaultDownPaymentSimAmount(data));
  }

  const downPayment = parseMoneyInput(els.simDownPaymentInput.value);
  const missingCash = connected ? Math.max(0, downPayment - cash) : 0;
  const cashAfter = connected ? cash - downPayment : 0;
  const carAfter = Math.max(0, a3Price - downPayment);
  renderAffordabilityForecast(data, sampleOnly, downPayment, cashAfter, carAfter);

  if (!connected) {
    els.simStatus.textContent = "Needs live data.";
    els.simCashAfter.textContent = "No live cash.";
    els.simDebtAfter.textContent = "No live balance.";
    els.simCarAfter.textContent = `${money.format(a3Price)} before tax, fees, insurance, and interest.`;
    els.simHealth.textContent = "No live read.";
    els.simHealthRow.dataset.severity = "watch";
    return;
  }

  els.simStatus.textContent = `${money.format(downPayment)} tested.`;
  els.simCashAfter.textContent = missingCash > 0
    ? `${money.format(0)} cash / ${money.format(missingCash)} short`
    : `${money.format(cashAfter)} cash left`;
  els.simDebtAfter.textContent = `${money.format(balance)} unchanged`;
  els.simCarAfter.textContent = `${money.format(carAfter)} before tax, fees, insurance, and interest`;

  if (downPayment <= 0) {
    els.simHealth.textContent = "No amount tested.";
    els.simHealthRow.dataset.severity = "watch";
  } else if (missingCash > 0) {
    els.simHealth.textContent = `No: ${money.format(missingCash)} cash short; ${money.format(balance)} balance remains.`;
    els.simHealthRow.dataset.severity = "danger";
  } else if (balance > 0 && cashAfter <= cashFloor) {
    els.simHealth.textContent = `No: ${money.format(cashAfter)} cash left; ${money.format(balance)} balance remains.`;
    els.simHealthRow.dataset.severity = "danger";
  } else if (balance > 0) {
    els.simHealth.textContent = `No: ${money.format(balance)} balance remains.`;
    els.simHealthRow.dataset.severity = "danger";
  } else if (cashAfter <= cashFloor) {
    els.simHealth.textContent = `No: ${money.format(cashAfter)} cash left.`;
    els.simHealthRow.dataset.severity = "danger";
  } else if (cashAfter <= cashFloor + 1000) {
    els.simHealth.textContent = `Maybe not: ${money.format(cashAfter)} cash left.`;
    els.simHealthRow.dataset.severity = "watch";
  } else {
    els.simHealth.textContent = `Maybe: ${money.format(cashAfter)} cash left before loan costs.`;
    els.simHealthRow.dataset.severity = "watch";
  }
}

function renderBlockers(analysis, sampleOnly) {
  const accounts = analysis?.accounts || {};
  const settings = analysis?.settings || {};
  const goal = analysis?.goal || {};
  const cash = Number(accounts.cash || 0);
  const a3Price = Math.max(0, Number(goal.a3?.priceAsBuilt || 46690));
  const spending = Array.isArray(analysis?.improvements?.spending) ? analysis.improvements.spending : [];
  const biggestRepeat = spending.find((item) => item?.category !== "Past purchase") || spending[0];

  function setRows(rows) {
    els.blockerList.innerHTML = rows.map((row) => `
      <div class="blocker-row">
        <strong>${escapeHtml(row.label)}</strong>
        <span>${escapeHtml(row.detail)}</span>
      </div>
    `).join("");
  }

  if (sampleOnly || !accounts.connected) {
    els.blockerTitle.textContent = "Do not buy yet.";
    els.blockerSummary.textContent = "Live balances are required first.";
    setRows([
      { label: "Live balances", detail: "Current cash, balance, and payment decide." },
      { label: "Whole purchase", detail: `${money.format(a3Price)} before tax, fees, insurance, and interest.` }
    ]);
    return;
  }

  if (Number(accounts.debtTotal || 0) > 0) {
    els.blockerTitle.textContent = "Do not buy yet.";
    els.blockerSummary.textContent = "Current balances block the purchase.";
  } else {
    els.blockerTitle.textContent = "Full-cost check.";
    els.blockerSummary.textContent = "Cash is only one input; payment, insurance, debt, and cashflow still decide.";
  }

  const rows = [];
  if (Number(accounts.debtTotal || 0) > 0) {
    rows.push({
      label: "Card/loan balance",
      detail: `${money.format(accounts.debtTotal)} has to come down first.`
    });
  }
  rows.push({
    label: "Cash today",
    detail: `${money.format(cash)} current cash. Cash does not change the balance blocker.`
  });
  if (biggestRepeat?.label) {
    rows.push({
      label: "Repeat spending",
      detail: `${biggestRepeat.label} is the biggest repeat pattern: ${biggestRepeat.issue || biggestRepeat.impactLabel || biggestRepeat.next || "review before another purchase"}.`
    });
  }
  rows.push({
    label: "Whole purchase",
    detail: `${money.format(a3Price)} A3 as built. Payment, insurance, debt, and cashflow decide.`
  });

  setRows(rows);
}

function renderGoalMeter(goal, sampleOnly, data) {
  const cash = Math.max(0, Number(data?.analysis?.accounts?.cash ?? 0));
  const a3Price = Math.max(0, Number(data?.goal?.priceAsBuilt || goal.a3?.priceAsBuilt || 46690));
  const progress = !sampleOnly && a3Price > 0 ? clamp(cash / a3Price, 0, 1) : 0;
  els.goalMeterFill.style.width = `${Math.round(progress * 100)}%`;
  els.goalSaved.textContent = sampleOnly ? "Bank link pending" : money.format(cash);
  els.heroCashMeta.textContent = sampleOnly ? "no live cash" : "current cash";
  els.heroA3Price.textContent = money.format(a3Price);
  els.heroA5Price.textContent = "$60,590";
  els.goalTarget.textContent = `${money.format(a3Price)} whole purchase`;

  if (sampleOnly) {
    els.goalPace.textContent = data.plaid?.productionReviewPending
      ? "Bank approval is the next step."
      : data.plaid?.configured
        ? "Bank link required."
        : "Bank link setup needed.";
    return;
  }

  els.goalPace.textContent = wholePurchaseProgressText(goal, cash, a3Price);
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
    els.connectBankPrimary.textContent = needsRelink ? "relink bank" : "connect bank";
    els.connectBankPrimary.hidden = plaid.connected && !needsRelink;
  }
  els.syncBank.hidden = !plaid.connected;
  const title = plaid.productionReviewPending
    ? "Bank review pending"
    : plaid.connected && !needsRelink
      ? "Bank linked"
      : plaid.configured
      ? "Connect bank"
      : "Bank link setup needed";
  connectButtons().forEach((button) => { button.title = title; });
}

function compactAdvisor(latestRun, analysis) {
  const accounts = analysis.accounts || {};
  const connected = Boolean(accounts.connected);
  const creditLoanBalance = Number(accounts.debtTotal || 0);
  const cash = Number(accounts.cash || 0);
  const advice = latestRun?.advice || {};

  if (connected && creditLoanBalance > 0) {
    const payment = paymentStatus(analysis);
    const action = payment.status === "posted" || payment.status === "posted_partial"
      ? "Payment visible."
      : payment.status === "pending"
        ? `${moneyExact.format(payment.amount)} is pending.`
        : "A3 has not seen the payment yet.";
    const summary = payment.amount > 0
      ? `${moneyExact.format(payment.amount)} payment ${payment.status === "pending" ? "is pending" : "is posted"}.`
      : `Hold cash today. ${money.format(cash)} cash right now.`;
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
    detail: payment.pending ? "Payment pending." : "Payment posted."
  };
}

function financialMoves(analysis) {
  const accounts = analysis.accounts || {};
  const goal = analysis.goal || {};
  const cash = Number(accounts.cash || 0);
  const creditLoanBalance = Number(accounts.debtTotal || 0);
  const payment = paymentStatus(analysis);
  const moves = [];

  if (!accounts.connected) {
    moves.push({
      label: "Live balances",
      detail: "Use current balances."
    });
  }
  if (accounts.connected && creditLoanBalance > 0 && payment.status !== "not_visible") {
    moves.push({
      label: payment.status === "pending" ? "A3 is watching" : "Already checked",
      detail: `${moneyExact.format(payment.amount)} ${payment.status === "pending" ? "pending" : "posted"}.`
    });
    moves.push({
      label: "Do not count car cash",
      detail: payment.status === "pending" ? "Wait for posted status." : "Current balance still blocks the purchase."
    });
  } else if (accounts.connected) {
    moves.push({
      label: "A3 is checking",
      detail: "Payment visibility will be checked again."
    });
  }
  if (creditLoanBalance > 0) {
    moves.push({
      label: "Cash is context",
      detail: `${money.format(cash)} current cash right now`
    });
  }
  const fallbackMoves = [
    { label: "Keep cash steady", detail: "Do not guess with old numbers." },
    { label: "Full purchase", detail: "Wait for current bank data." },
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
        label: `Slow ${match[1].trim()}`,
        detail: match[2].trim(),
        severity: biggestLeak.severity || "watch"
      };
    }
    return { label: "Slow biggest leak", detail, severity: biggestLeak.severity || "watch" };
  }

  const mistake = findImprovement(items, "Mistake to avoid");
  if (mistake) return { label: "Do not count car cash", detail: itemDetail(mistake), severity: "danger" };

  const first = items[0];
  if (first) return { label: actionLabel(first), detail: itemDetail(first), severity: first.severity || "watch" };

  return {
    label: accounts.connected ? "Hold cash steady" : "Live balances",
    detail: accounts.connected ? "A3 is waiting for current spending patterns." : "Current bank data is needed before the car decision.",
    severity: "watch"
  };
}

function actionLabel(item) {
  switch (item?.label) {
    case "Mistake to avoid":
      return "Do not count car cash";
    case "Cash floor":
    case "Cash today":
    case "Down payment today":
      return "Keep cash steady";
    case "Biggest leak":
      return "Slow biggest leak";
    case "Food leak":
      return "Replace takeout";
    case "7-day rule":
    case "Card spend":
      return "Pause card spending";
    case "Payment posted":
      return "Already posted";
    case "Payment pending":
      return "Still pending";
    case "Missing":
      return "Live balances";
    default:
      return item?.label || "";
  }
}

function orderedImprovements(items, primary) {
  const labels = ["Mistake to avoid", "Card spend", "Food leak", "Cash today", "Down payment today", "Whole purchase", "Cash floor", "Payment posted", "Payment pending", "Missing", "Floor"];
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
    els.cutTitle.textContent = accounts.connected ? "No item" : "No live item";
    els.cutReason.textContent = accounts.connected ? "No current repeat item." : "Current transactions are needed.";
    els.cutSteps.innerHTML = "";
    return;
  }

  els.cutTitle.textContent = primaryCutTitle(first);
  els.cutReason.textContent = primaryCutReason(first);
  els.cutSteps.innerHTML = "";
}

function renderDailyScan(improvements, accounts) {
  const scan = improvements?.dailyScan || {};
  const rows = Array.isArray(scan.rows) ? scan.rows : [];
  els.dailyScanWindow.textContent = accounts.connected
    ? `${money.format(scan.total || 0)} / ${scan.window || "latest 7 days"}`
    : "Purchases only";

  if (!rows.length) {
    els.dailyScanList.innerHTML = `<div class="daily-scan-row" data-severity="good">
      <time>${accounts.connected ? "Quiet" : "Waiting"}</time>
      <div>
        <strong>${accounts.connected ? "No flexible purchases found" : "No live data"}</strong>
        <span>${accounts.connected ? "Payments, transfers, and debt payments are excluded." : "Payments and transfers are excluded."}</span>
      </div>
    </div>`;
    return;
  }

  els.dailyScanList.innerHTML = rows.map((row) => {
    const merchants = Array.isArray(row.merchants) && row.merchants.length
      ? row.merchants.join(" / ")
      : row.topMerchant || "Purchases";
    return `<div class="daily-scan-row" data-severity="${escapeHtml(row.severity || "watch")}">
      <time>${escapeHtml(dateLabel(row.date))}</time>
      <div>
        <strong>${escapeHtml(money.format(row.total || 0))}</strong>
        <span>${escapeHtml(`${row.count || 0} purchase${row.count === 1 ? "" : "s"}: ${merchants}`)}</span>
      </div>
    </div>`;
  }).join("");
}

function renderSpendLeaks(improvements, accounts, locks = []) {
  const spending = Array.isArray(improvements.spending) ? improvements.spending : [];
  const visibleSpending = spending.slice(0, 3);
  els.spendWindow.textContent = accounts.connected
    ? (visibleSpending.length ? `Top ${visibleSpending.length} repeat item${visibleSpending.length === 1 ? "" : "s"}` : "No repeat items")
    : "Waiting for bank data";

  if (!visibleSpending.length) {
    els.spendLeakList.innerHTML = `<div class="spend-leak-row">
      <span class="spend-rank">--</span>
      <div>
        <strong>${accounts.connected ? "No item" : "No live item"}</strong>
        <span>${accounts.connected ? "No current repeat item." : "Bank data is needed."}</span>
      </div>
    </div>`;
    return;
  }

  function renderReceiptBreakdown(item) {
    const breakdown = item.receiptBreakdown || {};
    const categories = Array.isArray(breakdown.categories) ? breakdown.categories : [];
    if (!categories.length) return "";
    return `
      <details class="receipt-breakdown">
        <summary>${escapeHtml(breakdown.title || `${item.label}: what it is`)}</summary>
        <div class="receipt-breakdown-head">
          <span>${escapeHtml(breakdown.source || "")}</span>
        </div>
        <p>${escapeHtml(breakdown.rule || "")}</p>
        <div class="receipt-category-list">
          ${categories.map((category) => `
            <div class="receipt-category-row">
              <div>
                <strong>${escapeHtml(category.label || "")}</strong>
                <span>${escapeHtml(category.detail || "")}</span>
              </div>
              <p>${escapeHtml(category.action || "")}</p>
            </div>
          `).join("")}
        </div>
      </details>
    `;
  }

  function renderSpendRow(item, options = {}) {
    const rank = String(item.priorityRank || "").padStart(2, "0");
    const pattern = item.pattern ? `${item.pattern} - ` : "";
    return `
      <div class="spend-leak-row${options.compact ? " is-compact" : ""}" data-severity="${escapeHtml(item.severity || "watch")}">
        <span class="spend-rank">${escapeHtml(rank)}</span>
        <div>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(`${pattern}${item.issue || `${money.format(item.amount || 0)} / ${item.window || "90 days"}`}`)}</span>
          <em>${escapeHtml(item.impactLabel || `+${money.format(item.monthlyImpact || 0)}/mo if reduced`)}</em>
        </div>
      </div>
    `;
  }

  els.spendLeakList.innerHTML = visibleSpending.map((item) => renderSpendRow(item)).join("");
}

function renderReview(data) {
  const review = data.analysis?.review || {};
  const accounts = data.analysis?.accounts || {};
  const goal = data.analysis?.goal || {};
  const autoUpdate = data.autoUpdate || {};
  const enabled = Boolean(autoUpdate.enabled);
  const lastSync = autoUpdate.lastSyncAt ? `last ${dateTimeLabel(autoUpdate.lastSyncAt)}` : "waiting for sync";
  els.autoUpdateState.textContent = enabled
    ? `Syncs every ${autoUpdate.intervalLabel || "15 min"} / ${lastSync}`
    : "Auto update off";
  if (!accounts.connected) {
    els.reviewVerdict.textContent = "No live data.";
    els.reviewSummary.textContent = "No live financial read.";
  } else if (Number(accounts.debtTotal || 0) > 0) {
    const last6 = Number(data.analysis?.monthlyNet?.last6Average || 0);
    els.reviewVerdict.textContent = "Not safe.";
    els.reviewSummary.textContent = `${money.format(accounts.cash || 0)} cash / ${money.format(accounts.debtTotal || 0)} balance / ${money.format(last6)} 6-mo avg.`;
  } else {
    els.reviewVerdict.textContent = shortText(review.verdict || "Full-cost check.", 96);
    els.reviewSummary.textContent = shortText(review.summary || "Payment, insurance, tax, fees, and cashflow still decide.", 120);
  }

  function renderBullets(container, items, fallback) {
    if (!container) return;
    const rows = Array.isArray(items) && items.length ? items : [fallback];
    container.innerHTML = rows.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  renderBullets(els.reviewGood, review.good, "Live bank connection required.");
  renderBullets(els.reviewBad, review.bad, "No current spending picture yet.");
  renderBullets(els.reviewMust, review.must, "Live balances are required before the car decision.");
}

function renderMonthlyNet(data) {
  const history = data.analysis?.weeklyNet || {};
  const weeks = Array.isArray(history.weeks) ? history.weeks : [];
  const visible = weeks.slice(-104);
  const current = history.current || visible[visible.length - 1] || null;

  if (!visible.length || !current) {
    els.netWindow.textContent = "Waiting for transactions";
    els.netCurrent.textContent = "--";
    els.netChart.innerHTML = "";
    els.netAverage.textContent = "No weekly net history yet.";
    els.netRange.textContent = "Live bank data required.";
    return;
  }

  const currentLabel = `${weekLabel(current.week)} so far`;
  const weekWord = visible.length === 1 ? "week" : "weeks";
  els.netWindow.textContent = currentLabel;
  els.netCurrent.textContent = money.format(current.net);
  els.netCurrent.dataset.net = current.net >= 0 ? "positive" : "negative";
  els.netAverage.textContent = `${money.format(current.inflow || 0)} in - ${money.format(current.spend || 0)} out`;
  els.netRange.textContent = `12-wk avg ${money.format(history.last12Average || 0)} / ${visible.length} ${weekWord}`;

  const width = 720;
  const height = 260;
  const plotLeft = 64;
  const plotRight = width - 24;
  const plotTop = 22;
  const plotBottom = height - 44;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;
  const nets = visible.map((item) => Number(item.net || 0));
  const maxAbs = Math.max(1, ...nets.map((value) => Math.abs(value))) * 1.08;
  const yFor = (value) => plotTop + ((maxAbs - value) / (maxAbs * 2)) * plotH;
  const zeroY = yFor(0);
  const step = visible.length > 1 ? plotW / (visible.length - 1) : 0;
  const xFor = (index) => plotLeft + (index * step);
  const lineD = visible.map((item, index) => {
    const value = Number(item.net || 0);
    const command = index === 0 ? "M" : "L";
    return `${command}${xFor(index).toFixed(2)},${yFor(value).toFixed(2)}`;
  }).join(" ");

  const points = visible.map((item, index) => {
    const value = Number(item.net || 0);
    const currentClass = item.week === current.week ? " is-current" : "";
    const signClass = value >= 0 ? "positive" : "negative";
    return `<circle class="net-point ${signClass}${currentClass}" cx="${xFor(index).toFixed(2)}" cy="${yFor(value).toFixed(2)}" r="${currentClass ? 4.5 : 2.15}">
      <title>${escapeHtml(weekLabel(item.week))}: ${escapeHtml(money.format(value))} net</title>
    </circle>`;
  }).join("");

  const gridValues = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs];
  const grid = gridValues.map((value) => {
    const y = yFor(value);
    const zeroClass = Math.abs(value) < 1 ? " is-zero" : "";
    return `<g class="net-grid${zeroClass}">
      <line x1="${plotLeft}" x2="${plotRight}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}"></line>
      <text x="${plotLeft - 12}" y="${(y + 4).toFixed(2)}">${escapeHtml(moneyShort(value))}</text>
    </g>`;
  }).join(" ");

  const years = [];
  for (let index = 0; index < visible.length; index += 1) {
    const year = Number(visible[index].year || String(visible[index].week || "").slice(0, 4));
    if (!Number.isFinite(year)) continue;
    if (!years.some((item) => item.year === year)) years.push({ year, index });
  }
  const xLabels = years.map((item, labelIndex) => {
    const anchor = item.index === visible.length - 1 ? " end" : "";
    const x = xFor(item.index);
    return `<text class="net-axis-label${anchor}" x="${x.toFixed(2)}" y="${height - 12}">${escapeHtml(String(item.year))}</text>`;
  }).join("");

  const foundCurrent = visible.findIndex((item) => item.week === current.week);
  const currentIndex = foundCurrent >= 0 ? foundCurrent : visible.length - 1;
  const currentX = xFor(currentIndex);
  const currentY = yFor(Number(current.net || 0));
  const currentLabelX = currentX > width - 120 ? currentX - 8 : currentX + 8;
  const currentAnchor = currentX > width - 120 ? " end" : "";

  els.netChart.innerHTML = `
    ${grid}
    <path class="net-line" d="${lineD}"></path>
    ${points}
    <line class="net-current-rule" x1="${currentX.toFixed(2)}" x2="${currentX.toFixed(2)}" y1="${plotTop}" y2="${plotBottom}"></line>
    <circle class="net-current-dot" cx="${currentX.toFixed(2)}" cy="${currentY.toFixed(2)}" r="5"></circle>
    <text class="net-current-label${currentAnchor}" x="${currentLabelX.toFixed(2)}" y="${Math.max(plotTop + 14, currentY - 10).toFixed(2)}">${escapeHtml(moneyShort(current.net))}</text>
    ${xLabels}
  `;
}

function renderImprovements(analysis, locks = []) {
  const improvements = analysis.improvements || {};
  const accounts = analysis.accounts || {};
  const goal = analysis.goal || {};
  const items = Array.isArray(improvements.items) ? improvements.items : [];
  const fallback = accounts.connected
    ? [
        {
          label: "Mistake to avoid",
          detail: accounts.debtTotal > 0
            ? `Do not treat cash as car money while ${money.format(accounts.debtTotal)} card/loan balance remains.`
            : "Keep cash steady before the full purchase check.",
          severity: accounts.debtTotal > 0 ? "danger" : "watch"
        },
        {
          label: "Whole purchase",
          detail: `${money.format(goal.fullPurchaseGap || 0)} below the car price before tax, fees, insurance, and interest.`,
          severity: "watch"
        }
      ]
    : [
        { label: "Missing", detail: "Live balances are needed before the car decision.", severity: "watch" },
        { label: "Whole purchase", detail: "Wait for real account data before testing a down payment.", severity: "watch" }
      ];
  const rows = (items.length ? items : fallback).slice(0, 6);
  const primary = primaryFix(rows, accounts);
  const ordered = orderedImprovements(rows, primary);
  els.primaryFixLabel.textContent = displaySafeText(primary.label);
  els.primaryFixDetail.textContent = displaySafeText(primary.detail);
  els.improvementState.textContent = displaySafeText(improvements.state || (accounts.connected ? "Live bank data." : "Bank data unavailable."));
  els.improvementList.innerHTML = ordered.map((item, index) => `
    <div class="improvement-row" data-severity="${escapeHtml(item.severity || "watch")}" data-step="${String(index + 1).padStart(2, "0")}">
      <strong>${escapeHtml(displaySafeText(actionLabel(item)))}</strong>
      <span>${escapeHtml(displaySafeText(itemDetail(item)))}</span>
    </div>
  `).join("");
  renderCutAssist(improvements, accounts, locks);
  renderDailyScan(improvements, accounts);
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
  renderBlockers(analysis, sampleOnly);
  renderPurchaseSimulation(data, sampleOnly);

  if (sampleOnly) {
    const plaidReviewPending = Boolean(data.plaid?.productionReviewPending);
    els.storageState.textContent = plaidReviewPending ? "Bank review" : data.plaid?.configured ? "Bank off" : "Setup needed";
    els.stateLabel.textContent = plaidReviewPending ? "Bank review" : "No live data";
    els.stateReason.textContent = plaidReviewPending
      ? "Bank link pending."
      : "Financial data unavailable.";
    els.gapValue.textContent = "No bank data";
    els.gapLabel.textContent = "Balances unavailable.";
    els.actionLabel.textContent = plaidReviewPending ? "Bank review pending" : data.plaid?.configured ? "Connect bank" : "Bank link setup needed";
    els.actionDetail.textContent = plaidReviewPending
      ? "Waiting for bank connection approval."
      : data.plaid?.configured
        ? "Use bank link."
        : "Bank API keys missing.";
    setText(els.advisorStatus, "Paused");
    setText(els.advisorAction, plaidReviewPending ? "Bank tracking pending." : "No live financial data.");
    setText(els.advisorSummary, "No sample numbers are used.");
    setText(els.advisorEffect, plaidReviewPending ? "Spending plan starts after bank link." : "");
    renderImprovements(analysis, data.spendingLocks || []);
    renderReview(data);
    renderMonthlyNet(data);
    renderRows(els.watchList, [{ label: "Bank off", detail: "No connected bank data." }], (item) => [item.label, item.detail]);
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
  if (accounts.debtTotal > 0) {
    els.stateLabel.textContent = "Not ready yet";
    els.stateReason.textContent = `${money.format(accounts.debtTotal)} card/loan balance has to come down first.`;
  } else {
    els.stateLabel.textContent = "Full-cost check";
    els.stateReason.textContent = "Payment, insurance, and cashflow still decide.";
  }
  els.gapValue.textContent = accounts.debtTotal > 0 ? money.format(accounts.debtTotal) : money.format(goal.fullPurchaseGap || 0);
  els.gapLabel.textContent = accounts.connected
    ? `${money.format(accounts.cash || 0)} cash / ${dateTimeLabel(accounts.lastUpdatedAt)}`
    : `${money.format(data.goal.priceAsBuilt)} whole purchase needs live cash data`;
  const advisorDisplay = compactAdvisor(latestRun, analysis);
  els.actionLabel.textContent = accounts.debtTotal > 0 ? advisorDisplay.status : latestRun?.advice?.one_action || analysis.action.label;
  els.actionDetail.textContent = accounts.debtTotal > 0 ? advisorDisplay.summary : latestRun?.advice?.why || analysis.action.detail;
  setText(els.advisorStatus, advisorDisplay.status);
  setText(els.advisorAction, advisorDisplay.action);
  setText(els.advisorSummary, advisorDisplay.summary);
  setText(els.advisorEffect, advisorDisplay.effect);
  renderImprovements(analysis, data.spendingLocks || []);
  renderReview(data);
  renderMonthlyNet(data);

  renderRows(els.watchList, analysis.watch, (item) => [item.label, item.detail]);
  renderBankAccounts(accounts.items || []);
  renderRows(els.eventList, data.events.slice(0, 8), (item) => [item.label, `${item.type} / ${new Date(item.createdAt).toLocaleString()}`]);
  renderTransactions(analysis.transactions);
}

function renderRows(container, items, mapper) {
  container.innerHTML = items.length ? items.map((item) => {
    const [label, detail] = mapper(item);
    return `<div class="row">
      <strong>${escapeHtml(displaySafeText(label))}</strong>
      <span>${escapeHtml(displaySafeText(detail))}</span>
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
      els.actionLabel.textContent = "Bank review pending";
      els.actionDetail.textContent = "Waiting for bank connection approval.";
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

if (els.simDownPaymentInput) {
  els.simDownPaymentInput.addEventListener("input", () => {
    localStorage.setItem(downPaymentSimStorageKey, String(parseMoneyInput(els.simDownPaymentInput.value)));
    if (lastState) renderPurchaseSimulation(lastState, isSampleOnly(lastState));
  });
}

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
