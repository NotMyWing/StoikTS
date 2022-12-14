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
	constructor(atoms: [AtomLiteral, number?][]);
	constructor(...args: [AtomLiteral, number?] | [Molecule] | [[AtomLiteral, number?][]]) {
		const [rhs, rhsFreq = 1] = args;
		const isString = typeof rhs === "string";

		if (isString && rhsFreq !== 0) {
			super();
			this.set(rhs, rhsFreq);
		} else if (!isString) {
			if (rhs instanceof Molecule) super(rhs);
			else if (rhs) {
				super(
					rhs.map(([atom, freq]) => {
						if (!ATOM_LITERAL_TEST.test(atom)) throw new Error(`Invalid atom format: ${atom}`);

						return [atom, freq ?? 1];
					}),
				);
			} else super();
		}
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
		subtract: boolean,
		...args: [AtomLiteral, number?] | [Molecule]
	): Molecule {
		const [rhs, rhsFreq = 1] = args;
		const isString = typeof rhs === "string";

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

	/**
	 * Adds a molecule to this molecule, modifying the molecule in-place.
	 *
	 * @param molecule - The molecule to add.
	 * @returns The modified molecule.
	 */
	addMut(molecule: Molecule): this;

	/**
	 * Adds an atom to this molecule, modifying the molecule in-place.
	 *
	 * @param atom - The atom to add.
	 * @param freq - The frequency of the atom to add.
	 * @returns The modified molecule.
	 */
	addMut(atom: AtomLiteral, freq?: number): this;

	addMut(...args: [AtomLiteral, number?] | [Molecule]): this {
		Molecule.addOrSubtractStatic(this, false, ...args);
		return this;
	}

	/**
	 * Adds a molecule to this molecule. Returns a new molecule.
	 *
	 * @param molecule - The molecule to add.
	 * @returns The modified molecule.
	 */
	add(molecule: Molecule): Molecule;

	/**
	 * Adds an atom to this molecule. Returns a new molecule.
	 *
	 * @param atom - The atom to add.
	 * @param freq - The frequency of the atom to add.
	 * @returns A new molecule.
	 */
	add(atom: AtomLiteral, freq?: number): Molecule;

	add(...args: [AtomLiteral, number?] | [Molecule]): Molecule {
		const molecule = new Molecule(this);
		Molecule.addOrSubtractStatic(molecule, false, ...args);
		return molecule;
	}

	/**
	 * Subtracts a molecule from this molecule, modifying the molecule in-place.
	 *
	 * @param molecule - The molecule to subtract.
	 * @returns A new molecule.
	 */
	subtractMut(molecule: Molecule): this;

	/**
	 * Subtracts an atom from this molecule, modifying the molecule in-place.
	 *
	 * @param atom - The atom to subtract.
	 * @param freq - The frequency of the atom to subtract.
	 * @returns A new molecule.
	 */
	subtractMut(atom: AtomLiteral, freq?: number): this;

	subtractMut(...args: [AtomLiteral, number?] | [Molecule]): this {
		Molecule.addOrSubtractStatic(this, true, ...args);
		return this;
	}

	/**
	 * Subtracts a molecule from this molecule. Returns a new molecule.
	 *
	 * @param molecule - The molecule to subtract.
	 * @returns A new molecule.
	 */
	subtract(molecule: Molecule): Molecule;

	/**
	 * Subtracts a molecule from this molecule. Returns a new molecule.
	 *
	 * @param molecule - The molecule to subtract.
	 * @returns A new molecule.
	 */
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

	/**
	 * Multiplies all atom frequencies of the molecule by -1, modifying the molecule in-place.
	 *
	 * @returns The modified molecule.
	 */
	negateMut(): this {
		return Molecule.multiplyStatic(this, -1);
	}

	/**
	 * Multiplies all atom frequencies of the molecule by -1. Returns a new molecule.
	 *
	 * @returns The new molecule.
	 */
	negate(): Molecule {
		return Molecule.multiplyStatic(new Molecule(this), -1);
	}

	/**
	 * Multiplies all atom frequencies of the molecule by the given number, modifying the molecule in-place.
	 *
	 * @param multiplier The multiplier.
	 * @returns The modified molecule.
	 */
	multiplyMut(multiplier: number): this {
		return Molecule.multiplyStatic(this, multiplier);
	}

	/**
	 * Multiplies all atom frequencies of the molecule by the given number. Returns a new molecule.
	 *
	 * @param multiplier The multiplier.
	 * @returns The new molecule.
	 */
	multiply(multiplier: number): Molecule {
		return Molecule.multiplyStatic(new Molecule(this), multiplier);
	}
}
