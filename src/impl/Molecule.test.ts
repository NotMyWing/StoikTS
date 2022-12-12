import { evaluate } from "..";
import { AtomLiteral, Molecule } from "./Molecule";

describe(Molecule, () => {
	it("should properly initialize using all constructors", () => {
		expect(new Molecule("H", 2)).toEqual(new Molecule([["H", 2]]));
		expect(() => new Molecule("asdasdas" as AtomLiteral)).toThrow();
		expect(new Molecule("H")).toEqual(new Molecule([["H", 1]]));
		expect(new Molecule("H", 1)).toEqual(new Molecule([["H"]]));

		expect(new Molecule(new Molecule("H", 2))).toEqual(new Molecule("H", 2));
	});

	it("should trim excess zeroes when adding and subtracting", () => {
		const lhs = new Molecule("H").addMut("O");
		const rhs = new Molecule("H").addMut("O");

		lhs.subtractMut(rhs);
		expect(lhs).not.toHaveProperty("H");
	});

	it("should produce equal results using mutable and immutable methods", () => {
		const molecule = new Molecule("H").addMut("O");

		expect(molecule.add("H")).toEqual(molecule.addMut("H"));
		expect(molecule.subtract("H")).toEqual(molecule.subtractMut("H"));
		expect(molecule.negate()).toEqual(molecule.negateMut());
		expect(molecule.multiply(5)).toEqual(molecule.multiplyMut(5));

		expect(molecule).toEqual(
			new Molecule([
				["H", -5],
				["O", -5],
			]),
		);
	});

	it("should work with any combinations of operands", () => {
		const a = evaluate("A - 2A");
		const b = evaluate("2A - A");
		expect(a).not.toEqual(b);

		const c = evaluate("A - A");
		expect(c).toBeTruthy();

		if (c) {
			expect(c).toBeInstanceOf(Molecule);
			if (!(c instanceof Molecule)) return;

			expect(c.get("A")).toBeFalsy();
		}
	});

	it("should subtract respecting associativity", () => {
		const a = evaluate("A - 2A");
		const b = evaluate("2A - A");
		const c = evaluate("A - C");
		const d = evaluate("C - A");

		expect(a).toBeTruthy();
		expect(b).toBeTruthy();
		expect(c).toBeTruthy();
		expect(d).toBeTruthy();
		if (!a || !b || !c || !d) return;

		expect(a).not.toEqual(b);
		expect(a).toEqual(new Molecule([["A", -1]]));
		expect(b).toEqual(new Molecule([["A", 1]]));
		expect(c).toEqual(
			new Molecule([
				["A", 1],
				["C", -1],
			]),
		);
		expect(d).toEqual(
			new Molecule([
				["A", -1],
				["C", 1],
			]),
		);
	});
});
