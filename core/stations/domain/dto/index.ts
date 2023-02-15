import { Company } from "../entities/company";
import { Station } from "../entities/station";
import { StationType } from "../entities/station-type";

export type StationWithType<S extends Station> = S & {
  type: StationType;
};

export type StationWithCompany<
  S extends Station,
  C extends Company = Company
> = S & {
  company: C;
};

export type StationWithOwnerCompanies<S extends Station> = S & {
  ownerCompaniesIds: Company["id"][];
};

export type StationWithTypeAndOwnerCompanies = StationWithType<
  StationWithOwnerCompanies<Station>
>;
