type MathFunction = (value: number) => number;

const FUNCTIONS: Record<string, MathFunction> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
};

const MAX_EXPRESSION_LENGTH = 256;
const MAX_PARSE_STEPS = 128;
const MAX_NESTING = 32;

export function evaluateMathExpression(expression: string, x: number): number {
  if (!expression.trim() || expression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error("Введите выражение длиной не более 256 символов.");
  }
  if (!Number.isFinite(x)) {
    throw new Error("Значение X должно быть конечным числом.");
  }

  let position = 0;
  let parseSteps = 0;
  let nesting = 0;

  function skipWhitespace() {
    while (/\s/.test(expression[position] ?? "")) position += 1;
  }

  function step() {
    parseSteps += 1;
    if (parseSteps > MAX_PARSE_STEPS) {
      throw new Error("Выражение слишком сложное.");
    }
  }

  function read(character: string) {
    skipWhitespace();
    if (expression[position] === character) {
      position += 1;
      step();
      return true;
    }
    return false;
  }

  function parseExpression(): number {
    let value = parseProduct();
    while (true) {
      if (read("+")) value += parseProduct();
      else if (read("-")) value -= parseProduct();
      else return value;
      step();
    }
  }

  function parseProduct(): number {
    let value = parseUnary();
    while (true) {
      if (read("*")) value *= parseUnary();
      else if (read("/")) {
        const divisor = parseUnary();
        if (divisor === 0) throw new Error("Деление на ноль.");
        value /= divisor;
      } else {
        return value;
      }
      step();
    }
  }

  function parseUnary(): number {
    if (read("+")) return parseUnary();
    if (read("-")) return -parseUnary();
    return parsePower();
  }

  function parsePower(): number {
    const base = parsePrimary();
    return read("^") ? base ** parseUnary() : base;
  }

  function enterNesting() {
    nesting += 1;
    if (nesting > MAX_NESTING) {
      throw new Error("Слишком много вложенных скобок.");
    }
  }

  function parsePrimary(): number {
    skipWhitespace();
    step();

    if (read("(")) {
      enterNesting();
      const value = parseExpression();
      if (!read(")")) throw new Error("Не закрыта скобка.");
      nesting -= 1;
      return value;
    }

    const remaining = expression.slice(position);
    const number = remaining.match(
      /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/,
    );
    if (number) {
      position += number[0].length;
      return Number(number[0]);
    }

    const identifier = remaining.match(/^[a-zA-Z]+/);
    if (identifier) {
      position += identifier[0].length;
      const name = identifier[0].toLowerCase();
      if (name === "x") return x;
      if (name === "pi") return Math.PI;
      if (name === "e") return Math.E;
      const mathFunction = FUNCTIONS[name];
      if (!mathFunction) throw new Error(`Неизвестная функция: ${name}.`);
      if (!read("(")) {
        throw new Error(`После функции ${name} нужны скобки.`);
      }
      enterNesting();
      const argument = parseExpression();
      if (!read(")")) throw new Error(`Не закрыта скобка функции ${name}.`);
      nesting -= 1;
      return mathFunction(argument);
    }

    throw new Error("Ожидалось число, X, функция или скобка.");
  }

  const result = parseExpression();
  skipWhitespace();
  if (position !== expression.length) {
    throw new Error(`Неожиданный символ: ${expression[position]}.`);
  }
  if (!Number.isFinite(result)) {
    throw new Error("Результат выражения не является конечным числом.");
  }
  return result;
}

export function sampleMathExpression(
  expression: string,
  minimum: number,
  maximum: number,
  sampleCount = 41,
) {
  if (
    !Number.isFinite(minimum) ||
    !Number.isFinite(maximum) ||
    minimum >= maximum ||
    minimum < -1_000_000 ||
    maximum > 1_000_000
  ) {
    throw new Error("Укажите корректный диапазон X от -1 000 000 до 1 000 000.");
  }
  if (!Number.isInteger(sampleCount) || sampleCount < 2 || sampleCount > 101) {
    throw new Error("Количество точек должно быть от 2 до 101.");
  }

  return Array.from({ length: sampleCount }, (_, index) => {
    const x = minimum + ((maximum - minimum) * index) / (sampleCount - 1);
    const y = evaluateMathExpression(expression, x);
    return { x: String(Number(x.toPrecision(8))), y };
  });
}
