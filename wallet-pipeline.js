"use strict";

const runButton = document.querySelector("#run-hash-experiment");
const statusBox = document.querySelector("#hash-status");
const resultsBody = document.querySelector("#hash-results");
const exampleBox = document.querySelector("#hash-example");

function onesInByte(value) {
  let count = 0;

  while (value !== 0) {
    count += value & 1;
    value >>>= 1;
  }

  return count;
}

function hammingDistance(a, b) {
  let distance = 0;

  for (let i = 0; i < a.length; i++) {
    distance += onesInByte(a[i] ^ b[i]);
  }

  return distance;
}

function addResult(label, value) {
  const row = document.createElement("tr");

  for (const text of [label, value]) {
    const cell = document.createElement("td");
    cell.textContent = text;
    row.append(cell);
  }

  resultsBody.append(row);
}

async function runExperiment() {
  resultsBody.replaceChildren();
  exampleBox.textContent = "";

  if (!window.ethers) {
    statusBox.textContent =
      "The hashing library did not load. Check the connection and reload.";
    return;
  }

  runButton.disabled = true;
  statusBox.textContent = "Running 500 trials…";

  try {
    // Verifica un vettore noto prima dell'esperimento.
    const expectedEmptyHash =
      "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";

    if (ethers.keccak256("0x") !== expectedEmptyHash) {
      throw new Error("Keccak-256 reference check failed.");
    }

    const trials = 500;
    const distances = [];
    let totalOnes = 0;

    for (let trial = 0; trial < trials; trial++) {
      const original = crypto.getRandomValues(new Uint8Array(32));
      const modified = new Uint8Array(original);

      // Un byte casuale seleziona uniformemente un bit tra 0 e 255.
      const bitIndex = crypto.getRandomValues(new Uint8Array(1))[0];
      const byteIndex = Math.floor(bitIndex / 8);
      const bitInByte = bitIndex % 8;

      modified[byteIndex] ^= 1 << bitInByte;

      const originalHash = ethers.keccak256(original);
      const modifiedHash = ethers.keccak256(modified);

      const originalBytes = ethers.getBytes(originalHash);
      const modifiedBytes = ethers.getBytes(modifiedHash);

      const distance = hammingDistance(originalBytes, modifiedBytes);
      distances.push(distance);

      for (const byte of originalBytes) {
        totalOnes += onesInByte(byte);
      }

      if (trial === 0) {
        exampleBox.textContent =
          `Original input:\n${ethers.hexlify(original)}\n\n` +
          `Modified input:\n${ethers.hexlify(modified)}\n\n` +
          `Changed bit: ${bitIndex} ` +
          `(byte ${byteIndex}, bit ${bitInByte}; zero-based, LSB first)\n\n` +
          `Original hash:\n${originalHash}\n\n` +
          `Modified hash:\n${modifiedHash}\n\n` +
          `Output Hamming distance: ${distance}/256`;
      }

      // Consente al browser di aggiornare l'interfaccia.
      if ((trial + 1) % 50 === 0) {
        statusBox.textContent = `Completed ${trial + 1}/${trials} trials…`;
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const mean =
      distances.reduce((sum, value) => sum + value, 0) / trials;

    const sampleVariance =
      distances.reduce(
        (sum, value) => sum + (value - mean) ** 2,
        0
      ) / (trials - 1);

    addResult("Trials", trials);
    addResult("Mean changed output bits", `${mean.toFixed(2)} / 256`);
    addResult("Mean changed percentage", `${(100 * mean / 256).toFixed(2)}%`);
    addResult("Sample standard deviation", Math.sqrt(sampleVariance).toFixed(2));
    addResult("Minimum distance", Math.min(...distances));
    addResult("Maximum distance", Math.max(...distances));
    addResult(
      "Ones in original-message digests",
      `${(100 * totalOnes / (trials * 256)).toFixed(2)}%`
    );

    statusBox.textContent =
      "Experiment complete. Random inputs produce different results on each run.";
  } catch (error) {
    statusBox.textContent = `Experiment failed: ${error.message}`;
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", runExperiment);
