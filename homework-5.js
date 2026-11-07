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
