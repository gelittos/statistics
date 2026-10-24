"use strict";

const simulationForm = document.querySelector("#simulation-form");
const modelInput = document.querySelector("#score-model");
const systemsInput = document.querySelector("#system-count");
const attackersInput = document.querySelector("#attacker-count");
const probabilityInput = document.querySelector("#success-probability");
const toleranceInput = document.querySelector("#lln-tolerance");

const modelDescription = document.querySelector("#model-description");
const simulationStatus = document.querySelector("#simulation-status");
const momentsBody = document.querySelector("#simulation-moments");
const llnResult = document.querySelector("#lln-result");
const aggregateResult = document.querySelector("#aggregate-result");

// Conserva l'ultima simulazione anche per i grafici che aggiungeremo.
let simulationData = null;

// Legge i parametri e controlla che siano validi.
function readParameters() {
  const model = modelInput.value;
  const n = systemsInput.valueAsNumber;
  const m = attackersInput.valueAsNumber;
  const p = model === "rademacher"
    ? 0.5
    : probabilityInput.valueAsNumber;
  const epsilon = toleranceInput.valueAsNumber;

  if (!["bernoulli", "rademacher"].includes(model)) {
    throw new Error("Choose a valid model.");
  }

  if (!Number.isInteger(n) || n < 1 || n > 1000) {
    throw new Error("Choose an integer n between 1 and 1000.");
  }

  if (!Number.isInteger(m) || m < 2 || m > 2000) {
    throw new Error("Choose an integer m between 2 and 2000.");
  }

  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new Error("Choose a probability between 0 and 1.");
  }

  if (!Number.isFinite(epsilon) || epsilon < 0.001 || epsilon > 1) {
    throw new Error("Choose a tolerance between 0.001 and 1.");
  }

  const mu = model === "bernoulli" ? p : 0;
  const variance = model === "bernoulli" ? p * (1 - p) : 1;

  return { model, n, m, p, epsilon, mu, variance };
}

// Genera un singolo incremento.
function sampleIncrement(model, p) {
  const u = Math.random();

  if (model === "bernoulli") {
    return u < p ? 1 : 0;
  }

  return u < 0.5 ? 1 : -1;
}

// Simula m traiettorie, ciascuna composta da n incrementi.
function simulateAttackers(parameters) {
  const { model, n, m, p } = parameters;

  const trajectories = [];
  const totals = [];

  for (let attacker = 0; attacker < m; attacker++) {
    const path = [0];
    let score = 0;

    for (let system = 1; system <= n; system++) {
      score += sampleIncrement(model, p);
      path.push(score);
    }

    trajectories.push(path);
    totals.push(score);
  }

  return { parameters, trajectories, totals };
}

// Media e varianza descrittiva di una lista di osservazioni.
function empiricalMoments(values) {
  const mean =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const variance =
    values.reduce(
      (sum, value) => sum + (value - mean) ** 2,
      0
    ) / values.length;

  return { mean, variance };
}

// Formatta i numeri con quattro cifre dopo il punto.
function formatNumber(value) {
  return value.toFixed(4);
}

// Aggiunge una riga di risultati alla tabella.
function appendMomentRow(label, values, expectedMean, expectedVariance) {
  const empirical = empiricalMoments(values);
  const row = document.createElement("tr");

  const cells = [
    label,
    formatNumber(empirical.mean),
    formatNumber(expectedMean),
    formatNumber(empirical.variance),
    formatNumber(expectedVariance)
  ];

  for (const value of cells) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.appendChild(cell);
  }

  momentsBody.appendChild(row);
}

// Mostra statistiche finali, frequenza degli scostamenti e totale aggregato.
function displaySimulation(data) {
  const { n, m, mu, variance, epsilon } = data.parameters;
  const totals = data.totals;

  const averages = totals.map(score => score / n);
  const normalized = totals.map(score => score / Math.sqrt(n));

  momentsBody.replaceChildren();

  appendMomentRow(
    "Total Sₙ",
    totals,
    n * mu,
    n * variance
  );

  appendMomentRow(
    "Average Sₙ/n",
    averages,
    mu,
    variance / n
  );

  appendMomentRow(
    "Normalized total Sₙ/√n",
    normalized,
    Math.sqrt(n) * mu,
    variance
  );

  const outsideTolerance = averages.filter(
    value => Math.abs(value - mu) > epsilon
  ).length;

  const outsidePercentage = 100 * outsideTolerance / m;

  llnResult.textContent =
    `LLN diagnostic: ${outsideTolerance}/${m} attackers ` +
    `(${outsidePercentage.toFixed(1)}%) have |Sₙ/n − μ| > ${epsilon}. ` +
    `This estimates the probability of exceeding the selected tolerance.`;

  const aggregate = totals.reduce((sum, value) => sum + value, 0);

  aggregateResult.textContent =
    `Aggregate score across all attackers: ${aggregate}. ` +
    `Theoretical mean: ${formatNumber(m * n * mu)}. ` +
    `Theoretical variance: ${formatNumber(m * n * variance)}.`;
}

// Cancella risultati che non corrispondono più ai parametri visibili.
function invalidateSimulation() {
  simulationData = null;
  momentsBody.replaceChildren();
  llnResult.textContent = "";
  aggregateResult.textContent = "";

  simulationStatus.textContent =
    "Parameters changed. Run the simulation again.";
}

// Aggiorna il controllo di p quando si cambia modello.
function updateModelControls() {
  const isRademacher = modelInput.value === "rademacher";

  probabilityInput.disabled = isRademacher;

  modelDescription.textContent = isRademacher
    ? "Rademacher: P(+1) = P(−1) = 0.5. The p input is not used."
    : "Bernoulli: P(1) = p and P(0) = 1 − p.";

  invalidateSimulation();
}

// Avvia un esperimento e presenta i risultati.
function runSimulation() {
  invalidateSimulation();

  try {
    const parameters = readParameters();

    simulationData = simulateAttackers(parameters);
    displaySimulation(simulationData);

    simulationStatus.textContent =
      `Completed: ${parameters.m} attackers, ` +
      `${parameters.n} systems, ${parameters.model} model.`;
  } catch (error) {
    simulationStatus.textContent = error.message;
  }
}

simulationForm.addEventListener("submit", event => {
  event.preventDefault();
  runSimulation();
});

modelInput.addEventListener("change", updateModelControls);

for (const input of [
  systemsInput,
  attackersInput,
  probabilityInput,
  toleranceInput
]) {
  input.addEventListener("input", invalidateSimulation);
}

// Mostra subito una prima simulazione.
updateModelControls();
runSimulation();
