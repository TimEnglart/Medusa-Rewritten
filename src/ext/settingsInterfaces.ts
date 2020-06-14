import { IKeyBasedObject } from '.';

interface IMedalData {
	name: string;
	emoji: string;
	dbData: {
		column: string;
		table: string;
	};
	acquisitionMethod: {
		function: string;
		data: IKeyBasedObject<any>;
	};
	xp: number;
	category: string;
	description: string;
	limited: boolean;
	available: boolean;
}

interface IRankData {
	name: string;
	icon: string;
	emoji: {
		name: string;
		id: string;
		animated: false;
		text: string;
	};
}

interface ISettingsTemplate {
	version: string;
	debug: boolean;
	defaultPrefix: string;
	commandDir: string;
	superUsers: string[];
	tokens: {
		production: string;
		debugging: string;
	};
	database: {
		hostname: string;
		port: number;
		database: string;
		username: string;
		password: string;
		mongo: {
			uri: string;
		}
	};
	lighthouse: {
		discordId: string;
		destinyReset: {
			day: string;
			auDay: string;
			time: string;
			auTime: string;
		};
		scorebook: {
			epoch: string;
			auEpoch: string;
			channelId: string;
			season: number;
		};
		roleIds: IKeyBasedObject<string>;
		clanIds: IKeyBasedObject<string>;
		ranks: IRankData[];
		medals: IMedalData[];
	};
	statuses: string[];
	sentry: string;
	bungie: IKeyBasedObject<string>;
	webData: IKeyBasedObject<string>;
	disabledCommands: IKeyBasedObject<{
		reason: string;
	}>;
}

export { ISettingsTemplate, IRankData, IMedalData };
