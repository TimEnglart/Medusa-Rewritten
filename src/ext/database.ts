'use strict';
import { createPool, Pool, PoolConfig, PoolConnection, QueryOptions, UpsertResult } from 'mariadb';
import { LogFilter, Logger } from './logger';
export class Database {
	public pool: Pool;
	constructor(private connectionSettings: PoolConfig, private logger?: Logger) {
		this.pool = createPool(this.connectionSettings);
	}
	public async query<T = any>(sqlQuery: string | QueryOptions): Promise<T[]> {
		let connection: PoolConnection | undefined;
		try {
			connection = await this.pool.getConnection();
			await connection.beginTransaction();
			const rows: T[] = await connection.query(sqlQuery);
			await connection.commit();
			if (this.logger) {
				this.logger.logS(`SQL Query Successful:\n${sqlQuery}`, LogFilter.Debug);
			}
			connection.end();
			return rows;
		} catch (err) {
			if (connection) {
				await connection.rollback();
				connection.end();
			}
			if (this.logger) {
				this.logger.logS(
					(connection ? `SQL Query Failed:` : `Unable to Contact Database Server:`) +
                               `\nConnection Settings: ${this.connectionSettings.user}:${this.connectionSettings.password}@${this.connectionSettings.host}:${this.connectionSettings.port}/${this.connectionSettings.database}\n${err}`,
					LogFilter.Error,
				);
			}
		}
		return [];
	}
	public async batch(sqlQuery: string | QueryOptions, values?: any): Promise<UpsertResult[]> {
		let connection: PoolConnection | undefined;
		try {
			connection = await this.pool.getConnection();
			await connection.beginTransaction();
			const response = await connection.batch(sqlQuery, values);
			await connection.commit();
			if (this.logger) {
				this.logger.logS(`SQL Batch Successful:\n${sqlQuery}`, LogFilter.Debug);
			}
			connection.end();
			return response;
		} catch (err) {
			if (connection) {
				await connection.rollback();
				connection.end();
			}
			if (this.logger) {
				this.logger.logS(
					(connection ? `SQL Batch Failed:` : `Unable to Contact Database Server:`) +
                        `\nConnection Settings: ${this.connectionSettings.user}:${this.connectionSettings.password}@${this.connectionSettings.host}:${this.connectionSettings.port}/${this.connectionSettings.database}\n${err}`,
					LogFilter.Error,
				);
			}
		}
		return [];
	}

	private resolveTable(query: string | QueryOptions): string | undefined {
		const stringQuery = typeof(query) === 'string' ? query : query.sql,
			splitQuery = stringQuery.split(' '); 
		for(let i = 0; i < splitQuery.length; i++) { // pretty crude
			if (splitQuery[i].toUpperCase() === 'FROM' && i + 1 < splitQuery.length) return splitQuery[i + 1]; // Get Word after FROM
		}
	}
}
export interface SqlQuery {
	type: string;
	tables: string[];
	columns: string[];
	conditions?: Array<{
		column: string;
		value: string;
		operator?: string;
	}>;
	order?: Array<{
		column: string;
		type: string;
	}>;
	limit?: string | number;
	// meta?: boolean;
}
