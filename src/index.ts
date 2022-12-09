import TreeMap from "ts-treemap";
import FIFO from "fifo";

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
	"Molecule",
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
	[TokenType.Molecule]: "molecule",
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
	[TokenType.Molecule]: "molecule",
	[TokenType.Join]: "j",
});

type MoleculeToken = [TokenType.Molecule, TreeMap<string, number>];
type NumberToken = [TokenType.Number, number];
type AtomToken = [TokenType.Atom, string];

type AnyOperator = [Exclude<TokenType, TokenType.Number | TokenType.Atom>];
type AnyOperand = MoleculeToken | AtomToken | NumberToken;

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
 * An error thrown when an operator accepts invalid operands.
 */
export class InvalidOperationError extends Error {
	/**
	 * The lhs operand that caused the error.
	 */
	public readonly lhs: AnyOperand;

	/**
	 * The lhs operand that caused the error.
	 */
	public readonly rhs: AnyOperand;

	/**
	 * The lhs operand that caused the error.
	 */
	public readonly operator: AnyOperator;

	/**
	 * Creates a new malformed formula error.
	 * @param message The error message.
	 * @param index The index of the token that caused the error.
	 */
	public constructor(message: string, lhs: AnyOperand, rhs: AnyOperand, operator: AnyOperator) {
		super(message);
		this.lhs = lhs;
		this.rhs = rhs;
		this.operator = operator;

		Object.setPrototypeOf(this, MalformedFormulaError.prototype);
	}
}

/**
 * A tuple of token type and token value.
 */
export type TokenTuple = MoleculeToken | NumberToken | AtomToken | AnyOperator;

/**
 * Tokenizes a chemical formula.
 * @param equation The chemical formula to tokenize.
 * @returns An array of token tuples.
 */
export function tokenize(equation: string): FIFO<TokenTuple> {
	const tokens = equation.split("");

	let token: string;
	let idx = 0;
	let parens = 0;

	const result = FIFO<TokenTuple>();
	function pushTuple(tuple: TokenTuple) {
		result.push(tuple);
	}

	while ((token = tokens[idx])) {
		// Number.
		if (/[0-9]/.test(token)) {
			const number = [token];
			while ((token = tokens[++idx]) && /[0-9]/.test(token)) number.push(token);
			const value = +number.join("");

			const lastTuple = result.last();
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
			} else if (
				lastTuple[0] === TokenType.Atom ||
				lastTuple[0] === TokenType.Molecule ||
				lastTuple[0] === TokenType.GroupRight
			) {
				pushTuple([TokenType.Subscript]);
				pushTuple([TokenType.Number, value]);
			} else throw new MalformedFormulaError(`Unexpected number after ${TokenName[lastTuple[0]]}`, idx);
		}

		// Atom.
		else if (/[A-Z]/.test(token)) {
			const nextToken = tokens[idx + 1];

			const lastTuple = result.last();
			if (lastTuple) {
				const [lastType] = lastTuple;
				if (lastType === TokenType.Number || lastType === TokenType.Atom || lastType === TokenType.GroupRight)
					pushTuple([TokenType.Add]);
			}

			if (nextToken && /[a-z]/.test(nextToken)) {
				pushTuple([TokenType.Atom, token + nextToken]);
				idx++;
			} else pushTuple([TokenType.Atom, token]);

			idx++;
		}

		// Group start.
		else if (/\(/.test(token)) {
			const lastTuple = result.last();
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
export function toRPN(formula: string): FIFO<TokenTuple>;

/**
 * Converts a formula to the Reverse Polish Notation representation.
 * @param tokens The tokens to evaluate.
 * @returns The result of the formula.
 */
export function toRPN(tokens: FIFO<TokenTuple>): FIFO<TokenTuple>;

/**
 * Converts a formula to the Reverse Polish Notation representation.
 * @param input The formula to evaluate.
 * @returns The result of the formula.
 */
export function toRPN(input: any): FIFO<TokenTuple> {
	if (typeof input === "string") input = tokenize(input);

	const output = FIFO<TokenTuple>(),
		operatorStack: TokenTuple[] = [];

	const precedence = {
		[TokenType.Subscript]: 3,
		[TokenType.Add]: 2,
		[TokenType.Coefficient]: 1,
		[TokenType.Join]: 0,
		[TokenType.Subtract]: 0,
	};

	let node = input.next();
	const start = node;
	while (true) {
		const tuple = node.value;
		const [type] = node.value;

		switch (type) {
			case TokenType.Number:
			case TokenType.Atom:
				output.push(tuple);
				break;

			case TokenType.GroupLeft:
				operatorStack.push(node.value);
				break;

			case TokenType.GroupRight:
				while (operatorStack[operatorStack.length - 1][0] !== TokenType.GroupLeft) output.push(operatorStack.pop());

				operatorStack.pop();
				break;

			case TokenType.Add:
			case TokenType.Join:
			case TokenType.Coefficient:
			case TokenType.Subscript:
			case TokenType.Subtract:
				const prec = precedence[type];

				let top: TokenTuple;
				while ((top = operatorStack[operatorStack.length - 1]) && prec <= precedence[top[0]])
					output.push(operatorStack.pop());

				operatorStack.push(node.value);
				break;
		}

		node = node.next;
		if (node === start) break;
	}

	let tuple: TokenTuple;
	while ((tuple = operatorStack.pop())) output.push(tuple);

	return output;
}

/**
 * Adds or subtracts atoms and molecules one to, or from another.
 *
 * @param lhs Left-hand side operand, atom or molecule.
 * @param rhs Right-hand side operand, atom or molecule.
 * @param subtract Should we subtract instead?
 * @returns New molecule token.
 */
export function addOrSubtract(
	lhs: AtomToken | MoleculeToken,
	rhs: AtomToken | MoleculeToken,
	subtract?: boolean,
): MoleculeToken {
	const [leftType, left] = lhs;
	const [rightType, right] = rhs;

	// The result is always a molecule.
	const map = new TreeMap<string, number>();

	// Fill the map with the left side.
	if (leftType === TokenType.Molecule) map.setAll(left);
	else map.set(left, 1);

	// If the right side is an atom, it's just get and set.
	if (rightType === TokenType.Atom) {
		const freq = map.get(right) || 0;

		// Do not leave zeroes in molecules.
		if (subtract && left === right) map.delete(right);
		// Add otherwise.
		else map.set(right, !subtract ? freq + 1 : freq - 1);
	}
	// Otherwise it's a molecule, iterate each rhs atom/freq and add/subtract.
	else if (rightType === TokenType.Molecule) {
		right.forEach((rightFreq, atom) => {
			const leftFreq = map.get(atom) || 0;

			// Do not leave zeroes in molecules.
			if ((subtract && leftFreq - rightFreq === 0) || leftFreq + rightFreq === 0) map.delete(atom);
			// Add otherwise.
			else map.set(atom, !subtract ? leftFreq + rightFreq : leftFreq - rightFreq);
		});
	}

	return [TokenType.Molecule, map];
}

/**
 * Evaluates a formula.
 * @param formula The formula to evaluate.
 * @returns The result of the formula.
 */
export function evaluate(formula: string): TokenTuple;

/**
 * Evaluates a formula.
 * @param tokens The tokens to evaluate.
 * @returns The result of the formula.
 */
export function evaluate(tokens: FIFO<TokenTuple>): TokenTuple;

/**
 * Evaluates a formula.
 * @param input The formula to evaluate.
 * @returns The result of the formula.
 */
export function evaluate(input: string | FIFO<TokenTuple>): TokenTuple {
	// If the input is a string, convert it to RPN.
	if (typeof input === "string") input = toRPN(tokenize(input));

	if (input.isEmpty()) throw new Error("Empty input");

	// Create a stack for operands.
	const operandStack = FIFO<TokenTuple>();

	// Create a reference to the start of the input.
	let node = input.next();
	const start = node;

	// Loop until we reach the start of the input again.
	while (true) {
		// Unbox the current token and get the type.
		const tuple = node.value;
		const [type] = tuple;

		switch (type) {
			// If the token is a number or atom, push it to the stack.
			case TokenType.Number:
			case TokenType.Molecule:
			case TokenType.Atom:
				operandStack.push(tuple);
				break;

			// If the token is a binary operator, pop two operands from the stack.
			case TokenType.Add:
			case TokenType.Subtract:
			case TokenType.Coefficient:
			case TokenType.Subscript:
			case TokenType.Join:
				if (operandStack.isEmpty()) throw new Error("Unexpected end of input (expected lhs value, got none)");
				const leftTuple = operandStack.pop() as unknown as AnyOperand;
				const [leftType, left] = leftTuple;

				if (operandStack.isEmpty()) throw new Error("Unexpected end of input (expected rhs value, got none)");
				const rightTuple = operandStack.pop() as unknown as AnyOperand;
				const [rightType, right] = rightTuple;

				// Switch on the type of the operator.
				switch (type) {
					case TokenType.Subscript:
						// If the operator is a subscript, check that the right operand is a number.
						if (leftType !== TokenType.Number) {
							throw new InvalidOperationError(
								`Bad rhs operand for subscript (expected number, got ${leftType})`,
								rightTuple,
								leftTuple,
								tuple,
							);
						}

						switch (rightType) {
							// If the left operand is an atom, create a new molecule using the atom and the subscript.
							case TokenType.Atom:
								const treemap = new TreeMap<string, number>();
								treemap.set(right, left);

								operandStack.push([TokenType.Molecule, treemap]);
								break;

							// If the left operand is a molecule, multiply the frequency of each atom by the subscript.
							case TokenType.Molecule:
								for (const [atom, frequency] of Array.from(right.entries())) right.set(atom, frequency * left);
								operandStack.push([TokenType.Molecule, right]);
								break;

							default:
								throw new InvalidOperationError(
									`Bad lhs operand for subscript (expected atom or molecule, got ${TokenName[leftType]})`,
									rightTuple,
									leftTuple,
									tuple,
								);
						}
						break;

					case TokenType.Coefficient:
						// If the operator is a coefficient, check that the left operand is a number.
						if (rightType !== TokenType.Number) {
							throw new InvalidOperationError(
								`Bad lhs operand for coefficient (expected number, got ${TokenName[rightType]})`,
								rightTuple,
								leftTuple,
								tuple,
							);
						}

						switch (leftType) {
							// If the right operand is an atom, create a new molecule with the atom and the coefficient.
							case TokenType.Atom:
								const treemap = new TreeMap<string, number>();
								treemap.set(left, right);

								operandStack.push([TokenType.Molecule, treemap]);
								break;

							// If the right operand is a molecule, multiply the frequency of each atom by the coefficient.
							case TokenType.Molecule:
								left.forEach((frequency, atom) => left.set(atom, frequency * right));
								operandStack.push([TokenType.Molecule, left]);
								break;

							default:
								throw new InvalidOperationError(
									`Bad rhs operand for coefficient (expected atom or molecule, got ${TokenName[leftType]})`,
									rightTuple,
									leftTuple,
									tuple,
								);
						}
						break;

					case TokenType.Subtract:
					case TokenType.Join:
					case TokenType.Add:
						if (rightType !== TokenType.Molecule && rightType !== TokenType.Atom) {
							throw new InvalidOperationError(
								`Bad lhs operand for ${TokenName[type]} (expected molecule or atom, got ${TokenName[rightType]})`,
								rightTuple,
								leftTuple,
								tuple,
							);
						}

						if (leftType !== TokenType.Molecule && leftType !== TokenType.Atom) {
							throw new InvalidOperationError(
								`Bad rhs operand for ${TokenName[type]} (expected molecule or atom, got ${TokenName[leftType]})`,
								rightTuple,
								leftTuple,
								tuple,
							);
						}

						const sign = type === TokenType.Subtract ? true : false;

						operandStack.push(
							addOrSubtract(
								rightTuple as unknown as MoleculeToken | AtomToken,
								leftTuple as unknown as MoleculeToken | AtomToken,
								sign,
							),
						);
						break;
				}
				break;

			default:
				throw new Error(`Unknown token on the input stack: ${TokenName[type]}`);
		}

		node = node.next;
		if (node === start) break;
	}

	const value = operandStack.pop() as unknown as TokenTuple;

	return value;
}
