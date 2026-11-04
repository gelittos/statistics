"use strict";

const welfordForm = document.querySelector("#welford-form");
const welfordInput = document.querySelector("#welford-values");
const welfordRandomButton = document.querySelector("#welford-random");

const welfordTable = document.querySelector("#welford-steps");
const welfordError = document.querySelector("#welford-error");
const welfordSummary = document.querySelector("#welford-summary");
const welfordCheck = document.querySelector("#welford-check");

// Legge e controlla i punteggi inseriti.
function readWelfordScores() {
  const pieces = welfordInput.value.split(",").map(
    piece => piece.trim()
  );

  if (pieces.length < 2 || pieces.length > 50) {
    throw new Error("Enter between 2 and 50 scores.");
  }

  if (pieces.some(piece => piece === "")) {
    throw new Error("Do not leave empty entries between commas.");
  }

  const scores = pieces.map(Number);

  if (scores.some(
    value => !Number.isInteger(value) || value < 0 || value > 10
  )) {
    throw new Error("Every score must be an integer between 0 and 10.");
  }

  return scores;
}

// Applica Welford e conserva la storia per la tabella didattica.
function computeWelfordHistory(scores) {
  let mean = 0;
  let SS = 0;

  const history = [];

  for (let index = 0; index < scores.length; index++) {
    const k = index + 1;
    const x = scores[index];
    const oldMean = mean;

    // Il nucleo dell'algoritmo: tre righe.
    const delta = x - mean;
    mean += delta / k;
    SS += delta * (x - mean);

    history.push({
      k,
      x,
      oldMean,
      delta,
      mean,
      SS,
      descriptiveVariance: SS / k,
      sampleVariance: k >= 2 ? SS / (k - 1) : null
    });
  }

  return history;
}

// Formatta i valori visualizzati.
function formatWelfordNumber(value) {
  return value.toFixed(4);
}

// Inserisce una riga nella tabella.
function appendWelfordRow(values) {
  const row = document.createElement("tr");

  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = String(value);
    row.appendChild(cell);
  }

  welfordTable.appendChild(row);
}

// Cancella i risultati precedenti.
function clearWelfordResults() {
  welfordTable.replaceChildren();
  welfordError.textContent = "";
  welfordSummary.textContent = "";
  welfordCheck.textContent = "";
}

// Esegue il calcolo e mostra tutti gli aggiornamenti.
function runWelfordDemo() {
  clearWelfordResults();

  try {
    const scores = readWelfordScores();
    const history = computeWelfordHistory(scores);

    for (const step of history) {
      appendWelfordRow([
        step.k,
        step.x,
        step.k === 1
          ? "0 (initial state)"
          : formatWelfordNumber(step.oldMean),
        formatWelfordNumber(step.delta),
        formatWelfordNumber(step.mean),
        formatWelfordNumber(step.SS),
        formatWelfordNumber(step.descriptiveVariance),
        step.sampleVariance === null
          ? "Undefined"
          : formatWelfordNumber(step.sampleVariance)
      ]);
    }

    const final = history[history.length - 1];

    welfordSummary.textContent =
      `Observations: ${scores.length}. ` +
      `Mean: ${formatWelfordNumber(final.mean)}. ` +
      `SS: ${formatWelfordNumber(final.SS)}. ` +
      `Corrected sample variance: ` +
      `${formatWelfordNumber(final.sampleVariance)}.`;

    // Verifica indipendente con il calcolo diretto in due passaggi.
    const directMean =
      scores.reduce((sum, x) => sum + x, 0) / scores.length;

    const directSS = scores.reduce(
      (sum, x) => sum + (x - directMean) ** 2,
      0
    );

    const agrees =
      Math.abs(final.mean - directMean) < 1e-9 &&
      Math.abs(final.SS - directSS) < 1e-9;

    welfordCheck.textContent = agrees
      ? "Verification: Welford agrees with a direct two-pass calculation."
      : "Verification: a numerical discrepancy was detected.";
  } catch (error) {
    welfordError.textContent = error.message;
  }
}

welfordForm.addEventListener("submit", event => {
  event.preventDefault();
  runWelfordDemo();
});

welfordInput.addEventListener("input", clearWelfordResults);

welfordRandomButton.addEventListener("click", () => {
  const scores = Array.from(
    { length: 10 },
    () => Math.floor(Math.random() * 11)
  );

  welfordInput.value = scores.join(", ");
  runWelfordDemo();
});

// Mostra subito l'esempio iniziale.
runWelfordDemo();
// ---------- Part 2: sampling experiment ----------

const samplingForm = document.querySelector("#sampling-form");
const samplingSystemsInput = document.querySelector("#sampling-systems");
const samplingAttackersInput = document.querySelector("#sampling-attackers");

const samplingStatus = document.querySelector("#sampling-status");
const samplingFinalTable = document.querySelector("#sampling-final-results");
const samplingComparisonTable =
  document.querySelector("#sampling-comparison-results");

const SCORE_MEAN = 5;
const SCORE_VARIANCE = 10;

// Conserva le statistiche dei singoli attaccanti anche per i futuri grafici.
let samplingExperiment = null;

// Legge e controlla i parametri.
function readSamplingParameters() {
  const n = samplingSystemsInput.valueAsNumber;
  const m = samplingAttackersInput.valueAsNumber;

  if (!Number.isInteger(n) || n < 2 || n > 1000) {
    throw new Error("Choose an integer n between 2 and 1000.");
  }

  if (!Number.isInteger(m) || m < 2 || m > 5000) {
    throw new Error("Choose an integer m between 2 and 5000.");
  }

  return { n, m };
}

// Media e varianza corretta di una raccolta di valori.
// Questa funzione sarà applicata alle statistiche dei diversi attaccanti.
function summarizeAcrossAttackers(values) {
  let mean = 0;
  let SS = 0;

  for (let index = 0; index < values.length; index++) {
    const k = index + 1;
    const x = values[index];

    const delta = x - mean;
    mean += delta / k;
    SS += delta * (x - mean);
  }

  return {
    mean,
    variance: SS / (values.length - 1)
  };
}

// Simula i punteggi e conserva le statistiche ai checkpoint.
function simulateSamplingExperiment(n, m) {
  const checkpoints = [...new Set([
    ...[5, 10, 30, 100, 500, 1000].filter(k => k <= n),
    n
  ])].sort((a, b) => a - b);

  const snapshots = new Map();

  for (const k of checkpoints) {
    snapshots.set(k, {
      means: [],
      sampleVariances: []
    });
  }

  for (let attacker = 0; attacker < m; attacker++) {
    let mean = 0;
    let SS = 0;

    for (let k = 1; k <= n; k++) {
      const x = Math.floor(Math.random() * 11);

      // Welford: aggiornamento per il nuovo punteggio.
      const delta = x - mean;
      mean += delta / k;
      SS += delta * (x - mean);

      if (snapshots.has(k)) {
        const snapshot = snapshots.get(k);

        snapshot.means.push(mean);
        snapshot.sampleVariances.push(SS / (k - 1));
      }
    }
  }

  return { n, m, checkpoints, snapshots };
}

// Aggiunge una riga a una delle tabelle.
function appendSamplingRow(tableBody, values) {
  const row = document.createElement("tr");

  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = String(value);
    row.appendChild(cell);
  }

  tableBody.appendChild(row);
}

// Presenta il confronto fra numerosità e il riepilogo finale.
function displaySamplingExperiment(experiment) {
  samplingFinalTable.replaceChildren();
  samplingComparisonTable.replaceChildren();

  for (const k of experiment.checkpoints) {
    const snapshot = experiment.snapshots.get(k);

    const meansSummary = summarizeAcrossAttackers(
      snapshot.means
    );

    const variancesSummary = summarizeAcrossAttackers(
      snapshot.sampleVariances
    );

    appendSamplingRow(samplingComparisonTable, [
      k,
      formatWelfordNumber(meansSummary.mean),
      formatWelfordNumber(variancesSummary.mean),
      formatWelfordNumber(meansSummary.variance),
      formatWelfordNumber(SCORE_VARIANCE / k),
      formatWelfordNumber(variancesSummary.variance)
    ]);

    if (k === experiment.n) {
      appendSamplingRow(samplingFinalTable, [
        "Sample mean",
        formatWelfordNumber(meansSummary.mean),
        formatWelfordNumber(SCORE_MEAN)
      ]);

      appendSamplingRow(samplingFinalTable, [
        "Corrected sample variance: SS/(n − 1)",
        formatWelfordNumber(variancesSummary.mean),
        formatWelfordNumber(SCORE_VARIANCE)
      ]);

      // SS/n = [SS/(n − 1)] × (n − 1)/n.
      const descriptiveFactor = (k - 1) / k;

      appendSamplingRow(samplingFinalTable, [
        "Descriptive variance: SS/n",
        formatWelfordNumber(
          variancesSummary.mean * descriptiveFactor
        ),
        formatWelfordNumber(
          SCORE_VARIANCE * descriptiveFactor
        )
      ]);
    }
  }
}

// Cancella risultati riferiti ai parametri precedenti.
function invalidateSamplingExperiment() {
  samplingExperiment = null;

  samplingFinalTable.replaceChildren();
  samplingComparisonTable.replaceChildren();

  document.querySelector("#sampling-means-histogram").replaceChildren();
  document.querySelector("#sampling-variances-histogram").replaceChildren();

  document.querySelector(
    "#sampling-histograms-description"
  ).textContent = "";

  const select = document.querySelector("#sampling-checkpoint");
  select.replaceChildren();
  select.disabled = true;

  samplingStatus.textContent =
    "Parameters changed. Run the sampling experiment again.";
}

// Avvia la simulazione.
function runSamplingExperiment() {
  invalidateSamplingExperiment();

  try {
    const { n, m } = readSamplingParameters();

    samplingExperiment = simulateSamplingExperiment(n, m);
    displaySamplingExperiment(samplingExperiment);
    prepareSamplingHistograms(samplingExperiment);

    samplingStatus.textContent =
      `Completed: ${m} attackers, ${n} scores per attacker. ` +
      `Distribution: discrete uniform on {0, …, 10}.`;
  } catch (error) {
    samplingStatus.textContent = error.message;
  }
}

samplingForm.addEventListener("submit", event => {
  event.preventDefault();
  runSamplingExperiment();
});

samplingSystemsInput.addEventListener(
  "input",
  invalidateSamplingExperiment
);

samplingAttackersInput.addEventListener(
  "input",
  invalidateSamplingExperiment
);

// Mostra una prima simulazione all'apertura.
runSamplingExperiment();
// ---------- Sampling histograms ----------

// Crea un elemento SVG.
function createSamplingSvgElement(tag, attributes, text = "") {
  const element = document.createElementNS(
    "http://www.w3.org/2000/svg",
    tag
  );

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  if (text !== "") {
    element.textContent = text;
  }

  return element;
}

// Disegna una distribuzione empirica e il suo riferimento teorico.
function drawSamplingHistogram(
  selector,
  values,
  target,
  fixedMaximum,
  axisLabel,
  color,
  automaticScale
) {
  const svg = document.querySelector(selector);
  svg.replaceChildren();

  const left = 74;
  const right = 738;
  const top = 30;
  const bottom = 248;

  let minimum = 0;
  let maximum = fixedMaximum;

  if (automaticScale) {
    minimum = Math.min(target, ...values);
    maximum = Math.max(target, ...values);

    const padding = Math.max((maximum - minimum) * 0.1, 0.1);

    minimum = Math.max(0, minimum - padding);
    maximum = Math.min(fixedMaximum, maximum + padding);
  }

  const binCount = automaticScale ? 25 : 50;
  const binWidth = (maximum - minimum) / binCount;
  const counts = Array(binCount).fill(0);

  for (const value of values) {
    // Include anche il valore eventualmente uguale all'estremo destro.
    const index = Math.min(
      binCount - 1,
      Math.max(0, Math.floor((value - minimum) / binWidth))
    );

    counts[index]++;
  }

  const densities = counts.map(
    count => count / (values.length * binWidth)
  );

  const yMaximum = Math.max(...densities) * 1.15;

  const x = value =>
    left + (value - minimum) / (maximum - minimum) * (right - left);

  const y = density =>
    bottom - density / yMaximum * (bottom - top);

  // Griglia ed etichette degli assi.
  for (let tick = 0; tick <= 4; tick++) {
    const density = yMaximum * tick / 4;
    const value = minimum + (maximum - minimum) * tick / 4;

    svg.append(
      createSamplingSvgElement("line", {
        x1: left,
        y1: y(density),
        x2: right,
        y2: y(density),
        class: "sampling-chart-grid"
      }),

      createSamplingSvgElement("text", {
        x: left - 10,
        y: y(density) + 4,
        "text-anchor": "end",
        class: "sampling-chart-label"
      }, density.toFixed(2)),

      createSamplingSvgElement("text", {
        x: x(value),
        y: bottom + 22,
        "text-anchor": "middle",
        class: "sampling-chart-label"
      }, value.toFixed(2))
    );
  }

  // Barre: l'area rappresenta la frequenza relativa.
  counts.forEach((count, index) => {
    const binStart = minimum + index * binWidth;
    const binEnd = binStart + binWidth;

    const bar = createSamplingSvgElement("rect", {
      x: x(binStart),
      y: y(densities[index]),
      width: x(binEnd) - x(binStart),
      height: bottom - y(densities[index]),
      fill: color,
      "fill-opacity": 0.7,
      stroke: color,
      "stroke-width": 0.5
    });

    const closingBracket = index === binCount - 1 ? "]" : ")";

    bar.append(
      createSamplingSvgElement(
        "title",
        {},
        `[${binStart.toFixed(3)}, ${binEnd.toFixed(3)}` +
        `${closingBracket}: ${count} attackers ` +
        `(${(100 * count / values.length).toFixed(1)}%)`
      )
    );

    svg.append(bar);
  });

  // Linea del valore teorico atteso.
  svg.append(
    createSamplingSvgElement("line", {
      x1: x(target),
      y1: top,
      x2: x(target),
      y2: bottom,
      class: "sampling-chart-target"
    }),

    createSamplingSvgElement("text", {
      x: x(target),
      y: top - 8,
      "text-anchor": "middle",
      class: "sampling-chart-label"
    }, `Target = ${target}`),

    createSamplingSvgElement("line", {
      x1: left,
      y1: top,
      x2: left,
      y2: bottom,
      class: "sampling-chart-axis"
    }),

    createSamplingSvgElement("line", {
      x1: left,
      y1: bottom,
      x2: right,
      y2: bottom,
      class: "sampling-chart-axis"
    }),

    createSamplingSvgElement("text", {
      x: left,
      y: 16,
      class: "sampling-chart-label"
    }, "Density"),

    createSamplingSvgElement("text", {
      x: (left + right) / 2,
      y: 291,
      "text-anchor": "middle",
      class: "sampling-chart-label"
    }, axisLabel)
  );
}

// Mostra i grafici per il checkpoint selezionato.
function updateSamplingHistograms() {
  if (samplingExperiment === null) return;

  const k = Number(
    document.querySelector("#sampling-checkpoint").value
  );

  const automaticScale =
    document.querySelector("#sampling-auto-scale").checked;

  const snapshot = samplingExperiment.snapshots.get(k);

  drawSamplingHistogram(
    "#sampling-means-histogram",
    snapshot.means,
    SCORE_MEAN,
    10,
    "Sample mean",
    "#397ec0",
    automaticScale
  );

  drawSamplingHistogram(
    "#sampling-variances-histogram",
    snapshot.sampleVariances,
    SCORE_VARIANCE,
    50,
    "Corrected sample variance",
    "#d97728",
    automaticScale
  );

  document.querySelector("#sampling-histograms-description").textContent =
    `${samplingExperiment.m} attackers, ${k} scores per attacker. ` +
    `Changing the checkpoint reuses the existing simulation.`;
}

// Aggiorna l'elenco dei checkpoint dopo una nuova simulazione.
function prepareSamplingHistograms(experiment) {
  const select = document.querySelector("#sampling-checkpoint");
  const previousValue = Number(select.value);

  select.replaceChildren();

  for (const k of experiment.checkpoints) {
    const option = document.createElement("option");

    option.value = String(k);
    option.textContent = `${k} systems`;

    select.appendChild(option);
  }

  select.value = String(
    experiment.checkpoints.includes(previousValue)
      ? previousValue
      : experiment.n
  );

  select.disabled = false;
  updateSamplingHistograms();
}

document.querySelector("#sampling-checkpoint").addEventListener(
  "change",
  updateSamplingHistograms
);

document.querySelector("#sampling-auto-scale").addEventListener(
  "change",
  updateSamplingHistograms
);
