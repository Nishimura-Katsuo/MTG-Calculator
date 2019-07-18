/* global DeckAnalyzer */

let $ = document.getElementById.bind(document);
//let isMobile = window.orientation !== undefined;

function getParams (...ids) {
	return ids.map(id => {
		let v = $(id).value;
		v = v ? v | 0 : undefined;

		return v;
	});
}

Number.prototype.fmt = function (padlen = 2) {
	return ('' + this).padStart(padlen);
};

function calc (e) {
	try {
		let stats = DeckAnalyzer.deckStats(...getParams('land', 'raiseCurve', 'maxCost', 'reserved', 'deckSize')), curve = stats.curve.map((count, cost) => {
			return cost || count ? cost.fmt(3) + ' drops:' + count.fmt(3) : undefined;
		}).filter(Boolean).join('\n');
		$('output').innerHTML = `<b>Deck Stats</b>
Lands:     ${stats.lands.fmt()}
Spells:    ${stats.spells.fmt()}
Reserved:  ${stats.extra.fmt()}

Curve:
${curve}

Total:     ${stats.deckSize.fmt()}`;
		e && e.stopPropagation();
	} catch (err) {
		console.log(err.stack);
	}
}

window.onload = () => {
	document.ondblclick = () => {
		if (document.fullscreen) {
			document.exitFullscreen();
		} else {
			document.body.requestFullscreen();
			screen.orientation.lock('landscape').catch(() => {});
		}
	};

	let fields = ['deckSize', 'land', 'raiseCurve', 'maxCost', 'reserved'];

	fields.forEach(id => {
		$(id).placeholder = DeckAnalyzer.defaults[id];
	});

	fields.forEach(id => {
		let minus = $(id + 'Minus'), plus = $(id + 'Plus');
		id = $(id);

		id.onchange = () => {
			//console.log(id, 'change');
			calc();
		};

		id.onkeydown = () => {
			//console.log(id, 'keydown');
			setTimeout(calc, 1);
		};

		id.onclick = id.ondblclick = e => e.stopPropagation();

		minus && (minus.onclick = e => {
			id.value = '' + (((id.value || id.placeholder) | 0) - 1);
			calc(e);
		});

		minus && (minus.ondblclick = e => e.stopPropagation());

		plus && (plus.onclick = e => {
			id.value = '' + (((id.value || id.placeholder) | 0) + 1);
			calc(e);
		});

		plus && (plus.ondblclick = e => e.stopPropagation());
	});

	let presets = {
			Aggro: {
				deckSize: 60,
				land: 20,
				raiseCurve: 0,
				reserved: 7,
				maxCost: 2,
				tooltip: 'Aggro Decks (Fast and Aggressive)\n *Mulligans for explosive hands..\n *Uses small amounts of removal.\n *Strong against control, and weak to midrange.\n *Reserves cards for removal or tempo.'
			},
			Midrange: {
				deckSize: DeckAnalyzer.defaults.deckSize,
				land: DeckAnalyzer.defaults.land,
				raiseCurve: DeckAnalyzer.defaults.raiseCurve,
				reserved: DeckAnalyzer.defaults.reserved,
				maxCost: '',
				tooltip: 'Midrange Decks (Consistant and Powerful)\n *Usually combines a balance of creatures and controlling spells.\n *May take hands without first-turn plays.\n *Strong against aggro, and weak to control.\r *Reserves cards for removal, tempo, or utility.'
			},
			Control: {
				deckSize: 60,
				land: 27,
				raiseCurve: 3,
				reserved: 7,
				maxCost: '',
				tooltip: 'Control Decks (Slow and Inevitable)\n *Controls the game with counterspells and kill spells.\n *Uses very strong creatures or combos to win.\n *Strong against midrange, weak to aggro.\n *Reserves cards for ending the game.'
			},
			Limited: {
				deckSize: 40,
				land: 15,
				raiseCurve: 4,
				reserved: 2,
				maxCost: '',
				tooltip: 'Limited Decks (formats with 40 card deck limits)\n *Uses few one cost creatures, or none.\n *Keeps the mana curve high due to limited card access.\n *Usually plays a midrange strategy.\n *Reserves cards for ending the game.'
			},
			Clear: {
				deckSize: '',
				land: '',
				raiseCurve: '',
				reserved: '',
				maxCost: '',
				tooltip: 'Clear All Fields'
			}
		}, elem;

	Object.keys(presets).forEach(name => {
		elem = document.createElement('button');
		elem.innerText = name;
		presets[name].tooltip && (elem.title = presets[name].tooltip);

		elem.onclick = e => {
			for (let field in presets[name]) {
				if (field !== 'tooltip') {
					$(field).value = '' + presets[name][field];
				}
			}

			calc(e);
		};

		elem.ondblclick = e => e.stopPropagation();

		$('presets').appendChild(elem);
	});

	calc();
};
