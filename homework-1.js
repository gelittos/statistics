"use strict";

const P = 17;
const G = { x: 1, y: 5 };

// JavaScript può restituire un resto negativo.
// Questa funzione restituisce sempre un valore da 0 a P - 1.
function mod(value) {
  return ((value % P) + P) % P;
}

// Verifica se un punto appartiene alla curva.
function isOnCurve(point) {
  if (point === null) return true;

  return mod(point.y ** 2) === mod(point.x ** 3 + 7);
}

// Cerca b tale che a * b ≡ 1 (mod P).
function inverseMod(value) {
  const a = mod(value);

  for (let b = 1; b < P; b++) {
    if (mod(a * b) === 1) return b;
  }

  throw new Error("This value has no multiplicative inverse.");
}

// Somma due punti della curva.
function addPoints(A, B) {
  // Il punto all'infinito è l'elemento neutro.
  if (A === null) return B;
  if (B === null) return A;

  // Punti opposti, incluso il raddoppio di un punto con y = 0.
  if (A.x === B.x && mod(A.y + B.y) === 0) {
    return null;
  }

  let slope;

  if (A.x === B.x && A.y === B.y) {
    // Raddoppio: λ = 3x² / (2y), nel campo finito.
    slope = mod(3 * A.x ** 2 * inverseMod(2 * A.y));
  } else {
    // Somma di punti distinti: λ = (y₂-y₁) / (x₂-x₁).
    slope = mod((B.y - A.y) * inverseMod(B.x - A.x));
  }

  const x = mod(slope ** 2 - A.x - B.x);
  const y = mod(slope * (A.x - x) - A.y);

  return { x, y };
}

// Calcola e conserva tutti i multipli da G a kG.
function calculateMultiples(k, base = G) {
  if (!Number.isSafeInteger(k) || k < 1 || k > 1000) {
    throw new Error("Choose an integer k between 1 and 1000.");
  }

  if (base === null || !isOnCurve(base)) {
    throw new Error("Choose a finite point on the curve.");
  }

  const steps = [];
  let result = null;

  for (let i = 1; i <= k; i++) {
    result = addPoints(result, base);
    steps.push({ multiple: i, point: result });
  }

  return steps;
}

function formatPoint(point) {
  return point === null ? "O (point at infinity)" : `(${point.x}, ${point.y})`;
}

const keyForm = document.querySelector("#key-form");
const keyInput = document.querySelector("#private-key");
const tableBody = document.querySelector("#multiples-body");
const resultBox = document.querySelector("#public-key-result");
const errorBox = document.querySelector("#calculation-error");
const plot = document.querySelector("#curve-plot");
const playButton = document.querySelector("#animation-play");
const nextButton = document.querySelector("#animation-next");
const resetButton = document.querySelector("#animation-reset");
const animationStatus = document.querySelector("#animation-status");
const infinityIndicator = document.querySelector("#infinity-indicator");

const SVG_NS = "http://www.w3.org/2000/svg";

// Tutti i punti con coordinate nel campo da 0 a 16.
const curvePoints = [];

for (let x = 0; x < P; x++) {
  for (let y = 0; y < P; y++) {
    if (isOnCurve({ x, y })) {
      curvePoints.push({ x, y });
    }
  }
}

let animationSteps = [];
let animationIndex = 0;
let animationTimer = null;

// Converte le coordinate matematiche in coordinate SVG.
// Nell'SVG y cresce verso il basso: per questo la invertiamo.
const plotX = x => 50 + x * 23;
const plotY = y => 400 - y * 23;

function svgElement(tag, attributes, text = "") {
  const element = document.createElementNS(SVG_NS, tag);

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  if (text) element.textContent = text;
  return element;
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function stopAnimation() {
  clearInterval(animationTimer);
  animationTimer = null;
  playButton.textContent = "Play";
}

function renderAnimation() {
  // Mantiene title e desc, sostituendo soltanto il disegno.
  plot.querySelector(".plot-content")?.remove();

  const drawing = svgElement("g", { class: "plot-content" });

  for (let value = 0; value < P; value++) {
    drawing.append(
      svgElement("line", {
        x1: plotX(value), y1: plotY(0),
        x2: plotX(value), y2: plotY(16),
        class: "plot-grid"
      }),
      svgElement("line", {
        x1: plotX(0), y1: plotY(value),
        x2: plotX(16), y2: plotY(value),
        class: "plot-grid"
      }),
      svgElement("text", {
        x: plotX(value), y: 420,
        "text-anchor": "middle", class: "plot-label"
      }, String(value)),
      svgElement("text", {
        x: 35, y: plotY(value) + 4,
        "text-anchor": "end", class: "plot-label"
      }, String(value))
    );
  }

  drawing.append(
    svgElement("text", {
      x: 440, y: 405, class: "plot-label"
    }, "x"),
    svgElement("text", {
      x: 46, y: 18, class: "plot-label"
    }, "y")
  );

  const visited = new Set(
    animationSteps
      .slice(0, animationIndex)
      .filter(step => step.point !== null)
      .map(step => pointKey(step.point))
  );

  for (const point of curvePoints) {
    const circle = svgElement("circle", {
      cx: plotX(point.x),
      cy: plotY(point.y),
      r: 5,
      class: visited.has(pointKey(point))
        ? "curve-point visited"
        : "curve-point"
    });

    circle.append(svgElement("title", {}, formatPoint(point)));
    drawing.append(circle);
  }

  const current = animationIndex === 0
    ? null
    : animationSteps[animationIndex - 1].point;

  if (current !== null) {
    drawing.append(svgElement("circle", {
      cx: plotX(current.x),
      cy: plotY(current.y),
      r: 10,
      class: "current-ring"
    }));
  }

  plot.append(drawing);
  infinityIndicator.classList.toggle("active", current === null);

  if (animationIndex === 0) {
    animationStatus.textContent =
      "Start: R = O. Press Next step or Play to add G.";
  } else {
    const previous = animationIndex === 1
      ? null
      : animationSteps[animationIndex - 2].point;

    animationStatus.textContent =
      `Step ${animationIndex}/${animationSteps.length}: ` +
      `${formatPoint(previous)} + ${formatPoint(G)} = ` +
      `${formatPoint(current)}. ` +
      `Therefore ${animationIndex}G = ${formatPoint(current)}.`;
  }

  for (const [index, row] of [...tableBody.rows].entries()) {
    row.classList.toggle("active-step", index === animationIndex - 1);
  }

  const finished = animationIndex >= animationSteps.length;
  nextButton.disabled = finished;
  playButton.disabled = animationSteps.length === 0;
}

function advanceAnimation() {
  if (animationIndex < animationSteps.length) {
    animationIndex++;
    renderAnimation();
  }

  if (animationIndex >= animationSteps.length) {
    stopAnimation();
  }
}

function initializeAnimation(steps) {
  stopAnimation();
  animationSteps = steps;
  animationIndex = 0;
  renderAnimation();
}

nextButton.addEventListener("click", () => {
  stopAnimation();
  advanceAnimation();
});

resetButton.addEventListener("click", () => {
  initializeAnimation(animationSteps);
});

playButton.addEventListener("click", () => {
  if (animationTimer !== null) {
    stopAnimation();
    return;
  }

  // Se siamo alla fine, riparte dall'elemento neutro.
  if (animationIndex >= animationSteps.length) {
    animationIndex = 0;
    renderAnimation();
  }

  playButton.textContent = "Pause";
  animationTimer = setInterval(advanceAnimation, 800);
});
function updateExperiment() {
  stopAnimation();
  tableBody.replaceChildren();
  resultBox.textContent = "";
  errorBox.textContent = "";

  try {
    const k = keyInput.valueAsNumber;
    const steps = calculateMultiples(k);

    for (const step of steps) {
      const row = document.createElement("tr");

      const operation = step.multiple === 1
        ? "O + G"
        : `${step.multiple - 1}G + G`;

      const values = [
        `${step.multiple}G`,
        operation,
        formatPoint(step.point)
      ];

      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }

      tableBody.appendChild(row);
    }

    const publicKey = steps[steps.length - 1].point;

    if (publicKey === null) {
      resultBox.textContent =
        `Q = ${k}G = O (point at infinity). ` +
        "This scalar produces the identity, which is not a valid public key.";
    } else {
      resultBox.textContent =
        `TOY PUBLIC KEY: Q = ${k}G = ${formatPoint(publicKey)}`;
    }
    initializeAnimation(steps);
  } catch (error) {
    errorBox.textContent = error.message;
    initializeAnimation([]);
  }
}

keyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateExperiment();
});

// Mostra subito l'esempio iniziale k = 6.
updateExperiment();
// ---------- Statistical exploration ----------

const statisticsBase = document.querySelector("#statistics-base");

// Enumera il sottogruppo fino al primo ritorno a O.
function enumerateSubgroup(base) {
  const outputs = [];
  let point = null;

  // L'ordine non può superare il numero totale di punti.
  const maximumOrder = curvePoints.length + 1;

  for (let k = 1; k <= maximumOrder; k++) {
    point = addPoints(point, base);

    if (point === null) {
      return { order: k, outputs };
    }

    outputs.push({ k, point });
  }

  throw new Error("Could not determine the base point order.");
}

function coordinateFrequencies(outputs, coordinate) {
  const counts = Array(P).fill(0);

  for (const { point } of outputs) {
    counts[point[coordinate]]++;
  }

  return counts;
}

function renderFrequencies(containerId, counts, maximum) {
  const container = document.getElementById(containerId);
  container.replaceChildren();

  const scale = document.createElement("p");
  scale.className = "frequency-scale";
  scale.textContent =
    `Coordinate value → count. Both charts use a scale from 0 to ${maximum}.`;
  container.append(scale);

  counts.forEach((count, value) => {
    const row = document.createElement("div");
    row.className = "frequency-row";
    row.setAttribute(
      "aria-label",
      `Coordinate ${value}: ${count} occurrences`
    );

    const label = document.createElement("span");
    label.textContent = value;

    const track = document.createElement("div");
    track.className = "frequency-track";
    track.setAttribute("aria-hidden", "true");

    const bar = document.createElement("div");
    bar.className = "frequency-bar";
    bar.style.width = `${100 * count / maximum}%`;
    track.append(bar);

    const total = document.createElement("span");
    total.textContent = count;

    row.append(label, track, total);
    container.append(row);
  });
}

function pearsonCorrelation(a, b) {
  const mean = values =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const meanA = mean(a);
  const meanB = mean(b);

  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;

  for (let i = 0; i < a.length; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;

    covariance += da * db;
    varianceA += da ** 2;
    varianceB += db ** 2;
  }

  const denominator = Math.sqrt(varianceA * varianceB);

  return denominator === 0 ? null : covariance / denominator;
}

// Conta i bit uguali a 1.
function countOnes(value) {
  let count = 0;

  while (value > 0) {
    count += value & 1;
    value >>>= 1;
  }

  return count;
}

function analyzeBitFlips(outputs, order) {
  const pointByKey = new Map(
    outputs.map(({ k, point }) => [k, point])
  );

  const keyWidth = (order - 1).toString(2).length;
  const distances = [];

  for (const { k, point } of outputs) {
    for (let bit = 0; bit < keyWidth; bit++) {
      const changedKey = k ^ (1 << bit);

      // Esclude chiavi non valide e conta ogni coppia una volta.
      if (changedKey <= k || changedKey >= order) continue;

      const changedPoint = pointByKey.get(changedKey);

      const distance =
        countOnes(point.x ^ changedPoint.x) +
        countOnes(point.y ^ changedPoint.y);

      distances.push(distance);
    }
  }

  return distances;
}

function updateStatistics() {
  const [x, y] = statisticsBase.value.split(",").map(Number);
  const base = { x, y };
  const { order, outputs } = enumerateSubgroup(base);
  const sampleSize = outputs.length;

  document.querySelector("#statistics-summary").textContent =
    `Base ${formatPoint(base)} has order n = ${order}. ` +
    `We analyze all ${sampleSize} distinct non-identity outputs ` +
    `for k = 1,…,${order - 1}. This is a complete enumeration, ` +
    `not a random sample.`;

  const xCounts = coordinateFrequencies(outputs, "x");
  const yCounts = coordinateFrequencies(outputs, "y");
  const maximum = Math.max(...xCounts, ...yCounts);

  renderFrequencies("x-frequency", xCounts, maximum);
  renderFrequencies("y-frequency", yCounts, maximum);

  // Frequenze dei bit delle coordinate.
  const bitTable = document.querySelector("#bit-statistics");
  bitTable.replaceChildren();

  for (let bit = 0; bit < 5; bit++) {
    const percentage = coordinate => {
      const ones = outputs.reduce(
        (sum, { point }) => sum + ((point[coordinate] >> bit) & 1),
        0
      );

      return `${(100 * ones / sampleSize).toFixed(1)}%`;
    };

    const row = document.createElement("tr");

    for (const value of [bit, percentage("x"), percentage("y")]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }

    bitTable.append(row);
  }

  const keys = outputs.map(output => output.k);
  const xs = outputs.map(output => output.point.x);
  const ys = outputs.map(output => output.point.y);

  const formatCorrelation = value =>
    value === null ? "undefined (zero variance)" : value.toFixed(3);

  document.querySelector("#correlation-result").textContent =
    `Pearson r(k, x) = ${formatCorrelation(pearsonCorrelation(keys, xs))}; ` +
    `r(k, y) = ${formatCorrelation(pearsonCorrelation(keys, ys))}. ` +
    `These coefficients describe the selected enumeration only.`;

  const distances = analyzeBitFlips(outputs, order);
  const avalancheResult = document.querySelector("#avalanche-result");

  if (distances.length === 0) {
    avalancheResult.textContent = "No valid one-bit pairs are available.";
    return;
  }

  const average =
    distances.reduce((sum, value) => sum + value, 0) / distances.length;

  avalancheResult.textContent =
    `${distances.length} distinct valid key pairs differ by one input bit. ` +
    `Mean output Hamming distance: ${average.toFixed(2)} of 10 bits ` +
    `(${(100 * average / 10).toFixed(1)}%). ` +
    `Minimum: ${Math.min(...distances)}; ` +
    `maximum: ${Math.max(...distances)}. ` +
    `Pairs leaving the valid key range are excluded, so this is a ` +
    `restricted comparison rather than an unrestricted avalanche test.`;
}

statisticsBase.addEventListener("change", updateStatistics);
updateStatistics();
