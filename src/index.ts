import { AtomLiteral, Molecule } from "./impl/Molecule";
import Denque from "denque";

/**
 * The type of a token.
 */
export enum TokenType {
	"GroupLeft",
	"GroupRight",
	"Number",
	"Add",
	"Subtract",
	"Atom",
	"Coefficient",
	"Subscript",
	"Join",
}

export const TokenName: Readonly<Record<TokenType, string>> = Object.freeze({
	[TokenType.GroupLeft]: "left parenthesis",
	[TokenType.GroupRight]: "right parenthesis",
	[TokenType.Number]: "number",
	[TokenType.Add]: "plus",
	[TokenType.Subtract]: "minus",
	[TokenType.Atom]: "atom",
	[TokenType.Coefficient]: "coefficient",
	[TokenType.Subscript]: "subscript",
	[TokenType.Join]: "join",
});

export const TokenOp: Readonly<Record<TokenType, string>> = Object.freeze({
	[TokenType.GroupLeft]: "(",
	[TokenType.GroupRight]: ")",
	[TokenType.Number]: "number",
	[TokenType.Add]: "+",
	[TokenType.Subtract]: "minus",
	[TokenType.Atom]: "atom",
	[TokenType.Coefficient]: "^",
	[TokenType.Subscript]: "v",
	[TokenType.Join]: "j",
});

export type NumberToken = [TokenType.Number, number];
export type AtomToken = [TokenType.Atom, AtomLiteral];

export type AnyOperator = [Exclude<TokenType, TokenType.Number | TokenType.Atom>];
export type AnyToken = NumberToken | AtomToken | AnyOperator;

export type AnyOperand = Molecule | AtomToken | NumberToken;
export type AnyEvaluatable = AnyOperator | AnyOperand;
export type AnyEvaluated = Molecule | AtomLiteral | number;

/**
 * An error thrown when a chemical formula is malformed.
 */
export class MalformedFormulaError extends Error {
	/**
	 * The index of the token that caused the error.
	 */
	public readonly index: number;

	/**
	 * Creates a new malformed formula error.
	 * @param message The error message.
	 * @param index The index of the token that caused the error.
	 */
	public constructor(message: string, index: number) {
		super(message);
		this.index = index;

		Object.setPrototypeOf(this, MalformedFormulaError.prototype);
	}
}

/**
 * Tokenizes a chemical formula.
 * @param equation The chemical formula to tokenize.
 * @returns An array of token tuples.
 */
export function tokenize(equation: string): Denque<AnyToken> {
	const tokens = equation.split("");

	let token: string;
	let idx = 0;
	let parens = 0;

	const result = new Denque<AnyToken>();
	function pushTuple(tuple: AnyToken) {
		result.push(tuple);
	}

	while ((token = tokens[idx])) {
		// Number.
		if (/[0-9]/.test(token)) {
			const number = [token];
			while ((token = tokens[++idx]) && /[0-9]/.test(token)) number.push(token);
			const value = +number.join("");

			const lastTuple = result.peekBack();
			if (lastTuple && lastTuple[0] === TokenType.Number) {
				pushTuple([TokenType.Subscript]);
				pushTuple([TokenType.Number, value]);
			} else if (
				!lastTuple ||
				lastTuple[0] === TokenType.GroupLeft ||
				lastTuple[0] === TokenType.Join ||
				lastTuple[0] === TokenType.Subtract
			) {
				pushTuple([TokenType.Number, value]);
				pushTuple([TokenType.Coefficient]);
			} else if (lastTuple[0] === TokenType.Atom || lastTuple[0] === TokenType.GroupRight) {
				pushTuple([TokenType.Subscript]);
				pushTuple([TokenType.Number, value]);
			} else throw new MalformedFormulaError(`Unexpected number after ${TokenName[lastTuple[0]]}`, idx);
		}

		// Atom.
		else if (/[A-Z]/.test(token)) {
			const nextToken = tokens[idx + 1];

			const lastTuple = result.peekBack();
			if (lastTuple) {
				const [lastType] = lastTuple;
				if (lastType === TokenType.Number || lastType === TokenType.Atom || lastType === TokenType.GroupRight)
					pushTuple([TokenType.Add]);
			}

			if (nextToken && /[a-z]/.test(nextToken)) {
				pushTuple([TokenType.Atom, (token + nextToken) as AtomLiteral]);
				idx++;
			} else pushTuple([TokenType.Atom, token as AtomLiteral]);

			idx++;
		}

		// Group start.
		else if (/\(/.test(token)) {
			const lastTuple = result.peekBack();
			if (lastTuple) {
				const [lastType] = lastTuple;
				if (lastType === TokenType.Number || lastType === TokenType.Atom || lastType === TokenType.GroupRight)
					pushTuple([TokenType.Add]);
			}

			pushTuple([TokenType.GroupLeft]);
			idx++;
			parens += 1;
		}

		// Group end.
		else if (token.match(/\)/)) {
			if (parens === 0) throw new MalformedFormulaError("Unmatched right bracket", idx);

			pushTuple([TokenType.GroupRight]);
			idx++;
			parens -= 1;
		}

		// Plus sign.
		else if (token.match(/\+/)) {
			pushTuple([TokenType.Join]);
			idx++;
		}

		// Plus sign.
		else if (token.match(/\-/)) {
			pushTuple([TokenType.Subtract]);
			idx++;
		}

		// Ignore spaces.
		else if (token.match(/\s/)) idx++;
		// Throw on unknowns.
		else throw new MalformedFormulaError(`Unexpected token ${token}`, idx);
	}

	if (parens !== 0) throw new MalformedFormulaError("Unmatched left bracket", idx);

	return result;
}

/**
 * Converts a formula to the Reverse Polish Notation representation.
 * @param formula The formula to convert.
 * @returns The RPN representation.
 */
export function toRPN(formula: string): Denque<AnyToken>;

/**
 * Converts a formula to the Reverse Polish Notation representation.
 * @param tokens The tokens to evaluate.
 * @returns The result of the formula.
 */
export function toRPN(tokens: Denque<AnyToken>): Denque<AnyToken>;

/**
 * Converts a formula to the Reverse Polish Notation representation.
 * @param input The formula to evaluate.
 * @returns The result of the formula.
 */
export function toRPN(input: string | Denque<AnyToken>): Denque<AnyEvaluatable> {
	if (typeof input === "string") input = tokenize(input);
	else input = new Denque(input.toArray());

	const output = new Denque<AnyToken>(),
		operatorStack = new Denque<AnyOperator>();

	const precedence = {
		[TokenType.Subscript]: 3,
		[TokenType.Add]: 2,
		[TokenType.Coefficient]: 1,
		[TokenType.Join]: 0,
		[TokenType.Subtract]: 0,
	};

	while (true) {
		const token = input.shift();
		if (!token) break;

		const [type] = token;

		switch (type) {
			case TokenType.Number:
			case TokenType.Atom:
				output.push(token as NumberToken | AtomToken);
				break;

			case TokenType.GroupLeft:
				operatorStack.push(token);
				break;

			case TokenType.GroupRight:
				while (operatorStack.peekBack()?.[0] !== TokenType.GroupLeft) output.push(operatorStack.pop());

				operatorStack.pop();
				break;

			case TokenType.Add:
			case TokenType.Join:
			case TokenType.Coefficient:
			case TokenType.Subscript:
			case TokenType.Subtract:
				const prec = precedence[type];

				let top: AnyToken;
				while ((top = operatorStack.peekBack()) && prec <= precedence[top[0]]) output.push(operatorStack.pop());

				operatorStack.push(token);
				break;
		}
	}

	let tuple: AnyToken;
	while ((tuple = operatorStack.pop())) output.push(tuple);

	return output;
}

/**
 * Evaluates a formula.
 * @param formula The formula to evaluate.
 * @returns The result of the formula.
 */
export function evaluate(formula: string): AnyEvaluated;

/**
 * Evaluates a formula.
 * @param tokens The tokens to evaluate.
 * @returns The result of the formula.
 */
export function evaluate(tokens: Denque<AnyEvaluatable>): AnyEvaluated;

export function evaluate(input: string | Denque<AnyEvaluatable>): AnyEvaluated {
	// If the input is a string, convert it to RPN.
	if (typeof input === "string") input = toRPN(tokenize(input));
	else input = new Denque(input.toArray());

	if (input.isEmpty()) throw new Error("Empty input");

	// Create a stack for operands.
	const operandStack = new Denque<AnyEvaluatable>();

	// Loop until we reach the start of the input again.
	while (true) {
		const token = input.shift();
		if (!token) break;

		if (token instanceof Molecule) operandStack.push(token);
		else {
			// Unbox the current token and get the type.
			const [operatorType] = token;

			switch (operatorType) {
				// If the token is a number or atom, push it to the stack.
				case TokenType.Number:
				case TokenType.Atom:
					operandStack.push(token);
					break;

				// If the token is a binary operator, pop two operands from the stack.
				case TokenType.Add:
				case TokenType.Subtract:
				case TokenType.Coefficient:
				case TokenType.Subscript:
				case TokenType.Join:
					if (operandStack.isEmpty()) throw new Error("Unexpected end of input (expected rhs value, got none)");
					const rightEvaluatable = operandStack.pop() as unknown as AnyEvaluatable;

					if (operandStack.isEmpty()) throw new Error("Unexpected end of input (expected lhs value, got none)");
					const leftEvaluatable = operandStack.pop() as unknown as AnyEvaluatable;

					switch (operatorType) {
						case TokenType.Subscript: {
							// LHS must be atom or molecule.
							if (!(leftEvaluatable instanceof Molecule) && leftEvaluatable[0] !== TokenType.Atom) {
								throw new Error(
									`Bad lhs operand for ${TokenName[operatorType]} (expected molecule or atom, got ${
										TokenName[leftEvaluatable[0]]
									})`,
								);
							}

							// RHS must be number only.
							if (rightEvaluatable[0] !== TokenType.Number) {
								throw new Error(
									`Bad rhs operand for ${TokenName[operatorType]} (expected number, got ${
										TokenName[rightEvaluatable[0]]
									})`,
								);
							}

							const molecule =
								leftEvaluatable instanceof Molecule ? leftEvaluatable : Molecule.fromAtom(leftEvaluatable[1]);

							operandStack.push(molecule.multiplyMut(rightEvaluatable[1]));

							break;
						}

						case TokenType.Coefficient: {
							// LHS must be number only.
							if (leftEvaluatable[0] !== TokenType.Number) {
								throw new Error(
									`Bad rhs operand for ${TokenName[operatorType]} (expected number, got ${
										TokenName[leftEvaluatable[0]]
									})`,
								);
							}

							// RHS must be atom or molecule.
							if (!(rightEvaluatable instanceof Molecule) && rightEvaluatable[0] !== TokenType.Atom) {
								throw new Error(
									`Bad lhs operand for ${TokenName[operatorType]} (expected molecule or atom, got ${
										TokenName[rightEvaluatable[0]]
									})`,
								);
							}

							const molecule =
								rightEvaluatable instanceof Molecule ? rightEvaluatable : Molecule.fromAtom(rightEvaluatable[1]);

							operandStack.push(molecule.multiplyMut(leftEvaluatable[1]));

							break;
						}

						case TokenType.Subtract:
						case TokenType.Join:
						case TokenType.Add: {
							// LHS must be atom or molecule.
							if (!(leftEvaluatable instanceof Molecule) && leftEvaluatable[0] !== TokenType.Atom) {
								throw new Error(
									`Bad lhs operand for ${TokenName[operatorType]} (expected molecule or atom, got ${
										TokenName[leftEvaluatable[0]]
									})`,
								);
							}

							// RHS must be atom or molecule.
							if (!(rightEvaluatable instanceof Molecule) && rightEvaluatable[0] !== TokenType.Atom) {
								throw new Error(
									`Bad rhs operand for ${TokenName[operatorType]} (expected molecule or atom, got ${
										TokenName[rightEvaluatable[0]]
									})`,
								);
							}

							const molecule =
								leftEvaluatable instanceof Molecule ? leftEvaluatable : Molecule.fromAtom(leftEvaluatable[1]);

							if (operatorType === TokenType.Subtract) {
								if (rightEvaluatable instanceof Molecule) molecule.subtractMut(rightEvaluatable);
								else molecule.subtractMut(rightEvaluatable[1]);
							} else {
								if (rightEvaluatable instanceof Molecule) molecule.addMut(rightEvaluatable);
								else molecule.addMut(rightEvaluatable[1]);
							}

							operandStack.push(molecule);

							break;
						}
					}

					break;
			}
		}
	}

	const evaluated = operandStack.pop() as unknown as AnyOperand;
	if (!(evaluated instanceof Molecule)) {
		const [, value] = evaluated;
		return value;
	}

	return evaluated;
}
