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
import { tokenize, evaluate, toRPN, Molecule } from "stoik";
```

To evaluate a chemical formula using Stoik, you can use the `evaluate` function. This function takes a chemical formula as input and returns a `Molecule` instance, which is essentially an extension of Map and contains the atoms and their frequencies in the molecule. For example:

```js
const formula = "H2O";

evaluate(formula); // Map {"H" => 2, "O" => 1}

// Formulas can consist of fairly complicated operations as well.
evaluate("5(H2O)3((FeW)5CrMo2V)6CoMnSi");

// The result of the expression above is equivalent to:
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
]);
```

### Tokenization and Parsing

Alternatively, it's possible to `evaluate` formulas step-by-step, if you need to alter any of the steps.

The `tokenize` function combines the tokenization and parsing functionality. It is capable of detecting malformed formulas to some extent.
However, if the input is not a valid formula, the function is not guaranteed to return a sequence that will correctly evaluate into a Molecule.

```js
// First, tokenize the formula to get a Denque sequence of tokens.
const tokens = tokenize(formula);
// new Denque([
//   [TokenType.Atom, "H"],
//   [TokenType.Subscript],
//   [TokenType.Number, 2],
//   [TokenType.Add]
//   [TokenType.Atom, "O"]
// ]);
```

Before supplying the tokens to `evaluate`, they first have to be converted to the Reverse Polish Notation using `toRPN`.
Like `tokenize`, this function is not guaranteed to return a valid sequence of tokens if the input is inherently incorrect.

```js
// Next, convert the tokens to Reverse Polish Notation (RPN) using the toRPN function. Note the different order.
const RPN = toRPN(tokens);
// new Denque([
//   [TokenType.Atom, "H"],
//   [TokenType.Number, 2],
//   [TokenType.Subscript],
//   [TokenType.Atom, "O"],
//   [TokenType.Add]
// ]);
```

Finally, the RPN token sequence can be supplied to `evaluate` to evaluate the formula.
This will throw a concise error if the input is incorrect.

```js
evaluate(RPN); // Map {"H" => 2, "O" => 1}
```

## Molecule Class

The `Molecule` class includes methods for performing basic arithmetic operations on molecules.
By default, these methods return new `Molecule` instances, which means that they do not mutate the original molecule.
However, each method also has a mutable counterpart (e.g. `add` and `addMut`) that can be used to modify the original molecule instead.

An `AtomLiteral` is a type that represents a valid atom in a chemical molecule. It must be either a single uppercase letter (e.g. "H" for hydrogen), or a combination of an uppercase letter followed by a lowercase letter (e.g. "Cl" for chlorine).

Molecule objects can be constructed in several ways:
* With no arguments, to create an empty molecule
* With a single `AtomLiteral` argument, to create a molecule containing a single atom at a frequency of 1
* With a single `AtomLiteral` and a `number` argument, to create a molecule containing a single atom at a specified frequency
* With a `Molecule` argument, to create a new molecule with the same atoms and frequencies as the input molecule
* With an array of tuples, where each tuple contains an `AtomLiteral` and an optional `number`, to create a molecule containing the atoms and frequencies specified in the input array


The Molecule class also contains several methods for manipulating molecules:
* The `set` method can be used to add or update the frequency of an atom in the molecule
* The `add` method can be used to add a molecule to this molecule
* The `subtract` method can be used to subtract a molecule from this molecule
* The `multiply` method can be used to multiply this molecule by a number
* All other methods provided by the standard `Map` class

In addition, the `Molecule` class has a `fromAtom` static method that can be used to quickly create a molecule containing a single atom at a specified frequency.

## Design and Implementation

Stoik uses a combination of recursive descent parsing and the Shunting-yard algorithm to parse and evaluate chemical formulas. The `tokenize` function uses a simple state machine to split the input string into tokens, and the `evaluate` function uses a stack to evaluate the formula in RPN.

## License

Stoik is licensed under the LGPL 3.0 license. See the [LICENSE](./LICENSE) file for details.