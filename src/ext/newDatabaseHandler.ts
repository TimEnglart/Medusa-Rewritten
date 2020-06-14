import IDatabaseSaveable from './DatabaseObject';
import { MongoClient, Db, Collection } from 'mongodb';
import ExtendedClient from './ExtendedClient';
import { LogFilter, Logger } from './logger';
class MongoDBHandler {
	private client: MongoClient;
	private connectionTimeout: NodeJS.Timeout | null;
	private activeConnections: { [dbName: string]: { db: Db } };
	private registeredObjs: Record<string, IDatabaseSaveable>;
	private defaultDb?: string;
	constructor(private readonly logger: Logger, uri: string) {
		this.client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
		this.connectionTimeout = null;
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
			if (!this.client.isConnected() || !this.connectionTimeout) {
				await this.client.connect();
				this.logger.logS('Connected To MongoDB', LogFilter.Debug);
				// eslint-disable-next-line @typescript-eslint/no-this-alias
				const selfRef = this;
				this.connectionTimeout = setTimeout(() => {
					selfRef.disconnect();
				}, 180000);
			}
			if (db && !this.activeConnections[db]) {
				this.activeConnections[db] = {
					db: this.client.db(db),
				};
				return this.activeConnections[db].db;
			} else return this.client.db();
		} catch (e) {
			// Failed to Connect
			// Log or something
			this.disconnect(true);
			throw new Error('FAILED_DB_CONNECT');
		}
	}
	public async disconnect(force?: boolean): Promise<void> {
		this.connectionTimeout = null;
		if (this.client.isConnected()) {
			await this.client.close(force);
			this.logger.logS('Disconnected From MongoDB', LogFilter.Debug);
		}
	}

	public async getCollection<T = any>(collection: string, db?: string): Promise<Collection<T>> {
		const database = await this.connect(db);
		return database.collection<T>(collection);
	}
}

export { MongoDBHandler };