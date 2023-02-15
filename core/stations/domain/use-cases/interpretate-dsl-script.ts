import { indexBy, prop, complement, equals } from "ramda";
import {
  DslAst,
  DslOperation,
  DslOperationParserArgsType,
  StationsLanguage,
  StationsLanguageOperations,
} from "../../../../parser/dsl-transformer";
import { StationsRepository } from "../../application/repository";
import { StationWithTypeAndOwnerCompanies } from "../dto";
import { Company } from "../entities/company";
import { Station } from "../entities/station";

const supportedKinds = ["station"];
type Step = {
  step: string;
  timestamp: number;
  companies: {
    id: Company["id"];
    chargingStations: Station["id"][];
    chargingPower: number;
  }[];
  totalChargingStations: Station["id"][];
  totalChargingPower: number;
};
type TimeSeries = {
  data: Step[];
  startTime: number;
};

const copyStep = (s: Step, c: string) => {
  return {
    step: c,
    timestamp: s.timestamp,
    totalChargingStations: [...s.totalChargingStations],
    totalChargingPower: s.totalChargingPower,
    companies: s.companies.map((c) => ({
      ...c,
      chargingStations: [...c.chargingStations],
    })),
  };
};
const describeStep = (step: DslOperation<any, any>) => {
  return step.token + step.args.map((a: any) => " " + a).join("");
};
const commandsEffects: {
  [K in keyof StationsLanguage]: (
    t: TimeSeries,
    step: DslOperation<K, DslOperationParserArgsType<StationsLanguage[K]>>,
    stations: Map<Station["id"], StationWithTypeAndOwnerCompanies>
  ) => TimeSeries;
} = {
  Begin: (t, step) => {
    t.data.push({
      step: describeStep(step),
      timestamp: t.startTime,
      companies: [],
      totalChargingPower: 0,
      totalChargingStations: [],
    });
    return t;
  },
  Start: (t, step, stations) => {
    const [kind, stationId] = step.args;
    if (!supportedKinds.includes(kind)) {
      throw new Error(`${kind} kind not supported for in action.`);
    }

    const targetStations =
      stationId === "all" ? stations.values() : [stations.get(stationId)];
    const prevStep = t.data[t.data.length - 1];
    const newStep = copyStep(prevStep, describeStep(step));
    const companiesIndex = indexBy(prop("id"), newStep.companies);
    for (const station of targetStations) {
      if (!station) throw new Error(`Station is not found. ${stationId}`);
      const isAlreadyStarted = prevStep.totalChargingStations.includes(
        station.id
      );
      if (isAlreadyStarted) continue; // throw already started?
      newStep.totalChargingPower += station.type.maxPower;
      newStep.totalChargingStations.push(station.id);
      station.ownerCompaniesIds.forEach((ownerCompanyId) => {
        if (companiesIndex[ownerCompanyId]) {
          companiesIndex[ownerCompanyId].chargingStations.push(station.id);
          companiesIndex[ownerCompanyId].chargingPower += station.type.maxPower;
        } else {
          companiesIndex[ownerCompanyId] = {
            chargingPower: station.type.maxPower,
            id: ownerCompanyId,
            chargingStations: [station.id],
          };
        }
      });
    }
    newStep.companies = Object.values(companiesIndex);
    t.data.push(newStep);

    return t;
  },
  End: (t, step) => {
    t.data.push(copyStep(t.data[t.data.length - 1], describeStep(step)));
    return t;
  },
  Stop: (t, step, stations) => {
    const [kind, stationId] = step.args;
    if (!supportedKinds.includes(kind)) {
      throw new Error(`${kind} kind not supported for in action.`);
    }

    const targetStations =
      stationId === "all" ? stations.values() : [stations.get(stationId)];
    const prevStep = t.data[t.data.length - 1];
    const newStep = copyStep(prevStep, describeStep(step));
    const companiesIndex = indexBy(prop("id"), newStep.companies);
    for (const station of targetStations) {
      if (!station) throw new Error(`Station is not found. ${stationId}`);
      const isAlreadyStarted = prevStep.totalChargingStations.includes(
        station.id
      );
      if (!isAlreadyStarted) continue;
      newStep.totalChargingPower -= station.type.maxPower;
      const isAnotherId = complement(equals(station.id));
      newStep.totalChargingStations =
        newStep.totalChargingStations.filter(isAnotherId);
      station.ownerCompaniesIds.forEach((ownerCompanyId) => {
        if (companiesIndex[ownerCompanyId]) {
          companiesIndex[ownerCompanyId].chargingPower -= station.type.maxPower;
          companiesIndex[ownerCompanyId].chargingStations =
            companiesIndex[ownerCompanyId].chargingStations.filter(isAnotherId);

          if (companiesIndex[ownerCompanyId].chargingStations.length === 0) {
            delete companiesIndex[ownerCompanyId];
          }
        } else {
          // throw already stopped?
        }
      });
    }
    newStep.companies = Object.values(companiesIndex);
    t.data.push(newStep);

    return t;
  },
  Wait: (t, step) => {
    const newStep = copyStep(t.data[t.data.length - 1], describeStep(step));
    newStep.timestamp += step.args[0] * 1000;
    t.data.push(newStep);
    return t;
  },
};

export const interpretateDslScriptCreator =
  (
    parseScript: (input: string) => DslAst<StationsLanguageOperations>,
    repo: StationsRepository
  ) =>
  async (input: string, time: Date) => {
    const ast = parseScript(input);
    let timeSeries: TimeSeries = {
      data: [],
      startTime: +time,
    };
    let stationsIds: Set<Station["id"]> | "all" = new Set<Station["id"]>();
    for (const step of ast.steps) {
      if (step.token === "Start" && step.args[0] === "station") {
        if (step.args[1] === "all") {
          stationsIds = "all";
          break;
        }
        stationsIds.add(step.args[1]);
      }
    }

    const stations: StationWithTypeAndOwnerCompanies[] =
      stationsIds === "all"
        ? await repo.getAllStations()
        : await repo.getStationsByIds(Array.from(stationsIds.values()));

    for (const step of ast.steps) {
      timeSeries = commandsEffects[step.token](
        timeSeries,
        step as any,
        stations.reduce((m, s) => {
          m.set(s.id, s);
          return m;
        }, new Map())
      );
    }

    return timeSeries;
  };
