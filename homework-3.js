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
  for (const selector of [
    "#total-trajectories",
    "#average-trajectories",
    "#normalized-trajectories"
  ]) {
  document.querySelector(selector).replaceChildren();
}

  simulationStatus.textContent =
    "Parameters changed. Run the simulation again.";
  for (const selector of [
  "#total-histogram",
  "#average-histogram",
  "#normalized-histogram"
]) {
  document.querySelector(selector).replaceChildren();
}

document.querySelector("#histogram-explanation").textContent = "";
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
    renderTrajectoryPlots(simulationData);
    renderScoreHistograms(simulationData);
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

// Crea un elemento SVG, impostandone gli attributi.
function createTrajectorySvgElement(tag, attributes, text = "") {
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

// Disegna un pannello con le traiettorie e il valore atteso.
function drawTrajectoryPanel(
  selector,
  data,
  transform,
  expectedAt,
  fixedRange = null
) {
  const svg = document.querySelector(selector);
  svg.replaceChildren();

  const { n } = data.parameters;
  const paths = data.trajectories.slice(0, 30);

  const left = 74;
  const right = 738;
  const top = 22;
  const bottom = 248;

  let minimum = 0;
  let maximum = 0;

  // Cerca l'intervallo verticale nei dati visualizzati.
  for (const path of paths) {
    for (let k = 1; k <= n; k++) {
      const value = transform(path[k], k);

      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
  }

  // Include anche la curva del valore atteso.
  for (let k = 1; k <= n; k++) {
    minimum = Math.min(minimum, expectedAt(k));
    maximum = Math.max(maximum, expectedAt(k));
  }

  if (fixedRange !== null) {
    [minimum, maximum] = fixedRange;
  } else {
    const padding = Math.max((maximum - minimum) * 0.08, 0.5);

    minimum -= padding;
    maximum += padding;
  }

  // Converte le coordinate dei dati in coordinate SVG.
  const x = k => n === 1
    ? (left + right) / 2
    : left + ((k - 1) / (n - 1)) * (right - left);

  const y = value =>
    bottom -
    ((value - minimum) / (maximum - minimum)) * (bottom - top);

  // Griglia orizzontale ed etichette dell'asse verticale.
  for (let tick = 0; tick <= 4; tick++) {
    const value = minimum + (maximum - minimum) * tick / 4;
    const position = y(value);

    svg.append(
      createTrajectorySvgElement("line", {
        x1: left,
        y1: position,
        x2: right,
        y2: position,
        class: "trajectory-grid"
      }),

      createTrajectorySvgElement("text", {
        x: left - 10,
        y: position + 4,
        "text-anchor": "end",
        class: "trajectory-label"
      }, value.toFixed(2))
    );
  }

  // Seleziona al massimo cinque posizioni intere sull'asse k.
  const xTicks = [...new Set(
    [0, 0.25, 0.5, 0.75, 1].map(
      fraction => 1 + Math.round(fraction * (n - 1))
    )
  )];

  for (const k of xTicks) {
    svg.append(
      createTrajectorySvgElement("text", {
        x: x(k),
        y: bottom + 22,
        "text-anchor": "middle",
        class: "trajectory-label"
      }, String(k))
    );
  }

  // Assi e titolo dell'asse orizzontale.
  svg.append(
    createTrajectorySvgElement("line", {
      x1: left,
      y1: top,
      x2: left,
      y2: bottom,
      class: "trajectory-axis"
    }),

    createTrajectorySvgElement("line", {
      x1: left,
      y1: bottom,
      x2: right,
      y2: bottom,
      class: "trajectory-axis"
    }),

    createTrajectorySvgElement("text", {
      x: (left + right) / 2,
      y: 291,
      "text-anchor": "middle",
      class: "trajectory-label"
    }, "Systems attempted, k")
  );

  // Disegna le traiettorie dei singoli attaccanti.
  paths.forEach((path, index) => {
    const coordinates = [];

    for (let k = 1; k <= n; k++) {
      coordinates.push(
        `${x(k)},${y(transform(path[k], k))}`
      );
    }

    const color = `hsl(${index * 137.5 % 360}, 65%, 48%)`;

    const line = createTrajectorySvgElement("polyline", {
      points: coordinates.join(" "),
      stroke: color,
      class: "trajectory-line"
    });

    line.append(
      createTrajectorySvgElement(
        "title",
        {},
        `Attacker ${index + 1}`
      )
    );

    svg.append(line);

    // Con n = 1 una traiettoria è un solo punto.
    if (n === 1) {
      svg.append(
        createTrajectorySvgElement("circle", {
          cx: x(1),
          cy: y(transform(path[1], 1)),
          r: 3,
          fill: color
        })
      );
    }
  });

  // Disegna il valore atteso sopra le traiettorie.
  const expectedCoordinates = [];

  for (let k = 1; k <= n; k++) {
    expectedCoordinates.push(`${x(k)},${y(expectedAt(k))}`);
  }

  svg.append(
    createTrajectorySvgElement("polyline", {
      points: expectedCoordinates.join(" "),
      class: "trajectory-expected"
    })
  );

  if (n === 1) {
    svg.append(
      createTrajectorySvgElement("circle", {
        cx: x(1),
        cy: y(expectedAt(1)),
        r: 5,
        fill: "none",
        stroke: "currentColor",
        "stroke-width": 2
      })
    );
  }
}

// Applica le tre trasformazioni agli stessi percorsi simulati.
function renderTrajectoryPlots(data) {
  const { model, mu } = data.parameters;

  drawTrajectoryPanel(
    "#total-trajectories",
    data,
    (score, k) => score,
    k => k * mu
  );

  drawTrajectoryPanel(
    "#average-trajectories",
    data,
    (score, k) => score / k,
    k => mu,
    model === "bernoulli" ? [0, 1] : [-1, 1]
  );

  drawTrajectoryPanel(
    "#normalized-trajectories",
    data,
    (score, k) => score / Math.sqrt(k),
    k => Math.sqrt(k) * mu
  );
}

// Costruisce gli intervalli del totale prima della normalizzazione.
function buildScoreHistogram(data) {
  const { model } = data.parameters;
  const totals = data.totals;

  let minimum = Infinity;
  let maximum = -Infinity;

  for (const score of totals) {
    minimum = Math.min(minimum, score);
    maximum = Math.max(maximum, score);
  }

  // Bernoulli: valori interi consecutivi.
  // Rademacher: a n fissato, i valori possibili distano 2.
  const spacing = model === "bernoulli" ? 1 : 2;

  const possiblePositions =
    Math.round((maximum - minimum) / spacing) + 1;

  // Raggruppa i valori per mantenere al massimo 25 barre.
  const positionsPerBin = Math.max(
    1,
    Math.ceil(possiblePositions / 25)
  );

  const width = spacing * positionsPerBin;
  const binCount = Math.ceil(possiblePositions / positionsPerBin);
  const start = minimum - spacing / 2;
  const counts = Array(binCount).fill(0);

  for (const score of totals) {
    const index = Math.floor((score - start) / width);
    counts[index]++;
  }

  return { start, width, counts };
}

// Densità della distribuzione normale standard N(0, 1).
function standardNormalDensity(z) {
  return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
}

// Disegna un istogramma, eventualmente con la normale standard.
function drawScoreHistogram(
  selector,
  histogram,
  sampleSize,
  divisor,
  axisLabel,
  showNormal = false
) {
  const svg = document.querySelector(selector);
  svg.replaceChildren();

  const left = 74;
  const right = 738;
  const top = 26;
  const bottom = 248;

  const binWidth = histogram.width / divisor;
  const minimum = histogram.start / divisor;
  const maximum =
    (histogram.start + histogram.width * histogram.counts.length)
    / divisor;

  const densities = histogram.counts.map(
    count => count / (sampleSize * binWidth)
  );

  let highestDensity = Math.max(...densities);

  if (showNormal) {
    highestDensity = Math.max(
      highestDensity,
      standardNormalDensity(0)
    );
  }

  const yMaximum = highestDensity * 1.15;

  const x = value =>
    left + (value - minimum) / (maximum - minimum) * (right - left);

  const y = density =>
    bottom - density / yMaximum * (bottom - top);

  // Griglia orizzontale ed etichette della densità.
  for (let tick = 0; tick <= 4; tick++) {
    const density = yMaximum * tick / 4;

    svg.append(
      createTrajectorySvgElement("line", {
        x1: left,
        y1: y(density),
        x2: right,
        y2: y(density),
        class: "trajectory-grid"
      }),

      createTrajectorySvgElement("text", {
        x: left - 10,
        y: y(density) + 4,
        "text-anchor": "end",
        class: "trajectory-label"
      }, density.toFixed(2))
    );
  }

  // Etichette dell'asse dei punteggi.
  for (let tick = 0; tick <= 4; tick++) {
    const value = minimum + (maximum - minimum) * tick / 4;

    svg.append(
      createTrajectorySvgElement("text", {
        x: x(value),
        y: bottom + 22,
        "text-anchor": "middle",
        class: "trajectory-label"
      }, value.toFixed(2))
    );
  }

  // Barre dell'istogramma.
  histogram.counts.forEach((count, index) => {
    const binStart = minimum + index * binWidth;
    const binEnd = binStart + binWidth;
    const density = densities[index];

    const bar = createTrajectorySvgElement("rect", {
      x: x(binStart),
      y: y(density),
      width: x(binEnd) - x(binStart),
      height: bottom - y(density),
      class: "histogram-bar"
    });

    bar.append(
      createTrajectorySvgElement(
        "title",
        {},
        `Interval [${binStart.toFixed(3)}, ${binEnd.toFixed(3)}): ` +
        `${count} attackers; ${(100 * count / sampleSize).toFixed(1)}%`
      )
    );

    svg.append(bar);
  });

  // Curva normale standard: solo dove richiesta.
  if (showNormal) {
    const coordinates = [];

    for (let step = 0; step <= 240; step++) {
      const value = minimum + (maximum - minimum) * step / 240;

      coordinates.push(
        `${x(value)},${y(standardNormalDensity(value))}`
      );
    }

    svg.append(
      createTrajectorySvgElement("polyline", {
        points: coordinates.join(" "),
        class: "histogram-normal"
      })
    );
  }

  // Assi e titoli.
  svg.append(
    createTrajectorySvgElement("line", {
      x1: left,
      y1: top,
      x2: left,
      y2: bottom,
      class: "trajectory-axis"
    }),

    createTrajectorySvgElement("line", {
      x1: left,
      y1: bottom,
      x2: right,
      y2: bottom,
      class: "trajectory-axis"
    }),

    createTrajectorySvgElement("text", {
      x: left,
      y: 16,
      class: "trajectory-label"
    }, "Density"),

    createTrajectorySvgElement("text", {
      x: (left + right) / 2,
      y: 291,
      "text-anchor": "middle",
      class: "trajectory-label"
    }, axisLabel)
  );
}

// Disegna le tre distribuzioni dello stesso campione.
function renderScoreHistograms(data) {
  const { n, m, model } = data.parameters;
  const histogram = buildScoreHistogram(data);

  drawScoreHistogram(
    "#total-histogram",
    histogram,
    m,
    1,
    "Total score Sₙ"
  );

  drawScoreHistogram(
    "#average-histogram",
    histogram,
    m,
    n,
    "Average score Sₙ/n"
  );

  drawScoreHistogram(
    "#normalized-histogram",
    histogram,
    m,
    Math.sqrt(n),
    "Normalized total Sₙ/√n",
    model === "rademacher"
  );

  document.querySelector("#histogram-explanation").textContent =
    model === "rademacher"
      ? "The orange curve in the third panel is the standard normal " +
        "density N(0,1), shown over the displayed score range. " +
        "For large n, the normalized-score distribution approaches " +
        "this normal distribution. Agreement also depends on m " +
        "and on the histogram bins."
      : "For Bernoulli increments, Sₙ/√n has mean p√n, " +
        "so it does not converge to N(0,1) for fixed p > 0. " +
        "For 0 < p < 1, the CLT instead applies to " +
        "(Sₙ − np)/√(np(1 − p)).";
}
