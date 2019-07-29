/* DeckAnalyzer for building mana curves in Magic the Gathering
 *
 * hypergeometric formula for reference
 * let hgd = (cards, poolSize, handSize, deckSize = 60) => f(poolSize) * f(deckSize - poolSize) * f(handSize) * f(deckSize - handSize) / (f(deckSize) * f(cards) * f(poolSize - cards) * f(handSize - cards) * f(deckSize - poolSize - handSize + cards));
 */

/* global */

let DeckAnalyzer = (({defaults, clamp, f}) => class DA {
	static get defaults () {
		return defaults;
	}

	static cardChance (poolSize, handSize, deckSize) {
		deckSize = Math.max(0, deckSize);
		handSize = clamp(0, handSize, deckSize);
		poolSize = clamp(0, poolSize, deckSize);

		let ret = [];

		for (let cards = 0; cards <= handSize; cards++) {
			ret[cards] = f(poolSize) * f(handSize) * f(deckSize - poolSize) * f(deckSize - handSize);
			ret[cards] /= f(deckSize - poolSize - handSize + cards) * f(deckSize) * f(cards) * f(handSize - cards) * f(poolSize - cards);
		}

		return ret;
	}

	static poolChance (cards, handSize, deckSize) {
		deckSize = Math.max(0, deckSize);
		handSize = clamp(0, handSize, deckSize);
		cards = clamp(0, cards, handSize);

		let ret = [];

		for (let poolSize = 0; poolSize <= deckSize; poolSize++) {
			ret[poolSize] = f(poolSize) * f(handSize) * f(deckSize - poolSize) * f(deckSize - handSize);
			ret[poolSize] /= f(deckSize - poolSize - handSize + cards) * f(deckSize) * f(cards) * f(handSize - cards) * f(poolSize - cards);
		}

		return ret;
	}

	static optimal (table) {
		let val = 0, ch = -Infinity;

		for (let c = 0; c < table.length; c++) {
			if (table[c] > ch) {
				val = c;
				ch = table[c];
			}
		}

		return val;
	}

	static deckStats (land = defaults.land, raiseCurve = defaults.raiseCurve, maxCost = defaults.maxCost, reserved = defaults.reserved, deckSize = defaults.deckSize, initialHandSize = defaults.handSize) {
		let ret = {}, grid = [];

		ret.lands = land;

		for (let curturn = 0, draws = initialHandSize - 2; draws <= deckSize; curturn++, draws++) {
			for (let c = 0; c <= curturn + initialHandSize - 1; c++) {
				grid[curturn] = grid[curturn] || [];
				grid[curturn][c] = DA.optimal(DA.poolChance(c, draws, deckSize));
			}
		}

		ret.curve = [0];

		for (let curturn = 1, draws = initialHandSize - 1, total = land + reserved, cards = [], rawpool = []; draws <= deckSize && total < deckSize; curturn++, draws++) {
			let ma = ret.lands > 0 ? Math.min(ret.lands, curturn, DA.optimal(DA.cardChance(ret.lands, draws, deckSize))) : Math.min(curturn, defaults.hsManaMax);
			let mc = maxCost <= 0 ? [0] : ma <= maxCost ? [ma] : [maxCost, ma - maxCost].sort().reverse(), pooldiff = 0;

			mc.forEach(cost => {
				cards[cost] = cards[cost] || 0;
				ret.curve[cost] = ret.curve[cost] || 0;
				rawpool[cost] = rawpool[cost] || 0;
				cards[cost] = cards[cost] + 1;
				pooldiff = clamp(0, grid[curturn][cards[cost]] - rawpool[cost], deckSize - total);
				rawpool[cost] = Math.max(grid[curturn][cards[cost]], rawpool[cost]);

				if (pooldiff >= raiseCurve) {
					pooldiff -= raiseCurve;
					raiseCurve = 0;
					total += pooldiff;
					ret.curve[cost] += pooldiff;
				} else {
					raiseCurve -= pooldiff;
				}
			});
		}

		ret.spells = deckSize - land - reserved;
		ret.extra = reserved;
		ret.deckSize = deckSize;

		return ret;
	}
})({
	defaults: Object.freeze({
		deckSize: 60,
		land: 24,
		raiseCurve: 6,
		variance: 1,
		reserved: 12,
		maxCost: 6,
		handSize: 7,
		hsManaMax: 10,
	}),
	clamp: (min, v, max) => Math.max(min, Math.min(v, max)),
	f: ((_f_cache_ = []) => function _self_ (n) {
		return n < 2 ? 1 : _f_cache_[n] || (_f_cache_[n] = (n * _self_(n - 1)));
	})(),
});

try {
	if (require.main === module) {
		if (process.argv.length < 3) {
			console.log('Usage: ' + process.argv[0].split('/').pop() + ' ' + process.argv[1].split('/').pop() + ' LAND RESERVED DECKSIZE\n');
		} else {
			let intargs = process.argv.slice(2).map(arg => {
				try {
					if (arg.includes('/')) {
						return arg;
					}

					return JSON.parse(arg);
				} catch (err) {
					return undefined;
				}
			});
			console.table(DeckAnalyzer.deckStats(...intargs));
		}

		console.log('(DeckAnalyzer running in node script mode.)');
	} else {
		console.log('DeckAnalyzer running in node module mode.');
		module.exports = DeckAnalyzer;
	}
} catch (err) {
	console.log('DeckAnalyzer running in browser mode.');
}
