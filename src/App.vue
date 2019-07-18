<script setup lang="ts">
import { computed, ref } from 'vue';

const deckSize = ref(60);
const landCount = ref(25);
const maxTurns = 12;

function range(start: number, end: number): number[] {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// Function to calculate the hypergeometric distribution
function hypergeometricDistribution(N: number, K: number, n: number, k: number): number {
    // Use logarithms to handle large numbers and prevent floating point errors.
    // P(X=k) = [C(K, k) * C(N-K, n-k)] / C(N, n)
    // log(P(X=k)) = log(C(K,k)) + log(C(N-K, n-k)) - log(C(N,n))

    if (k < 0 || k > n || k > K || n - k > N - K) {
        return 0;
    }

    const logFactorial = (x: number): number => {
        let result = 0;
        for (let i = 2; i <= x; i++) {
            result += Math.log(i);
        }
        return result;
    };

    const logCombinations = (n_comb: number, k_comb: number): number => {
        if (k_comb < 0 || k_comb > n_comb) {
            return -Infinity; // log(0)
        }
        return logFactorial(n_comb) - logFactorial(k_comb) - logFactorial(n_comb - k_comb);
    };

    const logProbability = logCombinations(K, k) + logCombinations(N - K, n - k) - logCombinations(N, n);

    return Math.exp(logProbability);
}

// Function to calculate the hypergeometric distribution range
function hypergeometricDistributionRange(N: number, K: number, n: number, kMin: number, kMax: number): number {
    [kMin, kMax] = [Math.min(kMin, kMax), Math.max(kMin, kMax)];

    let ret = 0;

    for (let k = kMin; k <= kMax; k++) {
        ret += hypergeometricDistribution(N, K, n, k);
    }

    return ret;
}

function generateCurrentLandDraws(turn: number): number {
    if (turn < 1) return 0;
    const sampleSize = Math.max(7, turn + 6); // 7 cards drawn first turn, plus 1 each subsequent turn

    let prob = 0, ret = 0;

    for (let i of range(0, sampleSize)) {
        let newprob = hypergeometricDistributionRange(deckSize.value, landCount.value, sampleSize, i, i + 1);

        if (newprob < prob) {
            break;
        }

        prob = newprob;
        ret = i;
    }

    return ret;
}

function generateCurrentLandCount(turn: number): number {
    return Math.min(turn, generateCurrentLandDraws(turn));
}

const landDrops = computed(() => {
    return range(0, maxTurns).map(generateCurrentLandCount);
});

const landDraws = computed(() => {
    return range(0, maxTurns).map(generateCurrentLandDraws);
});

function generateCostCounts(): number[] {
    const turns = landDrops.value;

    let ret: number[] = [0], cost = 0, draws = 0;

    for (let turn = 1; turn < turns.length; turn++) {
        let lands = turns[turn], handSize = Math.max(7, 6 + turn);

        if (cost !== lands) {
            cost = lands;
            ret[cost] ??= 0;
            draws = 0;
        }

        draws++;

        let cards = 0, prob = 0, cardmax = deckSize.value - landCount.value;

        for (let successes = 1; successes <= cardmax; successes++) {
            let newprob = hypergeometricDistributionRange(deckSize.value, successes, handSize, draws, draws + 1);

            if (newprob < prob) {
                break;
            }

            cards = successes;
            prob = newprob;
        }

        if (cards > 0) {
            ret[cost] = Math.max(ret[cost], cards);
        }
    }

    while (ret.length > 1 && ret[ret.length - 1] === 0) {
        ret.pop();
    }

    return ret;
}

const costCounts = computed(() => generateCostCounts());

</script>

<template>
    <div class="container">
        <div class="inputs">
            <div class="input-group">
                <label for="deck-size">Deck Size</label>
                <input id="deck-size" type="number" min="1" step="1" v-model="deckSize" @change="() => {
                    landCount = Math.min(landCount, deckSize);
                }" />
            </div>
            <div class="input-group">
                <label for="land-count">Land Count</label>
                <input id="land-count" type="number" step="1" min="1" :max="deckSize" v-model="landCount" />
            </div>
        </div>

        <div class="table-wrapper">
            <table>
                <caption>CMC distribution</caption>
                <thead>
                    <tr>
                        <th>CMC</th>
                        <template v-for="i in Object.keys(costCounts).map(Number)">
                            <th v-if="i > 0">{{ i }}</th>
                        </template>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>Count</th>
                        <template v-for="(n, i) in costCounts">
                            <td v-if="i > 0">{{ n }}</td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="table-wrapper">
            <table>
                <caption>Land Drops</caption>
                <thead>
                    <tr>
                        <th>Turn</th>
                        <template v-for="i in Object.keys(landDrops).map(Number)">
                            <th v-if="i > 0">{{ i }}</th>
                        </template>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>Lands</th>
                        <template v-for="(n, i) in landDrops">
                            <td v-if="i > 0">{{ n }}</td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="table-wrapper">
            <table>
                <caption>Land Draws</caption>
                <thead>
                    <tr>
                        <th>Turn</th>
                        <template v-for="i in Object.keys(landDraws).map(Number)">
                            <th v-if="i > 0">{{ i }}</th>
                        </template>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>Lands</th>
                        <template v-for="(n, i) in landDraws">
                            <td v-if="i > 0">{{ n }}</td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<style scoped lang="scss">

.container {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 2rem;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
    margin: 0 auto;
}

.radio-group {
    display: flex;
    gap: 1.5rem;
}

.radio-item {
    color: rgba(255, 255, 255, 0.9);
    display: flex;
    gap: 0.5em;
    align-items: center;
    justify-content: center;
}

input[type="radio"] {
    margin: 0;
    font: inherit;
    color: currentColor;
    width: 1.15em;
    height: 1.15em;
}

input[type="radio"]:checked::before {
    transform: scale(1);
}

input[type="radio"]:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.inputs {
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
    justify-content: center;
    align-items: center;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

label {
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
}

input {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    padding: 0.75rem 1rem;
    color: white;
    font-size: 1rem;
    width: 120px;
    text-align: center;
    transition: all 0.2s ease;
}

input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

table {
    width: 100%;
    border-collapse: collapse;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 5px;
}

th,
td {
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.75rem;
    text-align: center;
    transition: background-color 0.2s ease;
}

th {
    background-color: rgba(0, 0, 0, 0.4);
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
}

tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.05);
}

.table-wrapper {
    overflow-x: auto;
}
</style>
