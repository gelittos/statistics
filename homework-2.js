"use strict";

const messageInput = document.querySelector("#message-input");
const shiftInput = document.querySelector("#caesar-shift");
const caesarButton = document.querySelector("#run-caesar");

const plaintextBox = document.querySelector("#caesar-plaintext");
const ciphertextBox = document.querySelector("#caesar-ciphertext");
const decryptedBox = document.querySelector("#caesar-decrypted");
const caesarStatus = document.querySelector("#caesar-status");

// Riporta qualsiasi intero nell'intervallo 0–25.
function mod26(value) {
  return ((value % 26) + 26) % 26;
}

// Controlla i caratteri ammessi e converte in maiuscolo.
function normalizeMessage(text) {
  if (/[^\x20-\x7E\r\n\t]/.test(text)) {
    throw new Error(
      "Use unaccented English letters, digits, spaces and ASCII punctuation."
    );
  }

  const normalized = text.toUpperCase();

  if (!/[A-Z]/.test(normalized)) {
    throw new Error("Enter a message containing at least one letter.");
  }

  return normalized;
}

// Applica uno spostamento alle lettere, lasciando invariato il resto.
function caesarTransform(text, shift) {
  return text.replace(/[A-Z]/g, letter => {
    const position = letter.charCodeAt(0) - 65;
    const shiftedPosition = mod26(position + shift);

    return String.fromCharCode(65 + shiftedPosition);
  });
}

function encryptCaesar(plaintext, shift) {
  return caesarTransform(plaintext, shift);
}

function decryptCaesar(ciphertext, shift) {
  return caesarTransform(ciphertext, -shift);
}

function clearCaesarResults() {
  plaintextBox.textContent = "";
  ciphertextBox.textContent = "";
  decryptedBox.textContent = "";
  caesarStatus.textContent = "Inputs changed. Run the experiment again.";
}

function runCaesarExperiment() {
  clearCaesarResults();
  caesarStatus.textContent = "";

  try {
    const plaintext = normalizeMessage(messageInput.value);
    const shift = shiftInput.valueAsNumber;

    if (!Number.isInteger(shift) || shift < 0 || shift > 25) {
      throw new Error("Choose an integer shift between 0 and 25.");
    }

    const ciphertext = encryptCaesar(plaintext, shift);
    const decrypted = decryptCaesar(ciphertext, shift);

    plaintextBox.textContent = plaintext;
    ciphertextBox.textContent = ciphertext;
    decryptedBox.textContent = decrypted;

    caesarStatus.textContent = decrypted === plaintext
      ? "Success: decryption exactly matches the normalized plaintext."
      : "Error: the decrypted message does not match.";
  } catch (error) {
    caesarStatus.textContent = error.message;
  }
}

caesarButton.addEventListener("click", runCaesarExperiment);
messageInput.addEventListener("input", clearCaesarResults);
shiftInput.addEventListener("input", clearCaesarResults);

runCaesarExperiment();

// ---------- Statistical cryptanalysis of Caesar ----------

const referenceInput = document.querySelector("#reference-corpus");
const evaluationInput = document.querySelector("#evaluation-corpus");
const referenceSource = document.querySelector("#reference-source");
const evaluationSource = document.querySelector("#evaluation-source");

const trainButton = document.querySelector("#train-caesar-model");
const attackButton = document.querySelector("#attack-current-caesar");
const evaluateButton = document.querySelector("#evaluate-caesar-attack");
const attackStatus = document.querySelector("#attack-status");

const frequencyBody = document.querySelector("#reference-frequencies");
const candidateBody = document.querySelector("#caesar-candidates");
const evaluationBody = document.querySelector("#caesar-evaluation-results");
const attackSummary = document.querySelector("#caesar-attack-summary");
const attackPlaintext = document.querySelector("#caesar-attack-plaintext");

let caesarModel = null;

// Conserva solo lettere ASCII, poi le converte in maiuscolo.
function lettersOnly(text) {
  return text.replace(/[^a-zA-Z]/g, "").toUpperCase();
}

function countLetters(text) {
  const counts = Array(26).fill(0);

  for (const letter of lettersOnly(text)) {
    counts[letter.charCodeAt(0) - 65]++;
  }

  return counts;
}

// Aggiunge una riga testuale a una tabella.
function appendTextRow(body, values) {
  const row = document.createElement("tr");

  for (const value of values) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }

  body.append(row);
}

function clearCurrentAttack() {
  candidateBody.replaceChildren();
  attackSummary.textContent = "";
  attackPlaintext.textContent = "";
}

function invalidateReferenceModel() {
  caesarModel = null;
  attackButton.disabled = true;
  evaluateButton.disabled = true;

  frequencyBody.replaceChildren();
  evaluationBody.replaceChildren();
  clearCurrentAttack();

  attackStatus.textContent =
    "Reference data changed. Build the frequency model again.";
}

function buildCaesarModel() {
  invalidateReferenceModel();

  try {
    const text = lettersOnly(referenceInput.value);
    const source = referenceSource.value.trim();

    if (text.length < 10000) {
      throw new Error(
        `The reference corpus contains ${text.length} letters; at least 10,000 are required.`
      );
    }

    if (!source) {
      throw new Error("Enter the reference corpus source.");
    }

    const counts = countLetters(text);

    // Add-one smoothing evita probabilità nulle.
    const probabilities = counts.map(
      count => (count + 1) / (text.length + 26)
    );

    caesarModel = {
      text,
      source,
      counts,
      probabilities
    };

    counts.forEach((count, index) => {
      appendTextRow(frequencyBody, [
        String.fromCharCode(65 + index),
        count,
        `${(100 * probabilities[index]).toFixed(3)}%`
      ]);
    });

    attackButton.disabled = false;
    evaluateButton.disabled = false;

    attackStatus.textContent =
      `Model built from ${text.length.toLocaleString("en-US")} letters. ` +
      `Source: ${source}`;
  } catch (error) {
    attackStatus.textContent = error.message;
  }
}

// Riceve soltanto il cifrato e il modello: non conosce la chiave vera.
function rankCaesarShifts(ciphertext, probabilities) {
  const encryptedCounts = countLetters(ciphertext);
  const total = encryptedCounts.reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    throw new Error("The ciphertext must contain at least one letter.");
  }

  const candidates = [];

  for (let shift = 0; shift < 26; shift++) {
    let score = 0;

    for (let letter = 0; letter < 26; letter++) {
      // Se la lettera decifrata è i, quella cifrata è i + shift.
      const observed = encryptedCounts[mod26(letter + shift)];
      const expected = total * probabilities[letter];

      score += (observed - expected) ** 2 / expected;
    }

    candidates.push({ shift, score });
  }

  return candidates.sort(
    (a, b) => a.score - b.score || a.shift - b.shift
  );
}

function attackCurrentCiphertext() {
  clearCurrentAttack();

  try {
    if (!caesarModel) {
      throw new Error("Build the reference model first.");
    }

    const ciphertext = ciphertextBox.textContent;

    if (!ciphertext) {
      throw new Error("Encrypt a message in section 1 first.");
    }

    const candidates = rankCaesarShifts(
      ciphertext,
      caesarModel.probabilities
    );

    const best = candidates[0];
    const recovered = decryptCaesar(ciphertext, best.shift);

    for (const candidate of candidates.slice(0, 5)) {
      appendTextRow(candidateBody, [
        candidate.shift,
        candidate.score.toFixed(3),
        decryptCaesar(ciphertext, candidate.shift).slice(0, 100)
      ]);
    }

    attackPlaintext.textContent = recovered;

    // La chiave vera viene letta solo dopo la scelta della candidata.
    const actualShift = shiftInput.valueAsNumber;
    const correct = best.shift === actualShift;

    attackSummary.textContent =
      `Predicted shift: ${best.shift}. ` +
      `Actual shift: ${actualShift}. ` +
      `Key recovery: ${correct ? "correct" : "incorrect"}.`;

    attackStatus.textContent =
      "Attack complete. The known key was used only to check the prediction.";
  } catch (error) {
    attackStatus.textContent = error.message;
  }
}

// Intero uniforme in 0,…,maximum-1, senza distorsione da modulo.
function randomIntegerBelow(maximum) {
  const range = 2 ** 32;
  const limit = range - (range % maximum);
  const buffer = new Uint32Array(1);

  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);

  return buffer[0] % maximum;
}

async function evaluateCaesarAttack() {
  evaluationBody.replaceChildren();

  if (!caesarModel) {
    attackStatus.textContent = "Build the reference model first.";
    return;
  }

  const evaluationText = lettersOnly(evaluationInput.value);
  const source = evaluationSource.value.trim();

  if (evaluationText.length < 2500) {
    attackStatus.textContent =
      `The evaluation text contains ${evaluationText.length} letters; ` +
      "at least 2,500 are required.";
    return;
  }

  if (!source) {
    attackStatus.textContent = "Enter the evaluation text source.";
    return;
  }

  if (
    caesarModel.text.includes(evaluationText) ||
    evaluationText.includes(caesarModel.text)
  ) {
    attackStatus.textContent =
      "The texts contain one another. Use a separate evaluation text.";
    return;
  }

  const model = caesarModel;
  const lengths = [20, 50, 100, 200, 500];
  const trials = 100;

  const controls = [
    referenceInput,
    evaluationInput,
    referenceSource,
    evaluationSource,
    trainButton,
    attackButton,
    evaluateButton
  ];

  controls.forEach(control => {
    control.disabled = true;
  });

  try {
    for (const length of lengths) {
      let correct = 0;

      for (let trial = 0; trial < trials; trial++) {
        const start = randomIntegerBelow(
          evaluationText.length - length + 1
        );

        const plaintext = evaluationText.slice(start, start + length);
        const actualShift = randomIntegerBelow(26);
        const ciphertext = encryptCaesar(plaintext, actualShift);

        const best = rankCaesarShifts(
          ciphertext,
          model.probabilities
        )[0];

        if (best.shift === actualShift) {
          correct++;
        }

        if ((trial + 1) % 20 === 0) {
          attackStatus.textContent =
            `Testing ${length} letters: ${trial + 1}/${trials} trials…`;

          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      appendTextRow(evaluationBody, [
        length,
        `${correct}/${trials}`,
        `${(100 * correct / trials).toFixed(1)}%`
      ]);
    }

    attackStatus.textContent =
      `Evaluation complete: ${trials} trials for each length. ` +
      `Reference: ${model.source}. Evaluation: ${source}. ` +
      "Random extracts may overlap; results may vary between runs.";
  } catch (error) {
    attackStatus.textContent = error.message;
  } finally {
    controls.forEach(control => {
      control.disabled = false;
    });
  }
}

trainButton.addEventListener("click", buildCaesarModel);
attackButton.addEventListener("click", attackCurrentCiphertext);
evaluateButton.addEventListener("click", evaluateCaesarAttack);

referenceInput.addEventListener("input", invalidateReferenceModel);
referenceSource.addEventListener("input", invalidateReferenceModel);

for (const field of [evaluationInput, evaluationSource]) {
  field.addEventListener("input", () => {
    evaluationBody.replaceChildren();
    attackStatus.textContent =
      "Evaluation data changed. Run the length experiment again.";
  });
}

messageInput.addEventListener("input", clearCurrentAttack);
shiftInput.addEventListener("input", clearCurrentAttack);
caesarButton.addEventListener("click", clearCurrentAttack);
