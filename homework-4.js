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
