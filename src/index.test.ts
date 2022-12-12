import Denque from "denque";
import { Molecule } from "./impl/Molecule";
import { AnyEvaluatable, evaluate, MalformedFormulaError, tokenize, TokenName, TokenType, toRPN } from "./index";

describe(tokenize, () => {
	it("should throw on invalid characters", () => {
		expect(() => tokenize("🐱‍👤")).toThrow();
	});

	it("should tokenize chemical equations", () => {
		const tokens = tokenize("H2O").toArray();
		expect(tokens).toEqual([
			[TokenType.Atom, "H"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
			[TokenType.Add],
			[TokenType.Atom, "O"],
		]);
	});

	it("should tokenize numbers with multiple digits", () => {
		const tokens = tokenize("H22O").toArray();
		expect(tokens).toEqual([
			[TokenType.Atom, "H"],
			[TokenType.Subscript],
			[TokenType.Number, 22],
			[TokenType.Add],
			[TokenType.Atom, "O"],
		]);
	});

	it("should tokenize chemical equations with subscripts", () => {
		const tokens = tokenize("H2O2").toArray();
		expect(tokens).toEqual([
			[TokenType.Atom, "H"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
			[TokenType.Add],
			[TokenType.Atom, "O"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
		]);
	});

	it("should tokenize chemical equations with subscripts and coefficients", () => {
		const tokens = tokenize("2H2O2").toArray();
		expect(tokens).toEqual([
			[TokenType.Number, 2],
			[TokenType.Coefficient],
			[TokenType.Atom, "H"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
			[TokenType.Add],
			[TokenType.Atom, "O"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
		]);
	});

	it("should tokenize chemical equations with parentheses", () => {
		const tokens = tokenize("(H2O)2").toArray();
		expect(tokens).toEqual([
			[TokenType.GroupLeft],
			[TokenType.Atom, "H"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
			[TokenType.Add],
			[TokenType.Atom, "O"],
			[TokenType.GroupRight],
			[TokenType.Subscript],
			[TokenType.Number, 2],
		]);
	});

	it("should tokenize chemical equations with parentheses and coefficients", () => {
		const tokens = tokenize("2(H2O)2").toArray();
		expect(tokens).toEqual([
			[TokenType.Number, 2],
			[TokenType.Coefficient],
			[TokenType.GroupLeft],
			[TokenType.Atom, "H"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
			[TokenType.Add],
			[TokenType.Atom, "O"],
			[TokenType.GroupRight],
			[TokenType.Subscript],
			[TokenType.Number, 2],
		]);
	});

	it("should tokenize ambiguous chemical equations", () => {
		const tokens = tokenize("5(H2O)3((FeW)5CrMo2V)6CoMnSi").toArray();
		expect(tokens).toEqual([
			[TokenType.Number, 5],
			[TokenType.Coefficient],
			[TokenType.GroupLeft],
			[TokenType.Atom, "H"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
			[TokenType.Add],
			[TokenType.Atom, "O"],
			[TokenType.GroupRight],
			[TokenType.Subscript],
			[TokenType.Number, 3],
			[TokenType.Add],
			[TokenType.GroupLeft],
			[TokenType.GroupLeft],
			[TokenType.Atom, "Fe"],
			[TokenType.Add],
			[TokenType.Atom, "W"],
			[TokenType.GroupRight],
			[TokenType.Subscript],
			[TokenType.Number, 5],
			[TokenType.Add],
			[TokenType.Atom, "Cr"],
			[TokenType.Add],
			[TokenType.Atom, "Mo"],
			[TokenType.Subscript],
			[TokenType.Number, 2],
			[TokenType.Add],
			[TokenType.Atom, "V"],
			[TokenType.GroupRight],
			[TokenType.Subscript],
			[TokenType.Number, 6],
			[TokenType.Add],
			[TokenType.Atom, "Co"],
			[TokenType.Add],
			[TokenType.Atom, "Mn"],
			[TokenType.Add],
			[TokenType.Atom, "Si"],
		]);
	});

	it("should throw on unmatched parentheses", () => {
		expect(() => tokenize("(H2O")).toThrow(MalformedFormulaError);
		expect(() => tokenize("H2O)")).toThrow(MalformedFormulaError);
	});
});

describe(toRPN, () => {
	it("should accept both tokens and string representations alike", () => {
		expect(toRPN("5(H2O)3((FeW)5CrMo2V)6CoMnSi")).toEqual(toRPN(tokenize("5(H2O)3((FeW)5CrMo2V)6CoMnSi")));
	});

	it("should convert chemical equations to RPN", () => {
		const tokens = toRPN(tokenize("H2O")).toArray();
		expect(tokens).toEqual([
			[TokenType.Atom, "H"],
			[TokenType.Number, 2],
			[TokenType.Subscript],
			[TokenType.Atom, "O"],
			[TokenType.Add],
		]);
	});

	it("should convert chemical equations with subscripts to RPN", () => {
		const tokens = toRPN(tokenize("H2O2")).toArray();
		expect(tokens).toEqual([
			[TokenType.Atom, "H"],
			[TokenType.Number, 2],
			[TokenType.Subscript],
			[TokenType.Atom, "O"],
			[TokenType.Number, 2],
			[TokenType.Subscript],
			[TokenType.Add],
		]);
	});

	it("should convert chemical equations with subscripts and coefficients to RPN", () => {
		const tokens = toRPN(tokenize("2H2O2")).toArray();

		expect(tokens).toEqual([
			[TokenType.Number, 2],
			[TokenType.Atom, "H"],
			[TokenType.Number, 2],
			[TokenType.Subscript],
			[TokenType.Atom, "O"],
			[TokenType.Number, 2],
			[TokenType.Subscript],
			[TokenType.Add],
			[TokenType.Coefficient],
		]);
	});
});

describe("evaluate", () => {
	it("should throw when receiving no value", () => {
		expect(() => evaluate(new Denque())).toThrow();
		expect(() => evaluate("")).toThrow();
	});

	it("should accept both RPN and string representations alike", () => {
		expect(evaluate("5(H2O)3((FeW)5CrMo2V)6CoMnSi")).toEqual(evaluate(toRPN("5(H2O)3((FeW)5CrMo2V)6CoMnSi")));
	});

	it("should evaluate chemical equations", () => {
		const result = evaluate("H2O");

		expect(result).toBeTruthy();
		expect(result).toBeInstanceOf(Molecule);
		expect(result).toEqual(
			new Molecule([
				["H", 2],
				["O", 1],
			]),
		);
	});

	it("should evaluate chemical equations with subscripts", () => {
		const result = evaluate("H2O2");

		expect(result).toBeTruthy();
		expect(result).toBeInstanceOf(Molecule);
		expect(result).toEqual(
			new Molecule([
				["H", 2],
				["O", 2],
			]),
		);
	});

	it("should evaluate chemical equations with subscripts and coefficients", () => {
		const result = evaluate("2H2O2");

		expect(result).toBeTruthy();
		expect(result).toBeInstanceOf(Molecule);
		expect(result).toEqual(
			new Molecule([
				["H", 4],
				["O", 4],
			]),
		);
	});

	it("should evaluate chemical equations with parentheses", () => {
		const result = evaluate("(H2O)2");

		expect(result).toBeTruthy();
		expect(result).toBeInstanceOf(Molecule);
		expect(result).toEqual(
			new Molecule([
				["H", 4],
				["O", 2],
			]),
		);
	});

	it("should evaluate chemical equations with parentheses and coefficients", () => {
		const result = evaluate("2(H2O)2");

		expect(result).toBeTruthy();
		expect(result).toBeInstanceOf(Molecule);
		expect(result).toEqual(
			new Molecule([
				["H", 8],
				["O", 4],
			]),
		);
	});

	it("should evaluate ambiguios chemical equations", () => {
		expect(evaluate("H2 O")).toEqual(evaluate("H 2O"));
		expect(evaluate("2H 2O")).toEqual(evaluate("H4O2"));
		expect(evaluate("2H2 2O")).toEqual(evaluate("H8O2"));
		expect(evaluate("2H2 2O2")).toEqual(evaluate("H8O4"));
		expect(evaluate("2H2 2O2 2")).toEqual(evaluate("H8O8"));
		expect(evaluate("2H2 2O2 2 2H")).toEqual(evaluate("H10O16"));

		expect(() => evaluate("2 2H2 2O2 2")).toThrowError();
	});

	it("should evaluate complex chemical equations", () => {
		const result = evaluate("5(H2O)3((FeW)5CrMo2V)6CoMnSi");

		expect(result).toBeTruthy();
		expect(result).toBeInstanceOf(Molecule);
		expect(result).toEqual(
			new Molecule([
				["H", 30],
				["Co", 5],
				["Cr", 30],
				["Fe", 150],
				["Mn", 5],
				["Mo", 60],
				["O", 15],
				["Si", 5],
				["V", 30],
				["W", 150],
			]),
		);
	});

	it("should evaluate any combinations of tokens", () => {
		const result = evaluate("2(2C2(2(C)2)2(C)(C)(2C)((2(C2(2C)))2))(C2)2");

		expect(result).toBeTruthy();
		expect(result).toBeInstanceOf(Molecule);

		expect(result).toEqual(new Molecule([["C", 128]]));
	});

	it("should treat explicit plus sign as different formulas", () => {
		expect(evaluate("H2O + H2O")).toEqual(evaluate("(H2O)(H2O)"));

		expect(evaluate("(5(H2O)3((FeW)5CrMo2V)6CoMnSi)(5(H2O)3((FeW)5CrMo2V)6CoMnSi)")).toEqual(
			evaluate("5(H2O)3((FeW)5CrMo2V)6CoMnSi + 5(H2O)3((FeW)5CrMo2V)6CoMnSi"),
		);
	});

	describe("operators", () => {
		const exampleTokens: Record<TokenType, AnyEvaluatable> | Record<"molecule", Molecule> = {
			[TokenType.GroupLeft]: [TokenType.GroupLeft],
			[TokenType.GroupRight]: [TokenType.GroupRight],
			[TokenType.Number]: [TokenType.Number, 2],
			[TokenType.Add]: [TokenType.Add],
			[TokenType.Subtract]: [TokenType.Subtract],
			[TokenType.Atom]: [TokenType.Atom, "H"],
			[TokenType.Coefficient]: [TokenType.Coefficient],
			[TokenType.Subscript]: [TokenType.Subscript],
			["molecule"]: new Molecule(),
			[TokenType.Join]: [TokenType.Join],
		};

		function combine<T>(input: T[]) {
			const ououtput: T[][] = [];
			for (let i = 0; i < input.length; i++) for (let j = 0; j < input.length; j++) ououtput.push([input[i], input[j]]);

			return ououtput;
		}

		function makeFIFO(...args: AnyEvaluatable[]) {
			const output = new Denque<AnyEvaluatable>();
			for (const arg of args) output.push(arg);

			return output;
		}

		const tokenPermutations = combine(Object.values(exampleTokens));
		describe("add operand validity", () => {
			const validTokens = new Set([exampleTokens[TokenType.Atom], exampleTokens["molecule"]]);

			for (const [lhs, rhs] of tokenPermutations) {
				const shouldPass = validTokens.has(lhs) && validTokens.has(rhs);

				it(`addition of ${TokenName[lhs[0]]} and ${TokenName[rhs[0]]} should ` + (shouldPass ? "pass" : "fail"), () => {
					const input = makeFIFO(lhs, rhs, exampleTokens[TokenType.Add]);

					if (shouldPass) expect(() => evaluate(input)).not.toThrow();
					else expect(() => evaluate(input)).toThrowError();
				});
			}
		});

		describe("subscript operand validity", () => {
			for (const [lhs, rhs] of tokenPermutations) {
				const shouldPass = (lhs[0] === TokenType.Atom || lhs instanceof Molecule) && rhs[0] === TokenType.Number;

				it(
					`subscription of ${TokenName[lhs[0]]} and ${TokenName[rhs[0]]} should ` + (shouldPass ? "pass" : "fail"),
					() => {
						const input = makeFIFO(lhs, rhs, exampleTokens[TokenType.Subscript]);

						if (shouldPass) expect(() => evaluate(input)).not.toThrow();
						else expect(() => evaluate(input)).toThrowError();
					},
				);
			}
		});

		describe("coefficient operand validity", () => {
			for (const [lhs, rhs] of tokenPermutations) {
				const shouldPass = lhs[0] === TokenType.Number && (rhs[0] === TokenType.Atom || rhs instanceof Molecule);

				it(
					`coefficient of ${TokenName[lhs[0]]} and ${TokenName[rhs[0]]} should ` + (shouldPass ? "pass" : "fail"),
					() => {
						const input = makeFIFO(lhs, rhs, exampleTokens[TokenType.Coefficient]);

						if (shouldPass) expect(() => evaluate(input)).not.toThrow();
						else expect(() => evaluate(input)).toThrowError();
					},
				);
			}
		});
	});
});
