export type Constituents = Map<string, number>;

type Letter =
	| "a"
	| "b"
	| "c"
	| "d"
	| "e"
	| "f"
	| "g"
	| "h"
	| "i"
	| "j"
	| "k"
	| "l"
	| "m"
	| "n"
	| "o"
	| "p"
	| "q"
	| "r"
	| "s"
	| "t"
	| "u"
	| "v"
	| "w"
	| "x"
	| "y"
	| "z";

export type AtomLiteral = Uppercase<Letter> | `${Uppercase<Letter>}${Letter}`;

const ATOM_LITERAL_TEST = /[A-Z][a-z]?/;

export class Molecule extends Map<AtomLiteral, number> {
	constructor();
	constructor(atom: AtomLiteral, frequency?: number);
	constructor(molecule: Molecule);
	constructor(...args: [AtomLiteral, number?] | [Molecule]) {
		const [rhs, rhsFreq = 1] = args;
		const isString = typeof rhs === "string";

		if (isString && rhsFreq !== 0) {
			super();
			this.set(rhs, rhsFreq);
		} else if (!isString) super(rhs);
	}

	static fromAtom(atom: AtomLiteral, frequency = 1) {
		return new Molecule(atom, frequency);
	}

	set(key: AtomLiteral, value: number): this {
		if (!ATOM_LITERAL_TEST.test(key)) throw new Error("Invalid atom format");

		super.set(key, value);

		return this;
	}

	private static addOrSubtractStatic(
		lhs: Molecule,
		subtract = false,
		...args: [AtomLiteral, number?] | [Molecule]
	): Molecule {
		const [rhs, rhsFreq = 1] = args;
		const isString = typeof rhs === "string";

		console.log(rhs, rhsFreq);

		// If the right side is an atom, it's just get and set.
		if (isString && rhsFreq !== 0) {
			const lhsFreq = lhs.get(rhs) || 0;

			// Do not leave zeroes in molecules.
			if (subtract && lhsFreq === rhsFreq) lhs.delete(rhs);
			// Add otherwise.
			else lhs.set(rhs, !subtract ? lhsFreq + rhsFreq : lhsFreq - rhsFreq);
		}
		// Otherwise it's a molecule, iterate each rhs atom/freq and add/subtract.
		else if (!isString) {
			rhs.forEach((rhsFreq, atom) => {
				const leftFreq = lhs.get(atom) || 0;

				// Do not leave zeroes in molecules.
				if ((subtract && leftFreq - rhsFreq === 0) || leftFreq + rhsFreq === 0) lhs.delete(atom);
				// Add otherwise.
				else lhs.set(atom, !subtract ? leftFreq + rhsFreq : leftFreq - rhsFreq);
			});
		}

		return lhs;
	}

	addMut(molecule: Molecule): this;
	addMut(atom: AtomLiteral, freq?: number): this;
	addMut(...args: [AtomLiteral, number?] | [Molecule]): this {
		Molecule.addOrSubtractStatic(this, false, ...args);
		return this;
	}

	add(molecule: Molecule): Molecule;
	add(atom: AtomLiteral, freq?: number): Molecule;
	add(...args: [AtomLiteral, number?] | [Molecule]): Molecule {
		const molecule = new Molecule(this);
		Molecule.addOrSubtractStatic(molecule, false, ...args);
		return molecule;
	}

	subtractMut(molecule: Molecule): this;
	subtractMut(atom: AtomLiteral, freq?: number): this;
	subtractMut(...args: [AtomLiteral, number?] | [Molecule]): this {
		Molecule.addOrSubtractStatic(this, true, ...args);
		return this;
	}

	subtract(molecule: Molecule): Molecule;
	subtract(atom: AtomLiteral, freq?: number): Molecule;
	subtract(...args: [AtomLiteral, number?] | [Molecule]): Molecule {
		const molecule = new Molecule(this);
		Molecule.addOrSubtractStatic(molecule, true, ...args);
		return molecule;
	}

	private static multiplyStatic(molecule, multiplier: number) {
		for (const [atom, freq] of molecule) molecule.set(atom, multiplier * freq);
		return molecule;
	}

	negateMut(): this {
		return Molecule.multiplyStatic(this, -1);
	}

	negate(): Molecule {
		return Molecule.multiplyStatic(new Molecule(this), -1);
	}

	multiplyMut(multiplier: number): this {
		return Molecule.multiplyStatic(this, multiplier);
	}

	multiply(multiplier: number): Molecule {
		return Molecule.multiplyStatic(new Molecule(this), multiplier);
	}
}