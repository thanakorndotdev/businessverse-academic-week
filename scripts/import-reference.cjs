// Parse the reference's public content as an allowlisted data syntax. Never execute it.
const ts = require("typescript");
const fs = require("fs");
const sourcePath = process.argv[2];
if (!sourcePath)
  throw Error(
    "Usage: bun scripts/import-reference.cjs /path/to/public-reference-bundle.js",
  );
const source = fs.readFileSync(sourcePath, "utf8");
const tree = ts.createSourceFile(
  "reference.js",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
const values = {};
function read(n) {
  if (ts.isStringLiteralLike(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(read);
  if (ts.isObjectLiteralExpression(n))
    return n.properties.reduce((obj, p) => {
      if (ts.isSpreadAssignment(p))
        return Object.assign(obj, read(p.expression));
      if (!ts.isPropertyAssignment(p)) throw Error("unsupported property");
      obj[p.name.text] = read(p.initializer);
      return obj;
    }, {});
  if (ts.isPrefixUnaryExpression(n)) {
    const x = read(n.operand);
    if (n.operator === ts.SyntaxKind.MinusToken) return -x;
    if (n.operator === ts.SyntaxKind.ExclamationToken) return !x;
  }
  if (ts.isCallExpression(n)) {
    const a = n.arguments.map(read);
    if (n.expression.getText(tree) === "Z")
      return { id: a[0], title: a[1], detail: a[2], knowledge: a[3] };
    if (n.expression.getText(tree) === "Q")
      return {
        id: a[0],
        title: a[1],
        detail: a[2],
        effect: a[3],
        fit: Object.fromEntries(
          ["growth", "premium", "cost", "customer"].map((k, i) => [k, a[4][i]]),
        ),
      };
  }
  throw Error("Unsupported data syntax: " + n.getText(tree).slice(0, 100));
}
for (const s of tree.statements)
  if (ts.isVariableStatement(s))
    for (const d of s.declarationList.declarations)
      if (["ni", "ri", "ai", "oi"].includes(d.name.getText(tree)))
        values[d.name.getText(tree)] = read(d.initializer);
if (
  values.ai?.length !== 8 ||
  values.ai.some((d) => d.questions.length !== 3) ||
  values.ni?.length !== 4
)
  throw Error("Unexpected source structure");
fs.writeFileSync(
  "apps/api/src/game/reference.json",
  JSON.stringify(
    {
      objectives: values.ni,
      initialState: values.ri,
      departments: [0, 1, 2, 3, 6, 5, 4, 7].map((n, i) => ({
        ...values.ai[n],
        discipline: values.ai[n].discipline.replace(
          /^\d{2}/,
          String(i + 1).padStart(2, "0"),
        ),
      })),
      finalOptions: values.oi,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Imported 4 objectives, 8 departments, 24 original questions; source code was not executed.",
);
