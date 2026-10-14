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

function updateExperiment() {
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
  } catch (error) {
    errorBox.textContent = error.message;
  }
}

keyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateExperiment();
});

// Mostra subito l'esempio iniziale k = 6.
updateExperiment();
