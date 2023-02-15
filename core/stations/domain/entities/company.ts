import { AbstractEntity } from '../../../generic/entities/abstract-entity';

export interface Company extends AbstractEntity<number> {
  name: string
}
