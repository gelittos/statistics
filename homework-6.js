"use strict";

// Dataset sintetico: una riga per persona.
const independenceData = [];

function addSyntheticPeople(training, outcome, count) {
  for (let i = 0; i < count; i++) {
    independenceData.push({
      id: independenceData.length + 1,
      X: training,
      F: outcome
    });
  }
}

addSyntheticPeople("None", "Clicked", 28);
addSyntheticPeople("None", "Not clicked", 12);

addSyntheticPeople("Basic", "Clicked", 20);
addSyntheticPeople("Basic", "Not clicked", 20);

addSyntheticPeople("Advanced", "Clicked", 12);
addSyntheticPeople("Advanced", "Not clicked", 28);

// Ricava le categorie direttamente dai dati.
// Set elimina i duplicati, conservando l'ordine di comparsa.
const trainingCategories = [
  ...new Set(independenceData.map(record => record.X))
];

const outcomeCategories = [
  ...new Set(independenceData.map(record => record.F))
];

// Costruisce una matrice inizialmente piena di zeri.
const observedCounts = trainingCategories.map(() =>
  outcomeCategories.map(() => 0)
);

// Ogni osservazione incrementa esattamente una cella.
for (const record of independenceData) {
  const row = trainingCategories.indexOf(record.X);
  const column = outcomeCategories.indexOf(record.F);

  observedCounts[row][column]++;
}

// Totali di riga.
const rowTotals = observedCounts.map(row =>
  row.reduce((sum, count) => sum + count, 0)
);

// Totali di colonna.
const columnTotals = outcomeCategories.map((_, column) =>
  observedCounts.reduce(
    (sum, row) => sum + row[column],
    0
  )
);

const sampleSize = independenceData.length;

// Crea una cella con testo, evitando di interpretarlo come HTML.
function makeIndependenceCell(tag, value, scope = null) {
  const cell = document.createElement(tag);
  cell.textContent = String(value);

  if (scope !== null) {
    cell.setAttribute("scope", scope);
  }

  return cell;
}

function renderIndividualRecords() {
  const body = document.querySelector("#independence-records");
  body.replaceChildren();

  for (const record of independenceData) {
    const row = document.createElement("tr");

    row.append(
      makeIndependenceCell("th", record.id, "row"),
      makeIndependenceCell("td", record.X),
      makeIndependenceCell("td", record.F)
    );

    body.append(row);
  }

  document.querySelector("#dataset-summary").textContent =
    `${sampleSize} observations; ` +
    `${trainingCategories.length} training categories; ` +
    `${outcomeCategories.length} outcome categories.`;
}

function renderObservedContingency() {
  const head = document.querySelector("#contingency-head");
  const body = document.querySelector("#contingency-body");
  const foot = document.querySelector("#contingency-foot");

  head.replaceChildren();
  body.replaceChildren();
  foot.replaceChildren();

  const headerRow = document.createElement("tr");

  headerRow.append(
    makeIndependenceCell("th", "Training", "col")
  );

  for (const outcome of outcomeCategories) {
    headerRow.append(
      makeIndependenceCell("th", outcome, "col")
    );
  }

  headerRow.append(
    makeIndependenceCell("th", "Total", "col")
  );

  head.append(headerRow);

  for (let i = 0; i < trainingCategories.length; i++) {
    const row = document.createElement("tr");

    row.append(
      makeIndependenceCell("th", trainingCategories[i], "row")
    );

    for (const count of observedCounts[i]) {
      row.append(makeIndependenceCell("td", count));
    }

    row.append(makeIndependenceCell("td", rowTotals[i]));
    body.append(row);
  }

  const totalRow = document.createElement("tr");

  totalRow.append(
    makeIndependenceCell("th", "Total", "row")
  );

  for (const total of columnTotals) {
    totalRow.append(makeIndependenceCell("td", total));
  }

  totalRow.append(makeIndependenceCell("td", sampleSize));
  foot.append(totalRow);

  const rowSum = rowTotals.reduce((sum, value) => sum + value, 0);
  const columnSum = columnTotals.reduce(
    (sum, value) => sum + value,
    0
  );

  const totalsMatch =
    rowSum === sampleSize && columnSum === sampleSize;

  document.querySelector("#contingency-check").textContent =
    totalsMatch
      ? `Check passed: row and column totals both equal n = ${sampleSize}.`
      : "Check failed: the totals are inconsistent.";
}

renderIndividualRecords();
renderObservedContingency();
// Converte una proporzione in una percentuale visualizzabile.
function formatIndependencePercent(proportion) {
  return `${(100 * proportion).toFixed(2)}%`;
}

// Crea l'intestazione condivisa dalle tre nuove tabelle.
function renderFrequencyHeader(selector, includeTotal = false) {
  const head = document.querySelector(selector);
  head.replaceChildren();

  const row = document.createElement("tr");

  row.append(
    makeIndependenceCell("th", "Training", "col")
  );

  for (const outcome of outcomeCategories) {
    row.append(
      makeIndependenceCell("th", outcome, "col")
    );
  }

  if (includeTotal) {
    row.append(
      makeIndependenceCell("th", "Total", "col")
    );
  }

  head.append(row);
}

function renderJointFrequencies() {
  renderFrequencyHeader("#joint-frequency-head", true);

  const body = document.querySelector("#joint-frequency-body");
  const foot = document.querySelector("#joint-frequency-foot");

  body.replaceChildren();
  foot.replaceChildren();

  for (let i = 0; i < trainingCategories.length; i++) {
    const row = document.createElement("tr");

    row.append(
      makeIndependenceCell("th", trainingCategories[i], "row")
    );

    for (const count of observedCounts[i]) {
      row.append(
        makeIndependenceCell(
          "td",
          formatIndependencePercent(count / sampleSize)
        )
      );
    }

    row.append(
      makeIndependenceCell(
        "td",
        formatIndependencePercent(rowTotals[i] / sampleSize)
      )
    );

    body.append(row);
  }

  const totalRow = document.createElement("tr");

  totalRow.append(
    makeIndependenceCell("th", "Total", "row")
  );

  for (const total of columnTotals) {
    totalRow.append(
      makeIndependenceCell(
        "td",
        formatIndependencePercent(total / sampleSize)
      )
    );
  }

  totalRow.append(
    makeIndependenceCell("td", formatIndependencePercent(1))
  );

  foot.append(totalRow);
}

function renderConditionalFrequencies(condition) {
  const givenTraining = condition === "training";

  const prefix = givenTraining
    ? "outcome-given-training"
    : "training-given-outcome";

  renderFrequencyHeader(`#${prefix}-head`);

  const body = document.querySelector(`#${prefix}-body`);
  body.replaceChildren();

  for (let i = 0; i < trainingCategories.length; i++) {
    const row = document.createElement("tr");

    row.append(
      makeIndependenceCell("th", trainingCategories[i], "row")
    );

    for (let j = 0; j < outcomeCategories.length; j++) {
      const denominator = givenTraining
        ? rowTotals[i]
        : columnTotals[j];

      const value = denominator > 0
        ? formatIndependencePercent(
            observedCounts[i][j] / denominator
          )
        : "Undefined";

      row.append(makeIndependenceCell("td", value));
    }

    body.append(row);
  }
}

function renderConditionalComment() {
  const clickedColumn = outcomeCategories.indexOf("Clicked");
  const comment = document.querySelector(
    "#conditional-frequency-comment"
  );

  if (clickedColumn === -1) {
    comment.textContent =
      "Compare the conditional distributions with the marginal distribution.";
    return;
  }

  const overallRate =
    columnTotals[clickedColumn] / sampleSize;

  const conditionalRates = trainingCategories.map((training, i) => {
    const rate = observedCounts[i][clickedColumn] / rowTotals[i];

    return `${training}: ${formatIndependencePercent(rate)}`;
  });

  comment.textContent =
    `The overall click frequency is ` +
    `${formatIndependencePercent(overallRate)}. ` +
    `Within training categories, the click frequencies are ` +
    `${conditionalRates.join("; ")}. ` +
    `The empirical conditional distributions differ from ` +
    `the overall distribution, so the empirical joint ` +
    `distribution does not satisfy exact independence.`;
}

renderJointFrequencies();
renderConditionalFrequencies("training");
renderConditionalFrequencies("outcome");
renderConditionalComment();
const independenceAlpha = 0.05;

function calculateIndependenceTest() {
  const rows = trainingCategories.length;
  const columns = outcomeCategories.length;

  if (sampleSize === 0 || rows < 2 || columns < 2) {
    throw new Error(
      "The test requires observations and at least two categories per variable."
    );
  }

  const expected = [];
  const contributions = [];

  let chiSquare = 0;
  let minimumExpected = Infinity;

  for (let i = 0; i < rows; i++) {
    const expectedRow = [];
    const contributionRow = [];

    for (let j = 0; j < columns; j++) {
      const expectedCount =
        rowTotals[i] * columnTotals[j] / sampleSize;

      if (expectedCount <= 0) {
        throw new Error(
          "Expected counts must be positive. Remove empty categories."
        );
      }

      const difference =
        observedCounts[i][j] - expectedCount;

      const contribution =
        difference ** 2 / expectedCount;

      expectedRow.push(expectedCount);
      contributionRow.push(contribution);

      chiSquare += contribution;

      minimumExpected = Math.min(
        minimumExpected,
        expectedCount
      );
    }

    expected.push(expectedRow);
    contributions.push(contributionRow);
  }

  const degreesOfFreedom = (rows - 1) * (columns - 1);

  // Questa formula vale soltanto con due gradi di libertà.
  const pValue = degreesOfFreedom === 2
    ? Math.exp(-chiSquare / 2)
    : null;

  return {
    expected,
    contributions,
    chiSquare,
    degreesOfFreedom,
    pValue,
    minimumExpected
  };
}

function renderIndependenceMatrix(prefix, matrix) {
  renderFrequencyHeader(`#${prefix}-head`);

  const body = document.querySelector(`#${prefix}-body`);
  body.replaceChildren();

  for (let i = 0; i < trainingCategories.length; i++) {
    const row = document.createElement("tr");

    row.append(
      makeIndependenceCell("th", trainingCategories[i], "row")
    );

    for (const value of matrix[i]) {
      row.append(
        makeIndependenceCell("td", value.toFixed(4))
      );
    }

    body.append(row);
  }
}

function renderIndependenceTest() {
  const summaryBody = document.querySelector("#chi-summary-body");
  const assumptions = document.querySelector("#chi-assumptions");
  const decision = document.querySelector("#chi-decision");

  summaryBody.replaceChildren();
  assumptions.textContent = "";
  decision.textContent = "";

  try {
    const test = calculateIndependenceTest();

    renderIndependenceMatrix(
      "expected-counts",
      test.expected
    );

    renderIndependenceMatrix(
      "chi-contributions",
      test.contributions
    );

    const summary = [
      ["Observations n", sampleSize],
      ["Pearson chi-square", test.chiSquare.toFixed(4)],
      ["Degrees of freedom", test.degreesOfFreedom],
      ["Significance level α", independenceAlpha.toFixed(2)],
      [
        "Asymptotic p-value",
        test.pValue === null
          ? "Not computed: this implementation requires df = 2."
          : test.pValue.toPrecision(6)
      ],
      ["Minimum expected count", test.minimumExpected.toFixed(4)]
    ];

    for (const [label, value] of summary) {
      const row = document.createElement("tr");

      row.append(
        makeIndependenceCell("th", label, "row"),
        makeIndependenceCell("td", value)
      );

      summaryBody.append(row);
    }

    const adequateExpectedCounts = test.minimumExpected >= 5;

    assumptions.textContent =
      (adequateExpectedCounts
        ? "All expected counts are at least 5. "
        : "Some expected counts are below 5; the chi-square approximation may be unreliable. ") +
      "Population inference also requires independent observations " +
      "and an appropriate sampling design. These conditions " +
      "cannot be established from the contingency table alone.";

    if (test.pValue === null) {
      decision.textContent =
        "The statistic has been computed, but no p-value-based " +
        "decision is reported for these degrees of freedom.";
    } else if (!adequateExpectedCounts) {
      decision.textContent =
        "The asymptotic p-value is shown for reference. " +
        "No automatic decision is reported because the " +
        "conservative expected-count check was not met.";
    } else if (test.pValue < independenceAlpha) {
      decision.textContent =
        "Under the test assumptions, this p-value would lead " +
        "to rejection of H₀ at α = 0.05. The observed counts " +
        "provide evidence against independence in that model. " +
        "Here, the association is deliberately built into synthetic data.";
    } else {
      decision.textContent =
        "Under the test assumptions, H₀ would not be rejected " +
        "at α = 0.05. This does not prove independence: the data " +
        "may contain an association that the test cannot detect.";
    }
  } catch (error) {
    decision.textContent = error.message;
  }
}

renderIndependenceTest();
