# Stoik
Stoik is a TypeScript library for parsing and evaluating chemical formulas.

## Installation
To install Stoik, run the following command:

```
npm install stoik
```

## Usage

To use Stoik in your project, import the `evaluate` function as well as any other necessary functions for your project:

```js
import { tokenize, evaluate, toRPN, getConstituents, addOrSubtract } from "stoik";
```
You can then use the `evaluate` function to evaluate a chemical formula and obtain the result:

```js
const formula = "H2O";

// Use the evaluate function to evaluate the formula. This results in an internal token.
const result = evaluate("H2O");
// [TokenType.Molecule, TreeMap([["H": 2], ["O": 1]])]

// Use the getConstituents function to extract the resulting constituents from a molecule/atom token.
const constituents = getConstituents(result);
// TreeMap([["H": 2], ["O": 1]])
```

Alternatively, it's possible to `evaluate` formulas step-by-step, if you need to alter any.

```js
// First, tokenize the formula to get a FIFO object of tokens.
const tokens = tokenize(formula);
// [
//   [TokenType.Atom, "H"],
//   [TokenType.Subscript],
//   [TokenType.Number, 2],
//   [TokenType.Add]
//   [TokenType.Atom, "O"]
// ]

// Next, convert the tokens to Reverse Polish Notation (RPN) using the toRPN function. Note the different order.
const RPN = toRPN(tokens);
// [
//   [TokenType.Atom, "H"],
//   [TokenType.Number, 2],
//   [TokenType.Subscript],
//   [TokenType.Atom, "O"],
//   [TokenType.Add]
// ]

// Finally, use the evaluate function to evaluate the formula in RPN.
const result = evaluate(RPN);
// [TokenType.Molecule, TreeMap([["H": 2], ["O": 1]])]
```

You can also use the `addOrSubtract` function to add or subtract two atoms or molecules:

```js
// Add CaCO3 to H2O.
const newMolecule = addOrSubtract(evaluate("H2O"),
	evaluate("CaCO3"));
// [TokenType.Molecule, TreeMap([["H": 2], ["O": 4], ["C": 1], ["Ca": 1]])]

// Subtract CaCO3 from H2O.
const newMolecule = addOrSubtract(evaluate("H2O"),
	evaluate("CaCO3"), true);
// [TokenType.Molecule, TreeMap([["H": 2], ["O": -2], ["C": -1], ["Ca": -1]])]
```

## Design and Implementation

Stoik uses a combination of recursive descent parsing and the Shunting-yard algorithm to parse and evaluate chemical formulas. The `tokenize` function uses a simple state machine to split the input string into tokens, and the `evaluate` function uses a stack to evaluate the formula in RPN. The `addOrSubtract` function uses the `TreeMap` class to add or subtract the atoms and molecules in two molecules.

## License

Stoik is licensed under the LGPL 3.0 license. See the [LICENSE](./LICENSE) file for details.