"use strict";

const integrationForm = document.querySelector("#integration-form");
const integrationFunctionInput =
  document.querySelector("#integration-function");
const domainIntervalsInput = document.querySelector("#domain-intervals");
const valueBandsInput = document.querySelector("#value-bands");

const integrationStatus = document.querySelector("#integration-status");
const integrationDescription =
  document.querySelector("#integration-description");
const integrationResults = document.querySelector("#integration-results");
const integrationBounds = document.querySelector("#integration-bounds");
const integrationCost = document.querySelector("#integration-cost");

// measureAtMost(y) restituisce la lunghezza dell'insieme
// {x nel dominio : f(x) <= y}.
const integrationFunctions = {
    singular: {
    label:
      "f(x) = 1/√x on [0.0001, 1]. " +
      "The reference here is the truncated integral, 1.98. " +
      "The omitted area on (0, 0.0001) is 0.02; " +
      "the full improper integral is 2.",

    a: 0.0001,
    b: 1,
    minValue: 1,
    maxValue: 100,
    exact: 2 * (1 - Math.sqrt(0.0001)),

    evaluate: x => 1 / Math.sqrt(x),

    measureAtMost(y) {
      if (y <= 1) return 0;
      if (y >= 100) return 1 - 0.0001;

      return 1 - 1 / (y * y);
    }
  },
  square: {
    label: "f(x) = x² on [0, 1]",
    a: 0,
    b: 1,
    minValue: 0,
    maxValue: 1,
    exact: 1 / 3,
    evaluate: x => x * x,

    measureAtMost(y) {
      if (y < 0) return 0;
      if (y >= 1) return 1;
      return Math.sqrt(y);
    }
  },

  sine: {
    label: "f(x) = sin(x) on [0, π]",
    a: 0,
    b: Math.PI,
    minValue: 0,
    maxValue: 1,
    exact: 2,
    evaluate: x => Math.sin(x),

    measureAtMost(y) {
      if (y <= 0) return 0;
      if (y >= 1) return Math.PI;
      return 2 * Math.asin(y);
    }
  },

  step: {
    label: "f(x) = 1 for x < 0.5 and 3 otherwise, on [0, 1]",
    a: 0,
    b: 1,
    minValue: 1,
    maxValue: 3,
    exact: 2,
    evaluate: x => x < 0.5 ? 1 : 3,

    measureAtMost(y) {
      if (y < 1) return 0;
      if (y < 3) return 0.5;
      return 1;
    }
  },

  absolute: {
    label: "f(x) = |x − 0.5| on [0, 1]",
    a: 0,
    b: 1,
    minValue: 0,
    maxValue: 0.5,
    exact: 0.25,
    evaluate: x => Math.abs(x - 0.5),

    measureAtMost(y) {
      if (y <= 0) return 0;
      if (y >= 0.5) return 1;
      return 2 * y;
    }
  }
};

let integrationExperiment = null;

// Riemann: un rettangolo per ogni intervallo del dominio.
function integrateMidpoints(definition, N) {
  const dx = (definition.b - definition.a) / N;
  let sum = 0;

  for (let i = 0; i < N; i++) {
    const x = definition.a + (i + 0.5) * dx;
    sum += definition.evaluate(x);
  }

  return {
    value: sum * dx,
    functionEvaluations: N
  };
}

// Lebesgue-inspired: fasce di valori con controimmagini esatte.
// Prima fascia: [minValue, upper].
// Fasce successive: (lower, upper].
function integrateValueBands(definition, K) {
  const dy = (definition.maxValue - definition.minValue) / K;

  let lowerSum = 0;
  let upperSum = 0;
  let previousMeasure = 0;

  for (let j = 0; j < K; j++) {
    const lower = definition.minValue + j * dy;

    const upper = j === K - 1
      ? definition.maxValue
      : definition.minValue + (j + 1) * dy;

    const cumulativeMeasure = definition.measureAtMost(upper);
    const bandMeasure = cumulativeMeasure - previousMeasure;

    lowerSum += lower * bandMeasure;
    upperSum += upper * bandMeasure;

    previousMeasure = cumulativeMeasure;
  }

  return {
    value: (lowerSum + upperSum) / 2,
    lower: lowerSum,
    upper: upperSum,
    errorBound: (definition.b - definition.a) * dy / 2,
    measureEvaluations: K
  };
}

// Visualizza numeri molto piccoli senza arrotondarli tutti a zero.
function formatIntegrationNumber(value) {
  if (value === 0) return "0";

  if (Math.abs(value) < 1e-6) {
    return value.toExponential(4);
  }

  return value.toFixed(10);
}

function appendIntegrationRow(method, value, reference) {
  const row = document.createElement("tr");

  for (const text of [
    method,
    formatIntegrationNumber(value),
    formatIntegrationNumber(reference),
    formatIntegrationNumber(Math.abs(value - reference))
  ]) {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.appendChild(cell);
  }

  integrationResults.appendChild(row);
}

function invalidateIntegration() {
  integrationExperiment = null;
  integrationResults.replaceChildren();

  integrationDescription.textContent = "";
  integrationBounds.textContent = "";
  integrationCost.textContent = "";

  clearIntegrationComparison();

  integrationStatus.textContent =
    "Parameters changed. Compute the integrals again.";
}

function runIntegrationExperiment() {
  invalidateIntegration();

  try {
    const definition =
      integrationFunctions[integrationFunctionInput.value];

    const N = domainIntervalsInput.valueAsNumber;
    const K = valueBandsInput.valueAsNumber;

    if (!definition) {
      throw new Error("Choose a valid function.");
    }

    if (!Number.isInteger(N) || N < 1 || N > 10000) {
      throw new Error("Choose an integer N between 1 and 10000.");
    }

    if (!Number.isInteger(K) || K < 1 || K > 10000) {
      throw new Error("Choose an integer K between 1 and 10000.");
    }

    const riemann = integrateMidpoints(definition, N);
    const lebesgue = integrateValueBands(definition, K);

    integrationExperiment = {
      definition,
      N,
      K,
      riemann,
      lebesgue
    };

    appendIntegrationRow(
      "Riemann: midpoint rule",
      riemann.value,
      definition.exact
    );

    appendIntegrationRow(
      "Value bands: exact preimage measures",
      lebesgue.value,
      definition.exact
    );

    integrationDescription.textContent = definition.label;

    integrationBounds.textContent =
      `Value-band bounds: ` +
      `[${formatIntegrationNumber(lebesgue.lower)}, ` +
      `${formatIntegrationNumber(lebesgue.upper)}]. ` +
      `Theoretical absolute-error bound: ` +
      `${formatIntegrationNumber(lebesgue.errorBound)}.`;

    integrationCost.textContent =
      `Midpoint method: ${riemann.functionEvaluations} function evaluations. ` +
      `Value-band method: ${lebesgue.measureEvaluations} evaluations ` +
      `of the analytical preimage-measure formula. ` +
      `These are different operations, not directly comparable costs.`;

    integrationStatus.textContent =
      `Completed: ${N} domain intervals and ${K} value bands.`;
  } catch (error) {
    integrationStatus.textContent = error.message;
  }
}

integrationForm.addEventListener("submit", event => {
  event.preventDefault();
  runIntegrationExperiment();
});

integrationFunctionInput.addEventListener(
  "change",
  invalidateIntegration
);

domainIntervalsInput.addEventListener(
  "input",
  invalidateIntegration
);

valueBandsInput.addEventListener(
  "input",
  invalidateIntegration
);

runIntegrationExperiment();
// ---------- Convergence and timing comparison ----------

// Inserisce una riga nella tabella indicata.
function appendIntegrationComparisonRow(tableBody, values) {
  const row = document.createElement("tr");

  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = String(value);
    row.appendChild(cell);
  }

  tableBody.appendChild(row);
}

// Cancella i confronti precedenti.
function clearIntegrationComparison() {
  document.querySelector(
    "#integration-convergence-results"
  ).replaceChildren();

  document.querySelector(
    "#integration-timing-results"
  ).replaceChildren();

  document.querySelector(
    "#integration-comparison-status"
  ).textContent = "";
}

// Misura cinque gruppi di integrazioni.
// Restituisce il tempo mediano per una singola integrazione.
// Calibra le ripetizioni e misura cinque gruppi di integrazioni.
function benchmarkIntegration(operation, initialRepetitions) {
  const targetMilliseconds = 20;
  const maximumRepetitions = 1000000;

  let repetitions = Math.min(
    maximumRepetitions,
    Math.max(20, initialRepetitions)
  );

  // Riscaldamento iniziale.
  for (let i = 0; i < 20; i++) {
    operation();
  }

  // Esegue e misura un gruppo di integrazioni.
  function measureBatch(count) {
    let checksum = 0;
    const start = performance.now();

    for (let i = 0; i < count; i++) {
      checksum += operation().value;
    }

    return {
      milliseconds: performance.now() - start,
      checksum
    };
  }

  // Calibrazione: aumenta le ripetizioni finché il gruppo
  // dura abbastanza oppure viene raggiunto il limite.
  let calibration = measureBatch(repetitions);

  while (
    calibration.milliseconds < targetMilliseconds &&
    repetitions < maximumRepetitions
  ) {
    repetitions = Math.min(
      maximumRepetitions,
      repetitions * 2
    );

    calibration = measureBatch(repetitions);
  }

  // Misure effettive: la calibrazione non entra nella mediana.
  const batchTimes = [];
  let checksum = 0;

  for (let batch = 0; batch < 5; batch++) {
    const measurement = measureBatch(repetitions);

    batchTimes.push(measurement.milliseconds);
    checksum += measurement.checksum;
  }

  batchTimes.sort((a, b) => a - b);

  return {
    microseconds: batchTimes[2] * 1000 / repetitions,
    repetitions,
    medianBatchMilliseconds: batchTimes[2],
    targetReached: batchTimes[2] >= targetMilliseconds,
    checksum
  };
}

// Esegue il confronto per la funzione attualmente selezionata.
async function runIntegrationComparison() {
  clearIntegrationComparison();

  const status = document.querySelector(
    "#integration-comparison-status"
  );

  const accuracyTable = document.querySelector(
    "#integration-convergence-results"
  );

  const timingTable = document.querySelector(
    "#integration-timing-results"
  );

  const definition =
    integrationFunctions[integrationFunctionInput.value];

  if (!definition) {
    status.textContent = "Choose a valid function.";
    return;
  }

  // Evita modifiche ai parametri mentre il confronto è in corso.
  const controls = [
    ...integrationForm.querySelectorAll("input, select, button"),
    document.querySelector("#run-integration-comparison")
  ];

  const previousDisabledStates = controls.map(
    control => control.disabled
  );

  controls.forEach(control => {
    control.disabled = true;
  });

  try {
    const resolutions = [10, 30, 100, 300, 1000, 3000, 10000];

    for (const resolution of resolutions) {
      status.textContent =
        `${definition.label}. Testing N = K = ${resolution}…`;

      // Lascia al browser la possibilità di aggiornare la pagina.
      await new Promise(resolve => setTimeout(resolve, 0));

      const midpoint = integrateMidpoints(definition, resolution);
      const bands = integrateValueBands(definition, resolution);

      appendIntegrationComparisonRow(accuracyTable, [
        resolution,
        formatIntegrationNumber(midpoint.value),
        formatIntegrationNumber(
          Math.abs(midpoint.value - definition.exact)
        ),
        formatIntegrationNumber(bands.value),
        formatIntegrationNumber(
          Math.abs(bands.value - definition.exact)
        ),
        formatIntegrationNumber(bands.errorBound)
      ]);

      // Ripete maggiormente le integrazioni con pochi intervalli.
      const repetitions = Math.max(
        20,
        Math.ceil(100000 / resolution)
      );

      const midpointOperation = () =>
        integrateMidpoints(definition, resolution);

      const bandsOperation = () =>
        integrateValueBands(definition, resolution);

      let midpointTiming;
      let bandsTiming;

      // Alterna l'ordine per non misurare sempre lo stesso metodo prima.
      if (resolutions.indexOf(resolution) % 2 === 0) {
        midpointTiming = benchmarkIntegration(
          midpointOperation,
          repetitions
        );

        bandsTiming = benchmarkIntegration(
          bandsOperation,
          repetitions
        );
      } else {
        bandsTiming = benchmarkIntegration(
          bandsOperation,
          repetitions
        );

        midpointTiming = benchmarkIntegration(
          midpointOperation,
          repetitions
        );
      }

      // Controlla che i risultati calcolati siano numeri finiti.
      if (
        !Number.isFinite(midpointTiming.checksum) ||
        !Number.isFinite(bandsTiming.checksum)
      ) {
        throw new Error("A non-finite result occurred during timing.");
      }

      appendIntegrationComparisonRow(timingTable, [
        resolution,
      
        midpointTiming.microseconds.toFixed(3) +
          (midpointTiming.targetReached ? "" : " *"),
      
        bandsTiming.microseconds.toFixed(3) +
          (bandsTiming.targetReached ? "" : " *"),
      
        `${midpointTiming.repetitions} / ${bandsTiming.repetitions}`,
      
        `${midpointTiming.medianBatchMilliseconds.toFixed(1)} / ` +
          `${bandsTiming.medianBatchMilliseconds.toFixed(1)}`
      ]);
    }

    status.textContent =
      `Comparison completed for ${definition.label}. ` +
      `Timings are estimates from this browser session.`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    controls.forEach((control, index) => {
      control.disabled = previousDisabledStates[index];
    });
  }
}

document.querySelector("#run-integration-comparison").addEventListener(
  "click",
  runIntegrationComparison
);
// ---------- Dirichlet and Thomae ----------

// Massimo comune divisore con l'algoritmo di Euclide.
function integerGcd(a, b) {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a;
}

// Calcola le somme sui punti medi razionali (2i + 1)/(2N).
function computeRationalMidpointSums(N) {
  const denominator = 2 * N;
  let thomaeSum = 0;

  for (let i = 0; i < N; i++) {
    const numerator = 2 * i + 1;

    const divisor = integerGcd(numerator, denominator);
    const reducedDenominator = denominator / divisor;

    thomaeSum += 1 / reducedDenominator;
  }

  return {
    // Tutti i punti scelti sono razionali: D(xᵢ) = 1.
    dirichlet: 1,

    // Ogni sottointervallo ha larghezza 1/N.
    thomae: thomaeSum / N
  };
}

function runPathologicalExperiment() {
  const table = document.querySelector("#pathological-results");
  const status = document.querySelector("#pathological-status");

  table.replaceChildren();

  const resolutions = [
    10, 30, 100, 300, 1000, 3000, 10000
  ];

  for (const N of resolutions) {
    const result = computeRationalMidpointSums(N);

    appendIntegrationComparisonRow(table, [
      N,
      formatIntegrationNumber(result.dirichlet),
      formatIntegrationNumber(result.thomae)
    ]);
  }

  status.textContent =
    "Completed using exact integer fractions for the sample points. " +
    "Function values and sums are displayed in floating-point arithmetic.";
}

document.querySelector("#run-pathological-experiment").addEventListener(
  "click",
  runPathologicalExperiment
);
// ---------- Part 2: standard normal CDF ----------

const normalCdfForm = document.querySelector("#normal-cdf-form");
const normalCdfZInput = document.querySelector("#normal-cdf-z");
const normalCdfNInput = document.querySelector("#normal-cdf-intervals");

const normalCdfStatus = document.querySelector("#normal-cdf-status");
const normalCdfResults = document.querySelector("#normal-cdf-results");
const normalReferenceResults =
  document.querySelector("#normal-reference-results");
const normalCdfChecks = document.querySelector("#normal-cdf-checks");

// Area fra 0 e |z|, trascritta dalla tabella NIST.
// I valori pubblicati sono arrotondati a cinque decimali.
const normalReferenceAreas = [
  { z: 0, area: 0.00000 },
  { z: 0.5, area: 0.19146 },
  { z: 1, area: 0.34134 },
  { z: 1.5, area: 0.43319 },
  { z: 2, area: 0.47725 },
  { z: 2.5, area: 0.49379 },
  { z: 3, area: 0.49865 }
];

// Densità della normale standard.
function standardNormalPdf(t) {
  return Math.exp(-t * t / 2) / Math.sqrt(2 * Math.PI);
}

// Integra la densità da 0 a upper.
function integrateNormalDensity(upper, N, method) {
  if (upper === 0) {
    return { area: 0, evaluations: 0 };
  }

  const h = upper / N;
  let sum;

  if (method === "trapezoid") {
    sum = (
      standardNormalPdf(0) +
      standardNormalPdf(upper)
    ) / 2;

    for (let i = 1; i < N; i++) {
      sum += standardNormalPdf(i * h);
    }

    return {
      area: h * sum,
      evaluations: N + 1
    };
  }

  if (method === "simpson") {
    if (N % 2 !== 0) {
      throw new Error("Simpson's rule requires an even N.");
    }

    sum =
      standardNormalPdf(0) +
      standardNormalPdf(upper);

    for (let i = 1; i < N; i++) {
      const weight = i % 2 === 0 ? 2 : 4;
      sum += weight * standardNormalPdf(i * h);
    }

    return {
      area: h * sum / 3,
      evaluations: N + 1
    };
  }

  throw new Error("Unknown integration method.");
}

// Ricostruisce la CDF usando la simmetria.
function computeNormalCdf(z, N, method) {
  const integral = integrateNormalDensity(
    Math.abs(z),
    N,
    method
  );

  return {
    value: z >= 0
      ? 0.5 + integral.area
      : 0.5 - integral.area,

    evaluations: integral.evaluations
  };
}

// Costruisce i riferimenti positivi e negativi dalla tabella delle aree.
function buildNormalReferencePoints() {
  const points = [];

  for (const entry of normalReferenceAreas) {
    if (entry.z === 0) {
      points.push({ z: 0, cdf: 0.5 });
    } else {
      points.push({
        z: -entry.z,
        cdf: 0.5 - entry.area
      });

      points.push({
        z: entry.z,
        cdf: 0.5 + entry.area
      });
    }
  }

  return points.sort((a, b) => a.z - b.z);
}

function clearNormalCdfResults() {
  normalCdfResults.replaceChildren();
  normalReferenceResults.replaceChildren();

  normalCdfChecks.textContent = "";
  normalCdfStatus.textContent =
    "Parameters changed. Compute the probabilities again.";
}

function runNormalCdfExperiment() {
  clearNormalCdfResults();

  try {
    const z = normalCdfZInput.valueAsNumber;
    const N = normalCdfNInput.valueAsNumber;

    if (!Number.isFinite(z) || z < -4 || z > 4) {
      throw new Error("Choose a finite z between −4 and 4.");
    }

    if (
      !Number.isInteger(N) ||
      N < 2 ||
      N > 10000 ||
      N % 2 !== 0
    ) {
      throw new Error("Choose an even N between 2 and 10000.");
    }

    for (const method of ["trapezoid", "simpson"]) {
      const result = computeNormalCdf(z, N, method);

      appendIntegrationComparisonRow(normalCdfResults, [
        method === "trapezoid" ? "Trapezoidal rule" : "Simpson's rule",
        formatIntegrationNumber(result.value),
        result.evaluations
      ]);
    }

    const referencePoints = buildNormalReferencePoints();

    for (const point of referencePoints) {
      const trapezoid = computeNormalCdf(
        point.z, N, "trapezoid"
      ).value;

      const simpson = computeNormalCdf(
        point.z, N, "simpson"
      ).value;

      appendIntegrationComparisonRow(normalReferenceResults, [
        point.z,
        point.cdf.toFixed(5),
        formatIntegrationNumber(trapezoid),
        formatIntegrationNumber(Math.abs(trapezoid - point.cdf)),
        formatIntegrationNumber(simpson),
        formatIntegrationNumber(Math.abs(simpson - point.cdf))
      ]);
    }

    // Controlli su una griglia di punti fra −4 e 4.
    const checkPoints = Array.from(
      { length: 81 },
      (_, i) => -4 + i / 10
    );

    const checkMessages = [];

    for (const method of ["trapezoid", "simpson"]) {
      const values = checkPoints.map(
        point => computeNormalCdf(point, N, method).value
      );

      const inRange = values.every(
        value => Number.isFinite(value) && value >= 0 && value <= 1
      );

      const monotone = values.every(
        (value, index) =>
          index === 0 || value >= values[index - 1] - 1e-12
      );

      let symmetryError = 0;

      for (const point of [0.5, 1, 2, 3, 4]) {
        const positive = computeNormalCdf(point, N, method).value;
        const negative = computeNormalCdf(-point, N, method).value;

        symmetryError = Math.max(
          symmetryError,
          Math.abs(positive + negative - 1)
        );
      }

      checkMessages.push(
        `${method}: range ${inRange ? "PASS" : "FAIL"}, ` +
        `monotonicity on the test grid ${monotone ? "PASS" : "FAIL"}, ` +
        `maximum symmetry residual ` +
        `${formatIntegrationNumber(symmetryError)}`
      );
    }

    normalCdfChecks.textContent = checkMessages.join(". ");

    normalCdfStatus.textContent =
      `Completed with N = ${N}. ` +
      `The selected point and reference table use the same resolution.`;
  } catch (error) {
    normalCdfStatus.textContent = error.message;
  }
}

normalCdfForm.addEventListener("submit", event => {
  event.preventDefault();
  runNormalCdfExperiment();
});

normalCdfZInput.addEventListener("input", clearNormalCdfResults);
normalCdfNInput.addEventListener("input", clearNormalCdfResults);

runNormalCdfExperiment();
const normalConvergenceButton =
  document.querySelector("#run-normal-convergence");

const normalConvergenceStatus =
  document.querySelector("#normal-convergence-status");

const normalConvergenceResults =
  document.querySelector("#normal-convergence-results");

const normalConvergenceTiming =
  document.querySelector("#normal-convergence-timing");

const normalConvergenceExplanation =
  document.querySelector("#normal-convergence-explanation");

function clearNormalConvergence() {
  normalConvergenceResults.replaceChildren();
  normalConvergenceTiming.replaceChildren();
  normalConvergenceExplanation.textContent = "";
  normalConvergenceStatus.textContent = "";
}

// Limiti conservativi validi per le derivate della densità normale:
// |φ''(t)| ≤ 1 e |φ''''(t)| ≤ 4.
function normalIntegrationErrorBounds(z, intervals) {
  const length = Math.abs(z);
  const h = length / intervals;

  return {
    trapezoid: length * h ** 2 / 12,
    simpson: 4 * length * h ** 4 / 180
  };
}

async function runNormalConvergence() {
  clearNormalConvergence();

  const z = normalCdfZInput.valueAsNumber;

  if (!Number.isFinite(z) || z < -4 || z > 4) {
    normalConvergenceStatus.textContent =
      "Choose a finite value of z between -4 and 4.";
    return;
  }

  if (z === 0) {
    normalConvergenceStatus.textContent =
      "At z = 0, the CDF is exactly 0.5 by symmetry. " +
      "Choose a nonzero z to compare numerical integration methods.";
    return;
  }

  const controls = [
    normalConvergenceButton,
    ...normalCdfForm.querySelectorAll("input, button, select")
  ];

  const previousDisabledStates =
    controls.map(control => control.disabled);

  controls.forEach(control => {
    control.disabled = true;
  });

  try {
    const resolutions = [10, 30, 100, 300, 1000];

    for (const [index, intervals] of resolutions.entries()) {
      normalConvergenceStatus.textContent =
        `Computing z = ${z}, N = ${intervals}...`;

      // Consente al browser di aggiornare il messaggio.
      await new Promise(resolve => setTimeout(resolve, 0));

      const trapezoid =
        computeNormalCdf(z, intervals, "trapezoid");

      const simpson =
        computeNormalCdf(z, intervals, "simpson");

      const bounds =
        normalIntegrationErrorBounds(z, intervals);

      appendIntegrationComparisonRow(
        normalConvergenceResults,
        [
          intervals,
          formatIntegrationNumber(trapezoid.value),
          formatIntegrationNumber(bounds.trapezoid),
          formatIntegrationNumber(simpson.value),
          formatIntegrationNumber(bounds.simpson),
          trapezoid.evaluations
        ]
      );

      const initialRepetitions =
        Math.max(20, Math.ceil(100000 / intervals));

      const trapezoidOperation = () =>
        computeNormalCdf(z, intervals, "trapezoid");

      const simpsonOperation = () =>
        computeNormalCdf(z, intervals, "simpson");

      let trapezoidTiming;
      let simpsonTiming;

      // Alterna l'ordine per limitare gli effetti
      // sistematici dell'ordine di esecuzione.
      if (index % 2 === 0) {
        trapezoidTiming = benchmarkIntegration(
          trapezoidOperation,
          initialRepetitions
        );

        simpsonTiming = benchmarkIntegration(
          simpsonOperation,
          initialRepetitions
        );
      } else {
        simpsonTiming = benchmarkIntegration(
          simpsonOperation,
          initialRepetitions
        );

        trapezoidTiming = benchmarkIntegration(
          trapezoidOperation,
          initialRepetitions
        );
      }

      if (
        !Number.isFinite(trapezoidTiming.checksum) ||
        !Number.isFinite(simpsonTiming.checksum)
      ) {
        throw new Error("The timing calculation returned an invalid result.");
      }

      const formatTime = timing =>
        timing.microseconds.toFixed(3) +
        (timing.targetReached ? "" : " *");

      appendIntegrationComparisonRow(
        normalConvergenceTiming,
        [
          intervals,
          formatTime(trapezoidTiming),
          formatTime(simpsonTiming),
          `${trapezoidTiming.repetitions} / ` +
            `${simpsonTiming.repetitions}`,
          `${trapezoidTiming.medianBatchMilliseconds.toFixed(1)} / ` +
            `${simpsonTiming.medianBatchMilliseconds.toFixed(1)}`
        ]
      );
    }

    normalConvergenceExplanation.textContent =
      "The trapezoidal error bound decreases as 1/N², " +
      "whereas Simpson's bound decreases as 1/N⁴. " +
      "Both methods evaluate the density N + 1 times. " +
      "For this smooth integrand, Simpson's rule can therefore " +
      "reach a given accuracy with fewer intervals. " +
      "The bounds are conservative, not measured errors. " +
      "At very high resolutions, floating-point rounding " +
      "limits the benefit of further refinement.";

    normalConvergenceStatus.textContent =
      `Comparison completed at z = ${z}. ` +
      "All resolutions use the same evaluation point.";
  } catch (error) {
    normalConvergenceStatus.textContent = error.message;
  } finally {
    controls.forEach((control, index) => {
      control.disabled = previousDisabledStates[index];
    });
  }
}

normalConvergenceButton.addEventListener(
  "click",
  runNormalConvergence
);

normalCdfZInput.addEventListener(
  "input",
  clearNormalConvergence
);
