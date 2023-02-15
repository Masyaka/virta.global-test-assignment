import { AbstractEntity } from '../../../generic/entities/abstract-entity';

export interface StationType extends AbstractEntity<number> {
  name: string
  maxPower: number
}
