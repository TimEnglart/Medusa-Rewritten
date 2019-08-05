'use strict';
export interface MySettings {
	version: string;
	debug: boolean;
	botTokens: {
		production: string;
		development: string;
	};
	databaseConnection: {
		hostname: string;
		port: number | string;
		database: string;
		username: string;
		password: string;
	};
	statuses: string[];
	bungie: {
		apiKey: string;
	};
	development: {
		sentry: {
			reportUrl: string;
		};
	};
	lighthouse: any;
}
