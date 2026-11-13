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
