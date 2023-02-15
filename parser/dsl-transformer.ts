export type Dsl<O extends DslOperation<any, any>> = {
  [K in O["token"]]: K extends O["token"] ? DslOperationParser<O> : never;
};

export type DslOperation<W, Args extends readonly any[]> = {
  token: W;
  args: Args;
};

export type DslAst<O extends DslOperation<any, any>> = {
  steps: O[];
};
export type DslOperationParserArgsType<P> = P extends DslOperationParser<
  DslOperation<any, infer Args>
>
  ? Args
  : never;

type DslOperationParser<O extends DslOperation<any, any>> = {
  token: O["token"];
  parseArgs?: (args: readonly any[]) => O["args"];
  validateArgs?: (args: O["args"]) => void;
};
type Begin = DslOperation<"Begin", []>;
type End = DslOperation<"End", []>;
type Wait = DslOperation<"Wait", [number]>;
type Start = DslOperation<"Start", [string, number | "all"]>;
type Stop = DslOperation<"Stop", [string, number | "all"]>;

export type StationsLanguageOperations = Begin | End | Wait | Start | Stop;
const stationsLanguage = {
  Begin: { token: "Begin" },
  End: { token: "End" },
  Start: {
    token: "Start",
    parseArgs: ([kind, id]): Start["args"] => [
      kind,
      id === "all" ? id : Number(id),
    ],
    validateArgs: ([kind, id]) => {
      if (id !== "all" && !Number.isInteger(id)) throw new Error("Non int id");
    },
  },
  Stop: {
    token: "Stop",
    parseArgs: ([kind, id]): Stop["args"] => [
      kind,
      id === "all" ? id : Number(id),
    ],
    validateArgs: ([kind, id]) => {
      if (id !== "all" && !Number.isInteger(id)) throw new Error("Non int id");
    },
  },
  Wait: {
    token: "Wait",
    parseArgs: ([time]): Wait["args"] => [Number(time)],
    validateArgs: ([time]) => {
      if (Number.isNaN(time)) throw new Error("Non number time");
    },
  },
} as const satisfies Dsl<StationsLanguageOperations>;

export type StationsLanguage = typeof stationsLanguage;

type AstTransformer<In extends Dsl<any>, Out extends Dsl<any>> = (
  ast: DslAst<any>
) => DslAst<any>;
const pickFromBeginToStart: AstTransformer<
  StationsLanguage,
  StationsLanguage
> = (ast) => {
  const steps: StationsLanguageOperations[] = [];
  let began = false;
  let end = false;
  for (const step of ast.steps) {
    if (step.token === stationsLanguage.Begin.token) {
      began = true;
    }
    steps.push(step);
    if (step.token === stationsLanguage.End.token) {
      end = true;
      break;
    }
  }
  if (!began) {
    throw new Error(`"${stationsLanguage.Begin.token}" keyword expected.`);
  }
  if (!end) {
    throw new Error(`"${stationsLanguage.End.token}" keyword expected.`);
  }
  return {
    steps,
  };
};
const parseAndValidateCommands: AstTransformer<any, any> = (ast) => {
  const steps: DslOperation<any, any>[] = [];
  for (const step of ast.steps) {
    const parsedStep: DslOperation<any, any> = {
      token: step.token,
      args: [],
    };
    const parser: DslOperationParser<any> =
      stationsLanguage[step.token as keyof typeof stationsLanguage];
    if (!parser) {
      throw new Error(`Unexpected token ${step.token as string}`);
    }
    if ("parseArgs" in parser) {
      const parsedArgs = parser.parseArgs?.(step.args) || [];
      parser.validateArgs?.(parsedArgs);
      parsedStep.args = parsedArgs;
    }
    steps.push(parsedStep);
  }
  return {
    steps,
  };
};
const astTransformers: AstTransformer<any, StationsLanguage>[] = [
  pickFromBeginToStart,
  parseAndValidateCommands,
];
export const applyLanguageTransformations = (ast: DslAst<any>) => {
  return astTransformers.reduce(
    (resultAst, transformer) => transformer(resultAst),
    ast
  );
};
