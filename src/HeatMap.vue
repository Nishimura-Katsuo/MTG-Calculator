<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    population: number;
    successes: number;
}>();

const maxTurns = computed(() => props.population - 6);

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

const heatMapData = computed(() => {
    let ret : number[][] = [];

    for (let turn = 0; turn <= maxTurns.value; turn++) {
        ret[turn] = [];

        for (let i = 0; i <= props.successes; i++) {
            ret[turn][i] = 0;
        }
    }

    for (let turn = 0; turn <= maxTurns.value; turn++) {
        for (let i = 0; i <= turn + 6; i++) {
            if (i <= props.successes) {
                ret[turn][i] = hypergeometricDistribution(props.population, props.successes, turn + 6, i);
            }
        }
    }

    return ret;
});

</script>

<template>
    <svg xmlns="http://www.w3.org/2000/svg" :viewBox="`1 0 ${maxTurns} ${props.successes + 1}`">
        <template v-for="(column, turn) in heatMapData">
            <template v-for="(probability, count) in column">
                <rect :x="turn" :y="count" :width="1.05" :height="1.05" :fill="`hsl(0, 65%, ${probability * 100}%)`" :stroke-width="0" :data-turn="turn" :data-count="count" :data-probability="probability" />
            </template>
        </template>
    </svg>
</template>

<style scoped lang="scss">
    svg {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>
