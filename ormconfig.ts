import { DataSource } from 'typeorm';
import typeormConfig from './src/typeorm.config';

// For CLI usage, we need to override the entities and migrations paths
// because __dirname resolves differently
export default new DataSource({
  ...typeormConfig,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
});
