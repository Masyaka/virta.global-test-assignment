import { expect } from "chai";
import { describe, it } from "mocha";
import { DslAst, applyLanguageTransformations } from "../dsl-transformer";
import { parse } from "../dsl-parser";

const input = `
Begin
Start station 1
Wait 5
Start station 2
Wait 10
Start station all
Wait 10
Stop station 2
Wait 10
Stop station 3
Wait 5
Stop station all
End
`;

const rawAst: DslAst<any> = {
  steps: [
    { token: "Begin", args: [] },
    { token: "Start", args: ["station", "1"] },
    {
      token: "Wait",
      args: ["5"],
    },
    { token: "Start", args: ["station", "2"] },
    { token: "Wait", args: ["10"] },
    {
      token: "Start",
      args: ["station", "all"],
    },
    { token: "Wait", args: ["10"] },
    { token: "Stop", args: ["station", "2"] },
    {
      token: "Wait",
      args: ["10"],
    },
    { token: "Stop", args: ["station", "3"] },
    { token: "Wait", args: ["5"] },
    {
      token: "Stop",
      args: ["station", "all"],
    },
    { token: "End", args: [] },
  ],
};

const parsedAst: DslAst<any> = {
  steps: [
    { token: "Begin", args: [] },
    { token: "Start", args: ["station", 1] },
    {
      token: "Wait",
      args: [5],
    },
    { token: "Start", args: ["station", 2] },
    { token: "Wait", args: [10] },
    {
      token: "Start",
      args: ["station", "all"],
    },
    { token: "Wait", args: [10] },
    { token: "Stop", args: ["station", 2] },
    {
      token: "Wait",
      args: [10],
    },
    { token: "Stop", args: ["station", 3] },
    { token: "Wait", args: [5] },
    {
      token: "Stop",
      args: ["station", "all"],
    },
    { token: "End", args: [] },
  ],
};

describe("dsl parser", () => {
  it("parses input to AST like structure", () => {
    const result = parse(input);
    expect(result).to.be.eql(rawAst);
  });
  it("transforms AST as with language rules", () => {
    const result = applyLanguageTransformations(rawAst);
    expect(result).to.be.eql(parsedAst);
  });
});
