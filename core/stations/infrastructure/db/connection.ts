import { DataSource } from 'typeorm';
import { ConnectionConfig } from './connection-config';
import { mappings } from './mappings';

export const connect = async (config: ConnectionConfig) => {
  const db = new DataSource({
    ...config,
    entities: Object.values(mappings),
    subscribers: [],
    migrations: [],
  });
  await db.connect();
  await db.synchronize()
  return db;
}
