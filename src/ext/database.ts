'use strict';
import { createPool, Pool, PoolConfig, PoolConnection, QueryOptions } from 'mariadb';
import { LogFilter, Logger } from './logger';
export class Database {
	public static constructQuery(sqlQuery: string | SqlQuery) {
		if (typeof sqlQuery === 'string') {
			return sqlQuery;
		}
		const brokenQuery = [sqlQuery.type, sqlQuery.columns.join(', '), 'FROM', sqlQuery.tables.join(', ')];
		if (sqlQuery.conditions) {
			brokenQuery.push('WHERE');
			const whereQuery = [];
			for (const condition of sqlQuery.conditions) {
				whereQuery.push(
					`${condition.column} ${condition.operator ? condition.operator : '='} ${condition.value}`,
				);
			}
			brokenQuery.push(whereQuery.join(' AND '));
		}
		if (sqlQuery.order) {
			brokenQuery.push(`ORDER BY`);
			for (const order of sqlQuery.order) {
				brokenQuery.push(`${order.column} ${order.type}`);
			}
		}
		if (sqlQuery.limit) {
			brokenQuery.push(`LIMIT ${sqlQuery.limit}`);
		}
		brokenQuery.push(';');
		return brokenQuery.join(' ');
	}
	public pool: Pool;
	constructor(private connectionSettings: PoolConfig, private logger: Logger | null = null) {
		this.pool = createPool(this.connectionSettings);
		return this;
	}
	public query(sqlQuery: string | SqlQuery): Promise<any[]> {
		return new Promise<any[]>(async (resolve: (result: any[]) => void, reject: (reason: Error) => void) => {
			let connection: PoolConnection | null = null;
			try {
				connection = await this.pool.getConnection();
				await connection.beginTransaction();
				const query = Database.constructQuery(sqlQuery);
				const rows: any[] = await connection.query(query);
				await connection.commit();
				// if (typeof sqlQuery !== 'string' && rows.length && !sqlQuery.meta) {
				// rows.pop();
				// }
				if (this.logger) {
					this.logger.log(`SQL Query Successful:\n${query}`, LogFilter.Debug);
				}
				resolve(rows);
			} catch (err) {
				if (connection) {
					await connection.rollback();
				}
				if (this.logger) {
					this.logger.log((connection ? `SQL Query Failed:` : `Unable to Contact Database Server:`) + `\nConnection Settings: ${this.connectionSettings.user}:${this.connectionSettings.password}@${this.connectionSettings.host}:${this.connectionSettings.port}/${this.connectionSettings.database}\n${err}`, LogFilter.Error);
				}
				reject(err);
			} finally {
				if (connection) {
					connection.end(); // don't await
				}
			}
		});
	}
	public batch(objects: SqlQuery[]) {
		return;
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
