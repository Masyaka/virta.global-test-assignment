import { DslAst } from "./dsl-transformer";

export const parse = (input: string): DslAst<any> => {
  return {
    steps: input
      .split("\n") // split to rows
      .map((r) => r.trim()) // clean spaces before and after
      .map((row) => row.replace(/\s{2}/g, " ")) // remove unnecessary spaces between
      .filter((s) => s !== "" && s !== " ") // remove empty rows
      .map((r) => {
        const [token, ...args] = r.split(" "); // split row to command and arguments
        return { token, args };
      }),
  };
};
