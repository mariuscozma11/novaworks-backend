import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

export const typeormConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
  username: process.env.PGUSER || process.env.DB_USERNAME || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres',
  database: process.env.PGDATABASE || process.env.DB_DATABASE || 'novaworks',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Disabled - using migrations instead
  migrationsRun: true, // Auto-run migrations on startup
};

export default typeormConfig;
