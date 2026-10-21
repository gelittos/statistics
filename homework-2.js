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
