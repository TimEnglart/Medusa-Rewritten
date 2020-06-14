import IDatabaseSaveable from './DatabaseObject';
import { MongoClient, Db, Collection } from 'mongodb';
import ExtendedClient from './ExtendedClient';
import { LogFilter, Logger } from './logger';
class MongoDBHandler {
	private client: MongoClient;
	private connectionTimeout: number;
	private activeConnections: { [dbName: string]: { db: Db } };
	private registeredObjs: Record<string, IDatabaseSaveable>;
	private defaultDb?: string;
	constructor(private readonly logger: Logger, uri: string) {
		this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
		this.connectionTimeout = 0;
		this.activeConnections = {};
		this.registeredObjs = {};
	}

	public async startup() {
		for (const key in this.registeredObjs) {
			await this.registeredObjs[key].readFromDatabase();
		}
	}
	public async connect(db?: string): Promise<Db> {
		// hold an active connection for 3 mins?? to prevent reconnect overhead
		try {
			if (!this.client.isConnected() && !this.connectionTimeout) {
				await this.client.connect();
				this.logger.logS('Connected To MongoDB', LogFilter.Debug);
				this.connectionTimeout = setTimeout(this.disconnect, 180000);
			}
			if (db && !this.activeConnections[db]) {
				this.activeConnections[db] = {
					db: this.client.db(db),
				};
				return this.activeConnections[db].db;
			}
			else return this.client.db();
		} catch (e) {
			// Failed to Connect
			// Log or something
			await this.disconnect(true);
			throw new Error('FAILED_DB_CONNECT');
		}
	}
	public async disconnect(force?: boolean): Promise<void> {
		this.connectionTimeout = 0;
		await this.client.close(force);
		this.logger.logS('Disconnected From MongoDB', LogFilter.Debug);
	}

	public async getCollection<T = any>(collection: string, db?: string): Promise<Collection<T>> {
		const database = await this.connect(db);
		return database.collection<T>(collection);
	}
}

export { MongoDBHandler };