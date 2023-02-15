import "reflect-metadata";
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ObjectType } from "typeorm/common/ObjectType";
import { StationEntities } from "../../../domain/entities";
import { Company } from "../../../domain/entities/company";
import { Station } from "../../../domain/entities/station";
import { StationType } from "../../../domain/entities/station-type";

@Entity({ name: "StationType" })
export class StationTypeEntity implements StationType {
  @PrimaryGeneratedColumn() id: number;
  @Column() maxPower: number;
  @Column() name: string;
  @OneToMany(() => StationEntity, (s) => s.type) stations: StationEntity[];
}

// TODO: create nesting tree helpers module with constants for 'root' etc.
@Entity({ name: "Company" })
export class CompanyEntity implements Company {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column() parentNodeId: string = ROOT_NODE_ID + "/"; // root/grandParentId/parentId
  @OneToMany(() => StationEntity, (s) => s.company) stations: StationEntity[];
}
export const ROOT_NODE_ID = "root";

@Entity({ name: "Station" })
export class StationEntity implements Station {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column() typeId: StationTypeEntity["id"];
  @ManyToOne(() => StationTypeEntity, (t) => t.stations, { nullable: false })
  type: StationTypeEntity;
  @Column() companyId: CompanyEntity["id"];
  @ManyToOne(() => CompanyEntity, (c) => c.stations, { nullable: false })
  company: CompanyEntity;
}

export type EntitiesMapping<E> = { [k in keyof E]: ObjectType<E[k]> };
export const mappings = {
  StationType: StationTypeEntity,
  Company: CompanyEntity,
  Station: StationEntity,
} satisfies EntitiesMapping<StationEntities>;

export type StationsEntitiesMapping = typeof mappings;
