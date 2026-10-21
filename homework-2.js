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

// ---------- Hybrid encryption: secp256k1 + HKDF + AES-GCM ----------

const eccPrivateInput = document.querySelector("#ecc-private-key");
const eccButton = document.querySelector("#run-ecc");
const eccStatus = document.querySelector("#ecc-status");
const eccPlaintextBox = document.querySelector("#ecc-plaintext");
const eccPublicBox = document.querySelector("#ecc-public-key");
const eccPackageBox = document.querySelector("#ecc-package");
const eccDecryptedBox = document.querySelector("#ecc-decrypted");

// Ordine del punto base di secp256k1, non il modulo del campo.
const SECP256K1_ORDER =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

const ECC_MAX_PRIVATE = 1000;
const ECC_CONTEXT = "statistics-homework2-ecdh-hkdf-aesgcm-v1";

// Conterrà solo dati pubblici utili al successivo attacco.
let eccPublicExperiment = null;

// Converte uno scalare in una rappresentazione esadecimale di 32 byte.
function scalarToHex(scalar) {
  return ethers.toBeHex(BigInt(scalar), 32);
}

// Estrae uno scalare nell'intero intervallo valido, senza bias da modulo.
function randomFullScalar() {
  while (true) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const scalar = BigInt(ethers.hexlify(bytes));

    if (scalar > 0n && scalar < SECP256K1_ORDER) {
      return scalarToHex(scalar);
    }
  }
}

// Deriva una chiave AES dalla coordinata x del punto ECDH condiviso.
async function deriveEccAesKey(
  privateKeyHex,
  peerPublicKey,
  saltHex,
  recipientPublicKey,
  ephemeralPublicKey
) {
  const localKey = new ethers.SigningKey(privateKeyHex);

  // ethers restituisce il punto condiviso non compresso: 04 || x || y.
  const sharedPoint = localKey.computeSharedSecret(peerPublicKey);
  const sharedX = ethers.getBytes(
    ethers.dataSlice(sharedPoint, 1, 33)
  );

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    sharedX,
    "HKDF",
    false,
    ["deriveKey"]
  );

  // Associa la derivazione a questo esperimento e alle due chiavi pubbliche.
  const info = ethers.getBytes(
    ethers.concat([
      ethers.toUtf8Bytes(ECC_CONTEXT),
      recipientPublicKey,
      ephemeralPublicKey
    ])
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: ethers.getBytes(saltHex),
      info
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Il mittente riceve soltanto il messaggio e la chiave PUBBLICA.
async function encryptEccMessage(plaintext, recipientPublicKey) {
  const ephemeralPrivateKey = randomFullScalar();
  const ephemeralKey = new ethers.SigningKey(ephemeralPrivateKey);

  const ephemeralPublicKey = ephemeralKey.compressedPublicKey;
  const salt = ethers.hexlify(
    crypto.getRandomValues(new Uint8Array(32))
  );
  const iv = ethers.hexlify(
    crypto.getRandomValues(new Uint8Array(12))
  );

  const aesKey = await deriveEccAesKey(
    ephemeralPrivateKey,
    recipientPublicKey,
    salt,
    recipientPublicKey,
    ephemeralPublicKey
  );

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ethers.getBytes(iv),
      additionalData: ethers.toUtf8Bytes(ECC_CONTEXT),
      tagLength: 128
    },
    aesKey,
    ethers.toUtf8Bytes(plaintext)
  );

  // Web Crypto restituisce il testo cifrato seguito dal tag.
  return {
    ephemeralPublicKey,
    salt,
    iv,
    ciphertextAndTag: ethers.hexlify(new Uint8Array(encrypted))
  };
}

// Il destinatario usa la propria chiave PRIVATA e il pacchetto ricevuto.
async function decryptEccMessage(privateKeyHex, packet) {
  const recipientKey = new ethers.SigningKey(privateKeyHex);
  const recipientPublicKey = recipientKey.compressedPublicKey;

  const aesKey = await deriveEccAesKey(
    privateKeyHex,
    packet.ephemeralPublicKey,
    packet.salt,
    recipientPublicKey,
    packet.ephemeralPublicKey
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ethers.getBytes(packet.iv),
      additionalData: ethers.toUtf8Bytes(ECC_CONTEXT),
      tagLength: 128
    },
    aesKey,
    ethers.getBytes(packet.ciphertextAndTag)
  );

  return new TextDecoder("utf-8", { fatal: true }).decode(decrypted);
}

function clearEccResults() {
  eccPublicExperiment = null;

  eccPlaintextBox.textContent = "";
  eccPublicBox.textContent = "";
  eccPackageBox.textContent = "";
  eccDecryptedBox.textContent = "";

  eccStatus.textContent =
    "Inputs changed. Run the ECC experiment again.";
}

async function runEccExperiment() {
  clearEccResults();

  if (!window.ethers || !window.crypto?.subtle) {
    eccStatus.textContent =
      "This experiment needs ethers.js and Web Crypto. " +
      "Open the HTTPS site and check that the library loaded.";
    return;
  }

  const controls = [eccButton, eccPrivateInput, messageInput];

  controls.forEach(control => {
    control.disabled = true;
  });

  try {
    const plaintext = normalizeMessage(messageInput.value);
    const privateScalar = eccPrivateInput.valueAsNumber;

    if (
      !Number.isInteger(privateScalar) ||
      privateScalar < 1 ||
      privateScalar > ECC_MAX_PRIVATE
    ) {
      throw new Error("Choose an integer private key between 1 and 1000.");
    }

    // Aggiorna anche Cesare usando lo stesso messaggio normalizzato.
    runCaesarExperiment();
    clearCurrentAttack();

    eccStatus.textContent = "Encrypting and decrypting…";

    const privateKeyHex = scalarToHex(privateScalar);
    const recipientKey = new ethers.SigningKey(privateKeyHex);
    const recipientPublicKey = recipientKey.compressedPublicKey;

    const packet = await encryptEccMessage(
      plaintext,
      recipientPublicKey
    );

    const decrypted = await decryptEccMessage(
      privateKeyHex,
      packet
    );

    if (decrypted !== plaintext) {
      throw new Error("The decrypted message does not match.");
    }

    eccPublicExperiment = {
      publicKey: recipientPublicKey,
      packet,
      maximumPrivateKey: ECC_MAX_PRIVATE
    };

    eccPlaintextBox.textContent = plaintext;
    eccPublicBox.textContent = recipientPublicKey;
    eccPackageBox.textContent = JSON.stringify(packet, null, 2);
    eccDecryptedBox.textContent = decrypted;

    eccStatus.textContent =
      "Success: decryption matches the normalized plaintext " +
      "and the authentication tag was verified.";
  } catch (error) {
    eccStatus.textContent = `ECC experiment failed: ${error.message}`;
  } finally {
    controls.forEach(control => {
      control.disabled = false;
    });
  }
}

eccButton.addEventListener("click", runEccExperiment);
eccPrivateInput.addEventListener("input", clearEccResults);
messageInput.addEventListener("input", clearEccResults);

// ---------- Exhaustive search of the restricted ECC key space ----------

const eccAttackButton = document.querySelector("#run-ecc-attack");
const eccAttackStatus = document.querySelector("#ecc-attack-status");
const eccAttackResults = document.querySelector("#ecc-attack-results");
const eccAttackerPlaintext = document.querySelector("#ecc-attacker-plaintext");

function clearEccAttackResults() {
  eccAttackResults.replaceChildren();
  eccAttackerPlaintext.textContent = "";
  eccAttackStatus.textContent = "";
}

// Questa funzione riceve soltanto informazioni pubbliche.
async function recoverRestrictedEccKey(
  publicKey,
  maximumPrivateKey,
  reportProgress
) {
  for (let candidate = 1; candidate <= maximumPrivateKey; candidate++) {
    const candidateHex = scalarToHex(candidate);

    const candidatePublicKey =
      new ethers.SigningKey(candidateHex).compressedPublicKey;

    if (candidatePublicKey === publicKey) {
      return {
        privateScalar: candidate,
        attempts: candidate
      };
    }

    if (candidate % 25 === 0) {
      reportProgress(candidate);

      // Lascia aggiornare la pagina durante la ricerca.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return null;
}

async function runRestrictedEccAttack() {
  clearEccAttackResults();

  if (!eccPublicExperiment) {
    eccAttackStatus.textContent =
      "Run the ECC encryption experiment first.";
    return;
  }

  // Copia dello scenario pubblico da attaccare.
  const target = {
    publicKey: eccPublicExperiment.publicKey,
    maximumPrivateKey: eccPublicExperiment.maximumPrivateKey,
    packet: { ...eccPublicExperiment.packet }
  };

  const controls = [
    eccAttackButton,
    eccButton,
    eccPrivateInput,
    messageInput
  ];

  controls.forEach(control => {
    control.disabled = true;
  });

  try {
    eccAttackStatus.textContent = "Searching candidate private keys…";

    const start = performance.now();

    const recovered = await recoverRestrictedEccKey(
      target.publicKey,
      target.maximumPrivateKey,
      attempts => {
        eccAttackStatus.textContent =
          `Tested ${attempts}/${target.maximumPrivateKey} candidates…`;
      }
    );

    const searchMilliseconds = performance.now() - start;

    if (recovered === null) {
      eccAttackStatus.textContent =
        "No matching private key was found in the specified interval.";
      return;
    }

    // La decifratura usa la chiave trovata, non il campo della pagina.
    const plaintext = await decryptEccMessage(
      scalarToHex(recovered.privateScalar),
      target.packet
    );

    appendTextRow(eccAttackResults, [
      "Search interval",
      `1–${target.maximumPrivateKey}`
    ]);

    appendTextRow(eccAttackResults, [
      "Recovered private key",
      recovered.privateScalar
    ]);

    appendTextRow(eccAttackResults, [
      "Candidates tested",
      recovered.attempts
    ]);

    appendTextRow(eccAttackResults, [
      "Search elapsed time",
      `${searchMilliseconds.toFixed(1)} ms`
    ]);

    appendTextRow(eccAttackResults, [
      "Authentication tag",
      "Verified during decryption"
    ]);

    eccAttackerPlaintext.textContent = plaintext;

    eccAttackStatus.textContent =
      "Attack successful: the public key matched a candidate, " +
      "and the recovered key decrypted the message.";
  } catch (error) {
    eccAttackStatus.textContent = `Attack failed: ${error.message}`;
  } finally {
    controls.forEach(control => {
      control.disabled = false;
    });
  }
}

eccAttackButton.addEventListener("click", runRestrictedEccAttack);

// Cancella i risultati quando cambia lo scenario.
eccPrivateInput.addEventListener("input", clearEccAttackResults);
messageInput.addEventListener("input", clearEccAttackResults);
eccButton.addEventListener("click", clearEccAttackResults);
