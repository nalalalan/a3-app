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
  dailyScanWindow: document.getElementById("dailyScanWindow"),
  dailyScanList: document.getElementById("dailyScanList"),
  netWindow: document.getElementById("netWindow"),
  netCurrent: document.getElementById("netCurrent"),
  netModeButtons: Array.from(document.querySelectorAll("[data-net-mode]")),
  netChart: document.getElementById("netChart"),
  netAverage: document.getElementById("netAverage"),
  netRange: document.getElementById("netRange"),
  projectionWindow: document.getElementById("projectionWindow"),
  projectionCurrent: document.getElementById("projectionCurrent"),
  projectionModeButtons: Array.from(document.querySelectorAll("[data-projection-mode]")),
  projectionChart: document.getElementById("projectionChart"),
  projectionBasis: document.getElementById("projectionBasis"),
  projectionRange: document.getElementById("projectionRange"),
  projectionCarToggle: document.getElementById("projectionCarToggle"),
  projectionJobToggle: document.getElementById("projectionJobToggle"),
  projectionJobDelta: document.getElementById("projectionJobDelta"),
  projectionCarDelta: document.getElementById("projectionCarDelta"),
  projectionJobStart: document.getElementById("projectionJobStart"),
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

let activeNetMode = localStorage.getItem("a3NetMode") || "week";
let activeProjectionMode = localStorage.getItem("a3ProjectionMode") || "week";
let projectionBuyCar = localStorage.getItem("a3ProjectionBuyCar") !== "false";
let projectionJob = localStorage.getItem("a3ProjectionJob") !== "false";

const projectionConfig = {
  a3Price: 31500,
  apr: 7,
  months: 60,
  monthlyInsurance: 260,
  jobBase: 130000,
  jobTakeHomeRate: 0.72,
  jobStartDate: "2027-05-01"
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

const dayNameWithYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC"
});

const debtRows = [
  { amount: 5000 },
  { amount: 10000 },
  { amount: 25000 },
  { amount: 50000 },
  { amount: 100000 }
];

const sources = [
  {
    title: "BLS Mechanical Engineers",
    url: "https://www.bls.gov/ooh/architecture-and-engineering/mechanical-engineers.htm",
    why: "Official salary baseline: $102,320 median mechanical engineer pay and $123,080 median in scientific R&D services."
  },
  {
    title: "O*NET Robotics Engineers",
    url: "https://www.onetonline.org/link/summary/17-2199.08",
    why: "Robotics engineer benchmark: $117,750 annual median for the closest robotics-specific occupation page."
  },
  {
    title: "BLS Software Developers",
    url: "https://www.bls.gov/ooh/computer-and-information-technology/software-developers.htm",
    why: "Software/tools upside benchmark: $133,080 median software developer pay and 16% projected developer growth."
  },
  {
    title: "Disney Careers",
    url: "https://jobs.disneycareers.com/",
    why: "Company path source for Imagineering roles, ride/show systems, creative technology, and technical R&D openings."
  },
  {
    title: "Toyota Research Institute Careers",
    url: "https://www.tri.global/careers",
    why: "Company path source for serious robotics R&D, simulation, robot behavior, and applied research roles."
  },
  {
    title: "Intuitive Surgical Careers",
    url: "https://careers.intuitive.com/en/jobs/",
    why: "Company path source for surgical robotics, mechanism design, precise hardware, and product-grade robotics roles."
  },
  {
    title: "Ryan & Deci 2000 Self-Determination Theory",
    url: "https://doi.org/10.1037/0003-066X.55.1.68",
    why: "Supports the A3 pleasure map's control layer: private mobility and environmental control are real well-being variables."
  },
  {
    title: "Salimpoor et al. 2011 Music and Dopamine",
    url: "https://doi.org/10.1038/nn.2726",
    why: "Supports the music-in-car reward claim: music pleasure is tied to dopamine-related reward response."
  },
  {
    title: "Blood & Zatorre 2001 Music Reward",
    url: "https://doi.org/10.1073/pnas.191355898",
    why: "Supports the private-drive-with-music tier: intensely pleasurable music activates reward-related brain regions."
  },
  {
    title: "Lubin & Feeley 2016 Autism Transportation Issues",
    url: "https://vtc.rutgers.edu/publication/transportation-issues-of-adults-on-the-autism-spectrum-findings-from-focus-group-discussions/",
    why: "Supports the independence layer: transportation access affects autistic adults' participation and community access."
  },
  {
    title: "Blumenberg & Pierce 2017 Auto Access and Employment",
    url: "https://doi.org/10.1177/0739456X16633501",
    why: "Supports the career-radius claim: car access can change reachable jobs, events, and work opportunities."
  },
  {
    title: "CFPB Debt-to-Income Ratio",
    url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/",
    why: "Debt table basis: monthly debt payments are best read as claims against income."
  },
  {
    title: "New York Fed Household Debt and Credit",
    url: "https://www.newyorkfed.org/microeconomics/hhdc",
    why: "Debt context source for household credit balances, auto loans, and broader credit conditions."
  },
  {
    title: "Richardson, Elliott & Roberts 2013 Debt and Health Review",
    url: "https://doi.org/10.1016/j.cpr.2012.12.002",
    why: "Debt pressure source: unsecured debt is associated with mental and physical health outcomes in the review literature."
  },
  {
    title: "Audi A3 Build PDF",
    url: "/a3-awg0xsw9.pdf",
    why: "Local source for the A3 code, build reference, and car image/spec basis used on this page."
  }
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
    .replace(/Alan decides/gi, "")
    .replace(/Permission/gi, "Telemetry")
    .replace(/Wanting it is okay/gi, "Current desire")
    .replace(/Wanting the car is allowed/gi, "Current desire")
    .replace(/Buying can be okay/gi, "Purchase scenario")
    .replace(/Thoughtful, not trapped/gi, "Current telemetry")
    .replace(/Facts only\. Calm telemetry\./gi, "Current telemetry.")
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

function dateLabelWithYear(date) {
  if (!date) return "pending";
  return dayNameWithYear.format(new Date(`${date}T00:00:00Z`));
}

function moneyShort(value) {
  const numeric = Number(value || 0);
  const sign = numeric < 0 ? "-" : "";
  const abs = Math.abs(numeric);
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1)}m`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function moneySigned(value) {
  const numeric = Number(value || 0);
  return `${numeric > 0 ? "+" : ""}${money.format(numeric)}`;
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysKey(baseDate, days) {
  const date = new Date(`${baseDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayDiff(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86400000);
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
      detail: "Data source pending."
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
      <article class="debt-row">
        <strong>${escapeHtml(money.format(row.amount))}</strong>
        <div>
          <span>7% APR / 60mo</span>
          <b>${escapeHtml(money.format(low.payment))}/mo</b>
          <em>${escapeHtml(money.format(low.interest))} interest</em>
        </div>
        <div>
          <span>20% APR / 60mo</span>
          <b>${escapeHtml(money.format(high.payment))}/mo</b>
          <em>${escapeHtml(money.format(high.interest))} interest</em>
        </div>
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
  els.sourceList.innerHTML = sources.map((source) => `
    <a class="source-card" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">
      <p><strong>${escapeHtml(source.title)}</strong> <span>${escapeHtml(source.why)}</span></p>
      <em>${escapeHtml(source.url)}</em>
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
    els.recentPatterns.innerHTML = `<div class="mini-row"><strong>Pattern layer quiet</strong><span>${sampleOnly ? "Sample telemetry loaded." : "Telemetry pending."}</span></div>`;
    return;
  }

  els.recentPatterns.innerHTML = rows.map((item) => `
    <div class="mini-row">
      <strong>${escapeHtml(cleanVisibleText(item.label))}</strong>
      <span>${escapeHtml(cleanVisibleText(item.detail))}</span>
    </div>
  `).join("");
}

function renderDailyScan(data, accounts = {}) {
  if (!els.dailyScanList) return;
  const scan = data?.analysis?.improvements?.dailyScan || {};
  const rows = Array.isArray(scan.rows) ? scan.rows : [];
  const purchaseTotal = Number(scan.total || 0);
  const creditsTotal = Number(scan.creditsTotal || 0);
  const otherInflowTotal = Number(scan.otherInflowTotal || 0);
  const inflowTotal = Number(scan.inflowTotal || (creditsTotal + otherInflowTotal));
  const netOut = Number.isFinite(Number(scan.netOut))
    ? Number(scan.netOut || 0)
    : Math.max(0, purchaseTotal - inflowTotal);
  let scanWindow = `${money.format(purchaseTotal)} purchases / ${scan.window || "latest 7 days"}`;
  if (creditsTotal > 0 && otherInflowTotal > 0) {
    scanWindow = `${money.format(netOut)} net out / ${money.format(creditsTotal)} credits/returns / ${money.format(otherInflowTotal)} in`;
  } else if (creditsTotal > 0) {
    scanWindow = `${money.format(netOut)} net out / ${money.format(creditsTotal)} credits/returns`;
  } else if (otherInflowTotal > 0) {
    scanWindow = `${money.format(netOut)} net out / ${money.format(otherInflowTotal)} in`;
  }
  setText(els.dailyScanWindow, accounts.connected ? scanWindow : "Purchases only");

  if (!rows.length) {
    els.dailyScanList.innerHTML = `<div class="daily-scan-row" data-severity="quiet">
      <time>${accounts.connected ? "Quiet" : "Waiting"}</time>
      <div>
        <strong>${accounts.connected ? "Clear scan" : "Awaiting telemetry"}</strong>
        <span>Payments and transfers excluded.</span>
      </div>
    </div>`;
    return;
  }

  els.dailyScanList.innerHTML = rows.map((row) => {
    const merchants = Array.isArray(row.merchants) && row.merchants.length
      ? row.merchants.join(" / ")
      : row.topMerchant || "Purchases";
    const creditMerchants = Array.isArray(row.creditMerchants) && row.creditMerchants.length
      ? row.creditMerchants.join(" / ")
      : "Purchase credits";
    const otherInflowMerchants = Array.isArray(row.otherInflowMerchants) && row.otherInflowMerchants.length
      ? row.otherInflowMerchants.join(" / ")
      : "Other inflow";
    const rowPurchases = Number(row.total || 0);
    const rowCredits = Number(row.credits || 0);
    const rowOtherInflow = Number(row.otherInflow || 0);
    const rowInflow = Number(row.inflowTotal || (rowCredits + rowOtherInflow));
    const rowNetOut = Number.isFinite(Number(row.netOut))
      ? Number(row.netOut || 0)
      : Math.max(0, rowPurchases - rowInflow);
    const amountText = rowInflow > 0
      ? rowNetOut > 0
        ? `${money.format(rowNetOut)} net out`
        : rowCredits > 0 && rowOtherInflow === 0
          ? `${money.format(rowInflow - rowPurchases)} net credit`
          : `${money.format(rowInflow - rowPurchases)} net in`
      : money.format(rowPurchases);
    const parts = [];
    if (Number(row.count || 0) > 0) parts.push(`${row.count || 0} purchase${row.count === 1 ? "" : "s"}: ${merchants}`);
    if (rowCredits > 0) parts.push(`${row.creditCount || 0} credit${row.creditCount === 1 ? "" : "s"}/return${row.creditCount === 1 ? "" : "s"}: ${creditMerchants}`);
    if (rowOtherInflow > 0) parts.push(`${row.otherInflowCount || 0} inflow${row.otherInflowCount === 1 ? "" : "s"}: ${otherInflowMerchants}`);
    return `<div class="daily-scan-row" data-severity="${escapeHtml(row.severity || "watch")}" data-offset="${rowInflow > 0 ? "true" : "false"}">
      <time>${escapeHtml(dateLabel(row.date))}</time>
      <div>
        <strong>${escapeHtml(cleanVisibleText(amountText))}</strong>
        <span>${escapeHtml(cleanVisibleText(parts.join(" / ")))}</span>
      </div>
    </div>`;
  }).join("");
}

function netWindowMode(rows, days, title, emptyRange, axisTitle) {
  if (!rows.length) {
    return { rows: [], current: null, highlight: null, title, axisTitle, key: "date", currentLabel: () => emptyRange, rangeLabel: () => "Telemetry pending.", pointLabel: () => "" };
  }
  const latest = rows[rows.length - 1].date;
  const start = Number.isFinite(days) ? daysAgoKey(latest, days - 1) : rows[0].date;
  const raw = rows.filter((item) => item.date >= start && item.date <= latest);
  if (!raw.length) {
    return { rows: [], current: null, highlight: null, title, axisTitle, key: "date", currentLabel: () => emptyRange, rangeLabel: () => "Telemetry pending.", pointLabel: () => "" };
  }
  let cumulative = 0;
  const summary = raw.reduce((acc, item) => {
    acc.inflow += Number(item.inflow || 0);
    acc.spend += Number(item.spend || 0);
    return acc;
  }, { inflow: 0, spend: 0 });
  const visible = [
    {
      ...raw[0],
      net: 0,
      inflow: 0,
      spend: 0,
      baseline: true,
      date: raw[0].date,
      year: Number(String(raw[0].date || "").slice(0, 4)),
      chartIndex: 0
    },
    ...raw.map((item, index) => {
      cumulative += Number(item.net || 0);
      return {
        ...item,
        rawNet: Number(item.net || 0),
        net: cumulative,
        chartIndex: index + 1
      };
    })
  ];
  const current = visible[visible.length - 1] || null;
  if (current) {
    current.inflow = summary.inflow;
    current.spend = summary.spend;
  }
  return {
    rows: visible,
    current,
    highlight: current,
    title,
    axisTitle,
    key: "chartIndex",
    currentLabel: () => raw.length ? `${dateLabel(raw[0].date)} - ${dateLabel(raw[raw.length - 1].date)}` : emptyRange,
    rangeLabel: () => raw.length ? `${dateLabelWithYear(raw[0].date)} - ${dateLabelWithYear(raw[raw.length - 1].date)}` : "Telemetry pending.",
    pointLabel: (item) => item.baseline ? "Start" : dateLabel(item.date)
  };
}

function netModeData(data) {
  const rows = dailyRows(data).map((item) => ({
    ...item,
    year: Number(String(item.date || "").slice(0, 4))
  }));
  return {
    week: netWindowMode(rows, 7, "7-day cashflow", "Last 7 days", "$/7 days"),
    month: netWindowMode(rows, 30, "30-day cashflow", "Last 30 days", "$/30 days"),
    quarter: netWindowMode(rows, 90, "90-day cashflow", "Last 90 days", "$/90 days"),
    year: netWindowMode(rows, 365, "1-year cashflow", "Last 1 year", "$/year"),
    all: netWindowMode(rows, Infinity, "All-time cashflow", rows[0] ? `Since ${dateLabelWithYear(rows[0].date)}` : "All connected history", "cumulative")
  };
}

function axisTicks(modeKey, rows) {
  const ticks = [];
  if (!Array.isArray(rows) || !rows.length) return ticks;
  const add = (index, label) => {
    if (!Number.isFinite(index) || index < 0 || index >= rows.length || !label) return;
    if (ticks.some((item) => item.index === index || item.label === label)) return;
    ticks.push({ index, label });
  };

  if (modeKey === "week") {
    rows.forEach((item, index) => add(index, dateLabel(item.date)));
    return ticks;
  }

  if (modeKey === "month") {
    [0, 6, 13, 20, 27, rows.length - 1].forEach((index) => add(index, dateLabel(rows[index]?.date)));
    return ticks;
  }

  if (modeKey === "quarter") {
    add(0, dateLabel(rows[0].date));
    rows.forEach((item, index) => {
      if (String(item.date || "").endsWith("-01")) add(index, dateLabel(item.date));
    });
    add(rows.length - 1, dateLabel(rows[rows.length - 1].date));
    return ticks;
  }

  add(0, modeKey === "all" ? String(rows[0].year || String(rows[0].date).slice(0, 4)) : monthLabel(String(rows[0].date).slice(0, 7)));
  rows.forEach((item, index) => {
    const date = String(item.date || "");
    if (date.slice(5) === "01-01") add(index, String(date.slice(0, 4)));
  });
  add(rows.length - 1, modeKey === "all" ? String(rows[rows.length - 1].year || String(rows[rows.length - 1].date).slice(0, 4)) : monthLabel(String(rows[rows.length - 1].date).slice(0, 7)));
  return ticks;
}

function renderNetModeButtons(modes) {
  for (const button of els.netModeButtons) {
    const modeKey = button.dataset.netMode || "week";
    const mode = modes[modeKey];
    const current = mode?.current || null;
    const value = button.querySelector("strong");
    const isActive = modeKey === activeNetMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    if (value) {
      value.textContent = current ? money.format(current.net || 0) : "--";
      if (current) {
        value.dataset.net = Number(current.net || 0) >= 0 ? "positive" : "negative";
      } else {
        delete value.dataset.net;
      }
    }
  }
}

function renderMonthlyNet(data) {
  if (!els.netChart) return;
  const modes = netModeData(data);
  if (!modes[activeNetMode]) activeNetMode = "week";
  const mode = modes[activeNetMode] || modes.week;
  const visible = Array.isArray(mode.rows) ? mode.rows : [];
  const current = mode.current || visible[visible.length - 1] || null;
  const highlight = mode.highlight || visible[visible.length - 1] || current;
  renderNetModeButtons(modes);

  if (!visible.length || !current || !highlight) {
    setText(els.netWindow, "Awaiting transactions");
    setText(els.netCurrent, "--");
    els.netChart.innerHTML = "";
    setText(els.netAverage, "Awaiting history.");
    setText(els.netRange, "Telemetry pending.");
    return;
  }

  setText(els.netWindow, mode.currentLabel(current));
  setText(els.netCurrent, money.format(current.net));
  els.netCurrent.dataset.net = current.net >= 0 ? "positive" : "negative";
  setText(els.netAverage, `${money.format(current.inflow || 0)} in - ${money.format(current.spend || 0)} out`);
  setText(els.netRange, mode.rangeLabel(visible));
  const chartTitle = document.querySelector(".net-head h3");
  if (chartTitle) chartTitle.textContent = mode.title;
  els.netChart.setAttribute("aria-label", `${mode.title} history`);

  const width = 720;
  const height = 260;
  const plotLeft = 64;
  const plotRight = width - 24;
  const plotTop = 22;
  const plotBottom = height - 44;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;
  const comparisonRows = Array.isArray(mode.compareRows) ? mode.compareRows : [];
  const nets = [
    ...visible.map((item) => Number(item.net || 0)),
    ...comparisonRows.map((item) => Number(item.net || 0))
  ];
  const maxAbs = Math.max(1, ...nets.map((value) => Math.abs(value))) * 1.08;
  const yFor = (value) => plotTop + ((maxAbs - value) / (maxAbs * 2)) * plotH;
  const step = visible.length > 1 ? plotW / (visible.length - 1) : 0;
  const xFor = (index) => plotLeft + (index * step);
  const lineD = visible.map((item, index) => {
    const value = Number(item.net || 0);
    const command = index === 0 ? "M" : "L";
    return `${command}${xFor(index).toFixed(2)},${yFor(value).toFixed(2)}`;
  }).join(" ");

  const points = visible.map((item, index) => {
    const value = Number(item.net || 0);
    const currentClass = mode.key && item[mode.key] === highlight[mode.key] ? " is-current" : "";
    const signClass = value >= 0 ? "positive" : "negative";
    return `<circle class="net-point ${signClass}${currentClass}" cx="${xFor(index).toFixed(2)}" cy="${yFor(value).toFixed(2)}" r="${currentClass ? 4.5 : 2.15}">
      <title>${escapeHtml(mode.pointLabel(item))}: ${escapeHtml(money.format(value))} ${escapeHtml(mode.axisTitle || "net")}</title>
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

  const ticks = axisTicks(activeNetMode, visible);
  const labelEvery = ticks.length > 8 ? Math.max(1, Math.ceil(ticks.length / 7)) : 1;
  const xLabels = ticks.map((item, labelIndex) => {
    if (labelIndex % labelEvery !== 0 && labelIndex !== ticks.length - 1) return "";
    const anchor = item.index === visible.length - 1 ? " end" : "";
    const x = xFor(item.index);
    return `<text class="net-axis-label${anchor}" x="${x.toFixed(2)}" y="${height - 22}">${escapeHtml(String(item.label))}</text>`;
  }).join("");

  const foundCurrent = mode.key ? visible.findIndex((item) => item[mode.key] === highlight[mode.key]) : -1;
  const currentIndex = foundCurrent >= 0 ? foundCurrent : visible.length - 1;
  const currentX = xFor(currentIndex);
  const currentY = yFor(Number(highlight.net || 0));
  const currentLabelX = currentX > width - 120 ? currentX - 8 : currentX + 8;
  const currentAnchor = currentX > width - 120 ? " end" : "";

  els.netChart.innerHTML = `
    ${grid}
    <path class="net-line" d="${lineD}"></path>
    ${points}
    <line class="net-current-rule" x1="${currentX.toFixed(2)}" x2="${currentX.toFixed(2)}" y1="${plotTop}" y2="${plotBottom}"></line>
    <circle class="net-current-dot" cx="${currentX.toFixed(2)}" cy="${currentY.toFixed(2)}" r="5"></circle>
    <text class="net-current-label${currentAnchor}" x="${currentLabelX.toFixed(2)}" y="${Math.max(plotTop + 14, currentY - 10).toFixed(2)}">${escapeHtml(moneyShort(highlight.net))}</text>
    ${xLabels}
    <text class="net-axis-title" x="${plotRight}" y="${height - 8}">${escapeHtml(mode.axisTitle || "")}</text>
  `;
}

function projectionStartCash(data, accounts = {}, totals = {}) {
  const cash = Number(accounts.cash);
  if (accounts.connected && Number.isFinite(cash)) return cash;
  const balance = Number(totals.balance);
  if (Number.isFinite(balance)) return balance;
  const transactions = Array.isArray(data?.analysis?.transactions) ? data.analysis.transactions : [];
  const withBalance = transactions.find((transaction) => Number.isFinite(Number(transaction.balance)));
  return withBalance ? Number(withBalance.balance) : 0;
}

function recentProjectionRates(rows) {
  const latest = rows[rows.length - 1]?.date || todayKey();
  const start = rows.length ? daysAgoKey(latest, 89) : latest;
  const windowRows = rows.filter((item) => item.date >= start && item.date <= latest);
  const first = windowRows[0]?.date || latest;
  const spanDays = Math.max(1, dayDiff(first, latest) + 1);
  const inflow = windowRows.reduce((total, item) => total + Number(item.inflow || 0), 0);
  const spend = windowRows.reduce((total, item) => total + Number(item.spend || 0), 0);
  return {
    days: spanDays,
    inflowDaily: inflow / spanDays,
    spendDaily: spend / spanDays,
    inflowMonthly: (inflow / spanDays) * 30.4375,
    spendMonthly: (spend / spanDays) * 30.4375
  };
}

function projectionScenario(data, days, scenario = {}) {
  const buyCar = scenario.buyCar ?? projectionBuyCar;
  const hasJob = scenario.job ?? projectionJob;
  const analysis = data.analysis || {};
  const accounts = analysis.accounts || {};
  const totals = analysis.totals || {};
  const settings = data.settings || {};
  const rows = dailyRows(data);
  const rates = recentProjectionRates(rows);
  const startDate = todayKey();
  const startCash = projectionStartCash(data, accounts, totals);
  const cashFloor = Math.max(0, Number(settings.cashFloor || 0));
  const targetDown = Math.max(0, Number(settings.downPaymentTarget || 0));
  const availableDown = Math.max(0, startCash - cashFloor);
  const downPayment = buyCar
    ? Math.min(projectionConfig.a3Price, targetDown > 0 ? Math.min(targetDown, Math.max(0, startCash)) : availableDown)
    : 0;
  const principal = buyCar ? Math.max(0, projectionConfig.a3Price - downPayment) : 0;
  const loan = loanPayment(principal, projectionConfig.apr, projectionConfig.months);
  const carPaymentMonthly = buyCar ? loan.payment : 0;
  const carCostMonthly = buyCar ? carPaymentMonthly + projectionConfig.monthlyInsurance : 0;
  const jobNetMonthly = (projectionConfig.jobBase * projectionConfig.jobTakeHomeRate) / 12;
  const jobNetDaily = jobNetMonthly / 30.4375;
  const postJobSalaryMonthly = hasJob ? jobNetMonthly : 0;
  const postJobInflowMonthly = rates.inflowMonthly + postJobSalaryMonthly;
  const postJobCarMonthly = buyCar ? carCostMonthly : 0;
  const postJobMonthlyNet = postJobInflowMonthly - rates.spendMonthly - postJobCarMonthly;
  let balance = startCash - downPayment;
  const visible = [{
    date: startDate,
    net: balance,
    dayIndex: 0,
    carMonthly: buyCar ? carCostMonthly : 0,
    jobMonthly: 0,
    baseline: true
  }];

  for (let day = 1; day <= days; day += 1) {
    const date = addDaysKey(startDate, day);
    const elapsedMonths = day / 30.4375;
    const activePayment = buyCar && elapsedMonths <= projectionConfig.months ? carPaymentMonthly : 0;
    const activeCarMonthly = buyCar ? activePayment + projectionConfig.monthlyInsurance : 0;
    const jobActive = hasJob && date >= projectionConfig.jobStartDate;
    const inflowDaily = rates.inflowDaily + (jobActive ? jobNetDaily : 0);
    const dailyNet = inflowDaily - rates.spendDaily - (activeCarMonthly / 30.4375);
    balance += dailyNet;
    visible.push({
      date,
      net: balance,
      dayIndex: day,
      carMonthly: activeCarMonthly,
      jobMonthly: jobActive ? jobNetMonthly : 0
    });
  }

  return {
    rows: visible,
    current: visible[visible.length - 1] || null,
    highlight: visible[visible.length - 1] || null,
    key: "dayIndex",
    startCash,
    downPayment,
    principal,
    carPaymentMonthly,
    carCostMonthly,
    jobNetMonthly,
    postJobSalaryMonthly,
    postJobInflowMonthly,
    postJobCarMonthly,
    postJobMonthlyNet,
    rates
  };
}

function projectionModeData(data) {
  const configs = {
    week: { days: 7, title: "7-day projection", axisTitle: "$ / 7 days" },
    month: { days: 30, title: "30-day projection", axisTitle: "$ / 30 days" },
    quarter: { days: 90, title: "90-day projection", axisTitle: "$ / 90 days" },
    year: { days: 365, title: "1-year projection", axisTitle: "$ / year" },
    five: { days: 365 * 5, title: "5-year projection", axisTitle: "$ / 5 years" }
  };
  return Object.fromEntries(Object.entries(configs).map(([key, config]) => {
    const mode = projectionScenario(data, config.days);
    return [key, {
      ...mode,
      ...config,
      title: config.title,
      axisTitle: config.axisTitle,
      currentLabel: () => `${config.days === 365 * 5 ? "5 years" : config.days === 365 ? "1 year" : `${config.days} days`} from today`,
      rangeLabel: () => `${dateLabelWithYear(mode.rows[0]?.date)} - ${dateLabelWithYear(mode.rows[mode.rows.length - 1]?.date)}`,
      pointLabel: (item) => item.baseline ? "Today" : dateLabel(item.date)
    }];
  }));
}

function renderProjectionModeButtons(modes) {
  for (const button of els.projectionModeButtons) {
    const modeKey = button.dataset.projectionMode || "week";
    const mode = modes[modeKey];
    const current = mode?.current || null;
    const value = button.querySelector("strong");
    const isActive = modeKey === activeProjectionMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    if (value) {
      value.textContent = current ? money.format(current.net || 0) : "--";
      if (current) {
        value.dataset.net = Number(current.net || 0) >= 0 ? "positive" : "negative";
      } else {
        delete value.dataset.net;
      }
    }
  }
}

function renderProjectionChart(mode) {
  const visible = Array.isArray(mode.rows) ? mode.rows : [];
  const highlight = mode.highlight || visible[visible.length - 1] || null;
  if (!visible.length || !highlight) {
    els.projectionChart.innerHTML = "";
    return;
  }
  const width = 720;
  const height = 260;
  const plotLeft = 64;
  const plotRight = width - 24;
  const plotTop = 22;
  const plotBottom = height - 44;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;
  const comparisonRows = Array.isArray(mode.compareRows) ? mode.compareRows : [];
  const nets = [
    ...visible.map((item) => Number(item.net || 0)),
    ...comparisonRows.map((item) => Number(item.net || 0))
  ];
  const min = Math.min(...nets, 0);
  const max = Math.max(...nets, 1);
  const range = Math.max(1, max - min);
  const paddedMin = min - range * .08;
  const paddedMax = max + range * .08;
  const yFor = (value) => plotTop + ((paddedMax - value) / (paddedMax - paddedMin)) * plotH;
  const step = visible.length > 1 ? plotW / (visible.length - 1) : 0;
  const xFor = (index) => plotLeft + (index * step);
  const lineD = visible.map((item, index) => {
    const command = index === 0 ? "M" : "L";
    return `${command}${xFor(index).toFixed(2)},${yFor(Number(item.net || 0)).toFixed(2)}`;
  }).join(" ");
  const comparisonD = comparisonRows.length === visible.length
    ? comparisonRows.map((item, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${xFor(index).toFixed(2)},${yFor(Number(item.net || 0)).toFixed(2)}`;
    }).join(" ")
    : "";
  const foundCurrent = visible.findIndex((item) => item.dayIndex === highlight.dayIndex);
  const currentIndex = foundCurrent >= 0 ? foundCurrent : visible.length - 1;
  const pointEvery = Math.max(1, Math.ceil(visible.length / 90));
  const points = visible.map((item, index) => {
    if (index !== 0 && index !== currentIndex && index % pointEvery !== 0) return "";
    const value = Number(item.net || 0);
    const currentClass = item.dayIndex === highlight.dayIndex ? " is-current" : "";
    const signClass = value >= 0 ? "positive" : "negative";
    return `<circle class="net-point ${signClass}${currentClass}" cx="${xFor(index).toFixed(2)}" cy="${yFor(value).toFixed(2)}" r="${currentClass ? 4.5 : 2.15}">
      <title>${escapeHtml(mode.pointLabel(item))}: ${escapeHtml(money.format(value))} projected cash</title>
    </circle>`;
  }).join("");
  const gridValues = [paddedMax, paddedMax - (paddedMax - paddedMin) * .25, paddedMax - (paddedMax - paddedMin) * .5, paddedMax - (paddedMax - paddedMin) * .75, paddedMin];
  const grid = gridValues.map((value) => {
    const y = yFor(value);
    const zeroClass = Math.abs(value) < Math.max(1, range * .015) ? " is-zero" : "";
    return `<g class="net-grid${zeroClass}">
      <line x1="${plotLeft}" x2="${plotRight}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}"></line>
      <text x="${plotLeft - 12}" y="${(y + 4).toFixed(2)}">${escapeHtml(moneyShort(value))}</text>
    </g>`;
  }).join(" ");
  const ticks = axisTicks(activeProjectionMode, visible);
  const labelEvery = ticks.length > 8 ? Math.max(1, Math.ceil(ticks.length / 7)) : 1;
  const xLabels = ticks.map((item, labelIndex) => {
    if (labelIndex % labelEvery !== 0 && labelIndex !== ticks.length - 1) return "";
    const anchor = item.index === visible.length - 1 ? " end" : "";
    const x = xFor(item.index);
    return `<text class="net-axis-label${anchor}" x="${x.toFixed(2)}" y="${height - 22}">${escapeHtml(String(item.label))}</text>`;
  }).join("");
  const currentX = xFor(currentIndex);
  const currentY = yFor(Number(highlight.net || 0));
  const currentLabelX = currentX > width - 120 ? currentX - 8 : currentX + 8;
  const currentAnchor = currentX > width - 120 ? " end" : "";
  const jobStartIndex = visible.findIndex((item) => item.date >= projectionConfig.jobStartDate);
  const jobSegmentStart = Math.max(0, jobStartIndex - 1);
  const jobSegmentRows = projectionJob && jobStartIndex > 0 ? visible.slice(jobSegmentStart) : [];
  const jobSegmentD = jobSegmentRows.length > 1
    ? jobSegmentRows.map((item, offset) => {
      const index = jobSegmentStart + offset;
      const command = offset === 0 ? "M" : "L";
      return `${command}${xFor(index).toFixed(2)},${yFor(Number(item.net || 0)).toFixed(2)}`;
    }).join(" ")
    : "";
  const jobBadge = projectionJob && jobStartIndex > 0
    ? (() => {
      const badgeW = 310;
      const badgeH = 92;
      const badgeX = Math.min(plotRight - badgeW, Math.max(plotLeft + 8, xFor(jobStartIndex) - badgeW * .45));
      const badgeY = plotTop + 6;
      const monthlySlope = Number(mode.postJobMonthlyNet || 0);
      const slopeClass = monthlySlope >= 0 ? "positive" : "negative";
      return `<g class="projection-job-badge" transform="translate(${badgeX.toFixed(2)} ${badgeY.toFixed(2)})">
        <rect width="${badgeW}" height="${badgeH}" rx="7"></rect>
        <text class="projection-job-badge-title" x="16" y="32">$130k/year</text>
        <text class="projection-job-badge-sub" x="17" y="55">+$7.8k/mo salary layer</text>
        <text class="projection-job-badge-slope ${slopeClass}" x="17" y="78">${escapeHtml(moneySigned(monthlySlope))}/mo net after spend/A3</text>
      </g>`;
    })()
    : "";
  const jobMarker = projectionJob && jobStartIndex > 0
    ? `<line class="projection-job-marker" x1="${xFor(jobStartIndex).toFixed(2)}" x2="${xFor(jobStartIndex).toFixed(2)}" y1="${plotTop}" y2="${plotBottom}"></line>`
    : "";
  els.projectionChart.innerHTML = `
    ${grid}
    ${comparisonD ? `<path class="net-line projection-compare-line" d="${comparisonD}"></path>` : ""}
    <path class="net-line projection-line" d="${lineD}"></path>
    ${jobSegmentD ? `<path class="net-line projection-job-line" d="${jobSegmentD}"></path>` : ""}
    ${jobMarker}
    ${jobBadge}
    ${points}
    <line class="net-current-rule" x1="${currentX.toFixed(2)}" x2="${currentX.toFixed(2)}" y1="${plotTop}" y2="${plotBottom}"></line>
    <circle class="net-current-dot" cx="${currentX.toFixed(2)}" cy="${currentY.toFixed(2)}" r="5"></circle>
    <text class="net-current-label${currentAnchor}" x="${currentLabelX.toFixed(2)}" y="${Math.max(plotTop + 14, currentY - 10).toFixed(2)}">${escapeHtml(moneyShort(highlight.net))}</text>
    ${xLabels}
    <text class="net-axis-title" x="${plotRight}" y="${height - 8}">${escapeHtml(mode.axisTitle || "")}</text>
  `;
}

function renderProjection(data) {
  if (!els.projectionChart) return;
  if (els.projectionCarToggle) els.projectionCarToggle.checked = projectionBuyCar;
  if (els.projectionJobToggle) els.projectionJobToggle.checked = projectionJob;
  const modes = projectionModeData(data);
  if (!modes[activeProjectionMode]) activeProjectionMode = "week";
  const mode = modes[activeProjectionMode] || modes.week;
  const noJobMode = projectionScenario(data, mode.days, { buyCar: projectionBuyCar, job: false });
  const noCarMode = projectionScenario(data, mode.days, { buyCar: false, job: projectionJob });
  const current = mode.current;
  mode.compareRows = projectionJob ? noJobMode.rows : [];
  renderProjectionModeButtons(modes);
  if (!current) {
    setText(els.projectionWindow, "Awaiting history");
    setText(els.projectionCurrent, "--");
    setText(els.projectionBasis, "Awaiting history.");
    setText(els.projectionRange, "Telemetry pending.");
    els.projectionChart.innerHTML = "";
    return;
  }
  setText(els.projectionWindow, mode.currentLabel());
  setText(els.projectionCurrent, money.format(current.net));
  els.projectionCurrent.dataset.net = current.net >= 0 ? "positive" : "negative";
  const rateText = `${mode.rates.days}d rate ${money.format(mode.rates.inflowMonthly)}/mo in - ${money.format(mode.rates.spendMonthly)}/mo out`;
  const carText = projectionBuyCar
    ? `A3 ${money.format(mode.downPayment)} down + ${money.format(mode.carCostMonthly)}/mo`
    : "A3 excluded";
  const slopeText = projectionJob
    ? `Post-May ${money.format(mode.rates.inflowMonthly)}/mo current + ${money.format(mode.postJobSalaryMonthly)}/mo salary - ${money.format(mode.rates.spendMonthly)}/mo spend - ${money.format(mode.postJobCarMonthly)}/mo A3 = ${moneySigned(mode.postJobMonthlyNet)}/mo`
    : `Future slope ${money.format(mode.rates.inflowMonthly)}/mo current - ${money.format(mode.rates.spendMonthly)}/mo spend - ${money.format(mode.postJobCarMonthly)}/mo A3 = ${moneySigned(mode.postJobMonthlyNet)}/mo`;
  setText(els.projectionBasis, `${rateText}. ${carText}.`);
  setText(els.projectionRange, `${slopeText}. ${mode.rangeLabel()}.`);
  const jobDelta = projectionJob && noJobMode.current ? current.net - noJobMode.current.net : 0;
  const carDelta = projectionBuyCar && noCarMode.current ? current.net - noCarMode.current.net : 0;
  const finalDate = mode.rows[mode.rows.length - 1]?.date || todayKey();
  const jobInSpan = finalDate >= projectionConfig.jobStartDate;
  setText(els.projectionJobDelta, projectionJob ? money.format(jobDelta) : "excluded");
  setText(els.projectionCarDelta, projectionBuyCar ? money.format(carDelta) : "excluded");
  setText(els.projectionJobStart, jobInSpan ? "May 2027 in span" : "May 2027 beyond span");
  if (els.projectionJobDelta) els.projectionJobDelta.dataset.net = jobDelta >= 0 ? "positive" : "negative";
  if (els.projectionCarDelta) els.projectionCarDelta.dataset.net = carDelta >= 0 ? "positive" : "negative";
  renderProjectionChart(mode);
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
  setText(els.telemetryCashMeta, "cash");
  setText(els.telemetryBalance, financeStateLabel(balance));
  setText(els.telemetryBalanceMeta, "credit + loan accounts");
  setText(els.telemetryNet7, financeStateLabel(net7));
  setText(els.telemetryNet30, financeStateLabel(net30));
  setText(els.telemetryNet90, financeStateLabel(net90));
  setText(els.telemetryNetYear, financeStateLabel(netYear));
  setText(els.currentIncomeValue, income.value);
  setText(els.currentIncomeDetail, income.detail);
  setText(els.ladderCurrentIncome, income.value);
  setText(els.ladderCurrentDetail, income.detail);
  renderPatterns(data, sampleOnly);
  renderDailyScan(data, accounts);
  renderMonthlyNet(data);
  renderProjection(data);
}

function renderBuild(data) {
  const goal = data.goal || {};
  setText(els.heroA3Price, "$31,500");
  setText(els.heroA3Code, goal.audiCode || "AWG0XSW9");
  setText(els.heroA3Cabin, "white / black / 5k");
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

els.netModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeNetMode = button.dataset.netMode || "week";
    localStorage.setItem("a3NetMode", activeNetMode);
    if (lastState) renderMonthlyNet(lastState);
  });
});

els.projectionModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeProjectionMode = button.dataset.projectionMode || "week";
    localStorage.setItem("a3ProjectionMode", activeProjectionMode);
    if (lastState) renderProjection(lastState);
  });
});

if (els.projectionCarToggle) {
  els.projectionCarToggle.checked = projectionBuyCar;
  els.projectionCarToggle.addEventListener("change", () => {
    projectionBuyCar = els.projectionCarToggle.checked;
    localStorage.setItem("a3ProjectionBuyCar", projectionBuyCar ? "true" : "false");
    if (lastState) renderProjection(lastState);
  });
}

if (els.projectionJobToggle) {
  els.projectionJobToggle.checked = projectionJob;
  els.projectionJobToggle.addEventListener("change", () => {
    projectionJob = els.projectionJobToggle.checked;
    localStorage.setItem("a3ProjectionJob", projectionJob ? "true" : "false");
    if (lastState) renderProjection(lastState);
  });
}

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
