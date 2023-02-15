import { complement, equals, prop, both } from "ramda";
import { DataSource, DeepPartial, Equal, In, Like } from "typeorm";
import {
  StationWithCompany,
  StationWithType,
  StationWithTypeAndOwnerCompanies,
} from "../domain/dto";
import { StationEntities } from "../domain/entities";
import { Station } from "../domain/entities/station";
import {
  CompanyEntity,
  ROOT_NODE_ID,
  StationsEntitiesMapping,
} from "../infrastructure/db/mappings";

const notRoot = complement(equals(ROOT_NODE_ID));
const notEmpty = complement(equals(""));
const notRootOrEmpty = both(notRoot, notEmpty);
const getParentsIds = (c: CompanyEntity): CompanyEntity["id"][] =>
  c.parentNodeId
    .split("/")
    .filter(notRootOrEmpty)
    .map(Number)
    .filter(Number.isInteger);

const extendWithOwnerCompaniesIds = <S extends Station>(
  s: StationWithCompany<S, CompanyEntity>
) => {
  const parentsIds = getParentsIds(s.company);
  return {
    ...s,
    ownerCompaniesIds: [...parentsIds, s.company.id],
  };
};
export class StationsRepository {
  constructor(
    private readonly db: DataSource,
    private readonly mappings: StationsEntitiesMapping
  ) {}

  create<N extends keyof StationEntities, T extends StationEntities[N]>(
    entityName: N,
    values: DeepPartial<T>
  ) {
    const repo = this.db.getRepository<T>(this.mappings[entityName]);
    return repo.save(repo.create(values));
  }

  async findById<N extends keyof StationEntities, T extends StationEntities[N]>(
    entityName: N,
    id: T["id"]
  ): Promise<T | null> {
    return this.db
      .getRepository<T>(this.mappings[entityName])
      .findOne({ where: { id: Equal(id) } as any });
  }

  async update<N extends keyof StationEntities, T extends StationEntities[N]>(
    entityName: N,
    id: T["id"],
    values: Omit<T, "id">
  ) {
    return this.db
      .getRepository<T>(this.mappings[entityName])
      .update({ id: Equal(id) as any }, values as any);
  }

  async delete<N extends keyof StationEntities, T extends StationEntities[N]>(
    entityName: N,
    id: T["id"]
  ) {
    return this.db
      .getRepository<T>(this.mappings[entityName])
      .delete({ id: Equal(id) as any });
  }

  async getCompanyStations(companyId: number) {
    const { company, childCompanies } = await this.getCompanyWithChildren(
      companyId
    );
    const companiesIds = childCompanies.map(prop("id")).concat(company.id);
    return this.db.getRepository(this.mappings.Station).find({
      where: { companyId: In(companiesIds) },
    });
  }

  // TODO: move all nesting related stuff to dedicated module with helpers, `root` and `/` constants
  async setCompanyParent(companyId: number, newParentCompanyId: number | null) {
    const repo = this.db.getRepository(this.mappings.Company);
    const [parent, company] = await Promise.all([
      newParentCompanyId
        ? repo.findOne({ where: { id: newParentCompanyId } })
        : null,
      this.findById<"Company", CompanyEntity>("Company", companyId),
    ]);
    if (!company || (Number.isInteger(newParentCompanyId) && !parent)) {
      throw new Error("No such company");
    }
    this.validateCompanyNewParent(company, parent);
    const newParentNodeId = !parent
      ? ROOT_NODE_ID + "/"
      : `${parent.parentNodeId}${parent.id}/`;
    await repo.update(
      { id: companyId },
      {
        parentNodeId: newParentNodeId,
      }
    );
    const childrenNewParentNodeId = `${newParentNodeId}${company.id}/`;
    const childrenOldParentNodeId = `${company.parentNodeId}${company.id}/`;
    await repo.query(`
      UPDATE company
      SET parentNodeId = replace(parentNodeId, '${childrenOldParentNodeId}', '${childrenNewParentNodeId}')
      WHERE parentNodeId LIKE '${childrenOldParentNodeId}%';
    `);
  }

  private async getCompanyWithChildren(companyId: number) {
    const repo = this.db.getRepository(this.mappings.Company);
    const company = await repo.findOneById(companyId);
    if (!company) {
      throw new Error(`No company with id=${companyId}`);
    }
    const childCompanies = await repo.find({
      where: {
        parentNodeId: Like(`${company.parentNodeId}${company.id}/%`),
      },
    });
    return {
      company,
      childCompanies,
    };
  }

  private validateCompanyNewParent(
    company: CompanyEntity,
    parent: CompanyEntity | null
  ) {
    if (parent === null) return;

    if (parent.parentNodeId.split("/").includes(String(company.id))) {
      throw new Error(
        "New parent company is child of company and can not be used."
      );
    }
  }

  async getAllStations(): Promise<StationWithTypeAndOwnerCompanies[]> {
    // we can use pure sql query with joins by parentNodeId starts from
    const stations = await this.db
      .getRepository<
        StationWithCompany<StationWithType<Station>, CompanyEntity>
      >(this.mappings.Station)
      .createQueryBuilder("station")
      .leftJoinAndSelect("station.type", "type")
      .leftJoinAndSelect("station.company", "company")
      .getMany();

    return stations.map(extendWithOwnerCompaniesIds);
  }

  async getStationsByIds(
    stationsIds: Station["id"][]
  ): Promise<StationWithTypeAndOwnerCompanies[]> {
    const stations = await this.db
      .getRepository<
        StationWithCompany<StationWithType<Station>, CompanyEntity>
      >(this.mappings.Station)
      .createQueryBuilder("station")
      .where({ id: In(stationsIds) })
      .leftJoinAndSelect("station.type", "type")
      .leftJoinAndSelect("station.company", "company")
      .getMany();

    return stations.map(extendWithOwnerCompaniesIds);
  }
}
