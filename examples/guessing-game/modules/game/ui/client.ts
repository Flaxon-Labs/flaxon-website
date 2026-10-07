// Shared browser helpers. Python still owns all rules and authorization.
const STORAGE_KEY = "guessing-game.rounds";

export function loadRounds() {
    try {
        const rounds = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(rounds) ? rounds : [];
    } catch {
        return [];
    }
}

export function saveRound(round) {
    const previousRounds = loadRounds().filter((item) => item.id !== round.id);
    // Keep one unfinished round and up to 50 recent rounds in this tab.
    const rounds = [round, ...previousRounds].filter(
        (item) => item.id === round.id || item.outcome !== "playing"
    );
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rounds.slice(0, 50)));
        return true;
    } catch {
        return false;
    }
}

export function removeRound(gameId) {
    const rounds = loadRounds().filter((round) => round.id !== gameId);
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rounds));
    } catch {
        // Gameplay can continue even when browser storage is unavailable.
    }
}

export async function requestJson(path, { method = "GET", body, token } = {}) {
    const headers = { "X-Game-Client": "flaxon-spa" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["X-Game-Token"] = token;

    const response = await fetch(path, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) {
        const message = typeof data.error === "string"
            ? data.error
            : `The request failed (${response.status}). Please try again.`;
        throw new Error(message);
    }
    return data;
}

export function startRound() {
    return requestJson("/api/games/", { method: "POST" });
}

export function readRound(round) {
    return requestJson(`/api/games/${round.id}`, { token: round.token });
}

export function sendGuess(round, value) {
    return requestJson(`/api/games/${round.id}/guesses`, {
        method: "POST",
        body: { value },
        token: round.token,
    });
}

export function readResult(round) {
    return requestJson(`/api/results/${round.id}`, { token: round.token });
}
