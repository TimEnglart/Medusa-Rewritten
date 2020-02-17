import { Database, discord, ExtendedClient, MyRequester, Settings } from '.';
import { BungieResponse } from './discordToBungie';
import { ExtendedRequestOptions, RequestError } from './webClient';



function disconnectUser(userId: string | null, databaseClient: Database) {
	return new Promise(async (resolve, reject) => {
		const response = await databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${userId}`);
		if (response.length) await databaseClient.query(`UPDATE U_Experience SET connected = ${false} WHERE user_id = ${userId}`);
		else await databaseClient.query(`INSERT INTO U_Experience(user_id, connected) VALUES(${userId}, ${false})`);
		return resolve();
	});
}
function connectUser(userId: string | null, databaseClient: Database) {
	return new Promise(async (resolve, reject) => {

		/* Add User to Experience Table */
		const response = await databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${userId}`);
		if (response.length) await databaseClient.query(`UPDATE U_Experience SET connected = ${true} WHERE user_id = ${userId}`);
		else await databaseClient.query(`INSERT INTO U_Experience(user_id, connected) VALUES(${userId}, ${true})`);

		/* Add User to Medal Tables */
		// const medalsResponse = await databaseClient.query(`SELECT * FROM `)

		return resolve();
	});
}

function giveExperience(userId: string | null, xp: number | null, databaseClient: Database): Promise<IExperienceResponse> {
	return new Promise(async (resolve, reject) => {
		if (!userId) return reject('No User Provided');
		if (!xp) xp = Math.floor(7) + Math.floor(Math.random() * 4) + 1; // Xp Can Be Between 8 and 12
		const response = await databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${userId}`);
		let xpData;
		if (!response.length) xpData = calculateExperience(xp, 0);
		else xpData = calculateExperience(xp + response[0].xp, response[0].level);
		if (!xpData) return reject(`Unable to Process XP:\nUser Id: ${userId}`);
		if (response.length) await databaseClient.query(`UPDATE U_Experience SET xp = ${xpData.xp}, level = ${xpData.level} WHERE user_id = ${userId}`);
		else await databaseClient.query(`INSERT INTO U_Experience(user_id, xp, level, reset, connected) VALUES(${userId}, ${xpData.xp}, ${xpData.level}, ${0}, ${true})`);
		return resolve(xpData);
	});
}
function giveMedal(userId: string | null, medals: IMedalData[], databaseClient: Database): Promise<void> {
	return new Promise(async (resolve, reject) => {
		try {
			if (!userId) return reject('No User Provided');
			for (const medal of medals) {
				const response = await databaseClient.query(`SELECT ${medal.dbData.column} FROM ${medal.dbData.table} WHERE user_id = ${userId}`);
				if (!response.length) await databaseClient.query(`INSERT INTO ${medal.dbData.table}(${medal.dbData.column}) VALUES(${true}) WHERE user_id = ${userId}`);
				else if (response[0][medal.dbData.column]) continue;
				await databaseClient.query(`UPDATE ${medal.dbData.table} SET ${medal.dbData.column} = ${true} WHERE user_id = ${userId}`);
				await giveExperience(userId, medal.xp, databaseClient);
			}
			return resolve();
		}
		catch (e) {
			console.log(e);
			reject(e);
		}
	});
}
function revokeMedal(userId: string | null, medals: IMedalData[], databaseClient: Database): Promise<void> {
	return new Promise(async (resolve: () => void, reject) => {
		try {
			if (!userId) return reject('No User Provided');
			for (const medal of medals) {
				const response = await databaseClient.query(`SELECT ${medal.dbData.column} FROM ${medal.dbData.table} WHERE user_id = ${userId}`);
				if (!response.length) await databaseClient.query(`INSERT INTO ${medal.dbData.table}(${medal.dbData.column}) VALUES(${false}) WHERE user_id = ${userId}`);
				else if (!response[0][medal.dbData.column]) continue;
				await databaseClient.query(`UPDATE ${medal.dbData.table} SET ${medal.dbData.column} = ${false} WHERE user_id = ${userId}`);
				await giveExperience(userId, -medal.xp, databaseClient);
			}
			return resolve();
		}
		catch (e) {
			console.log(e);
			reject(e);
		}
	});
}

function calculateExperience(xp: number, currLevel: number): IExperienceResponse {
	let nextLevelRequirement = currLevel * 3000;
	const levelUps = [];
	while (xp >= nextLevelRequirement) {
		currLevel += 1;
		nextLevelRequirement += 3000;
		if (currLevel <= Settings.lighthouse.ranks.length) levelUps.push(Settings.lighthouse.ranks[currLevel - 1]);
	}
	while (xp < nextLevelRequirement - 3000 && currLevel > 1) {
		currLevel -= 1;
		nextLevelRequirement -= 3000;
	}
	return {
		difference: nextLevelRequirement - xp,
		level: currLevel,
		levelUps,
		nextLevelAmount: nextLevelRequirement,
		xp
	};
}

function checkAllMedals(member: discord.GuildMember | null, databaseClient: Database, getRecords: boolean): Promise<IMedalData[]> {
	return new Promise(async (resolve, reject) => {
		try {
			if (!member) return reject('No User Supplied');
			const records = getRecords ? await getUserRecords(member, databaseClient) : undefined;
			const unlockedMedals: IMedalData[] = [];
			for (const medalKey in Settings.lighthouse.medals) {
				if (!medalKey) continue;
				const medal: IMedalData = (Settings.lighthouse.medals as any)[medalKey];
				if (medal.available && await checkMedal(member, medal, databaseClient, records)) unlockedMedals.push(medal);
			}
			return resolve(unlockedMedals);
		}
		catch (e) {
			console.log(e);
			reject(e);
		}
	});
}
function checkMedal(member: discord.GuildMember, medal: IMedalData, databaseClient?: Database, records?: IRecordResponse[]): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		try {
			switch (medal.acquisitionMethod.function.toUpperCase()) {
				case 'DISCORD': {
					if (medalRoles(member, medal)) return resolve(true);
					break;
				}
				case 'TRIUMPH': {
					if (!databaseClient) return reject(new Error('Database Client Required'));
					const userRecords = records || await getUserRecords(member, databaseClient);
					for (const record of userRecords) {
						if (checkTriumph(medal, record)) return resolve(true);
					}
					break;
				}
				case 'FUNCTION': {
					if (!databaseClient) return reject(new Error('Database Client Required'));
					if (await medalFunction(member, medal, databaseClient, records)) return resolve(true);
					break;
				}
				default:
					break;
			}
			return resolve(false);
		}
		catch (e) {
			console.log(e);
			return resolve(false);
		}
	});
}
function medalRoles(member: discord.GuildMember, medal: IMedalData): boolean {
	if (medal.acquisitionMethod.data.roleIds) {
		for (const roleId of medal.acquisitionMethod.data.roleIds) {
			if (member.roles.get(roleId)) return true; // Using Id
		}
	}
	if (medal.acquisitionMethod.data.roleName && member.roles.find(role => role.name.toLowerCase() === medal.acquisitionMethod.data.roleName)) return true; // Using Name. Probs Better
	return false;
}
function getUserRecords(member: discord.GuildMember, databaseClient: Database, fails: number = 0): Promise<IRecordResponse[]> {
	return new Promise(async (resolve, reject) => {
		const records: IRecordResponse[] = [];
		try {
			const requester = new MyRequester({
				hostname: 'www.bungie.net',
				port: 443,
				method: 'GET',
				headers: {
					'X-API-Key': Settings.bungie.apikey
				},
				doNotFollowRedirect: false,
				responseType: 'JSON'
			});
			// Get User Bungie/Destiny Data
			const bungieAccounts = await databaseClient.query(`SELECT * FROM U_Bungie_Account WHERE user_id = ${member.id}`);
			if (!bungieAccounts.length) return reject('User Bungie Account Not Registered');
			const destinyAccounts = await databaseClient.query(`SELECT * FROM U_Destiny_Profile WHERE bungie_id = ${bungieAccounts[0].bungie_id}`);
			if (!destinyAccounts.length) return reject('User Has No Destiny Profiles [Xbox, Playstation, PC]');
			for (const dProfile of destinyAccounts) {
				try {
					const pRecords: BungieResponse<IRecordResponse> = await requester.request({ path: `/Platform/Destiny2/${dProfile.membership_id}/Profile/${dProfile.destiny_id}/?components=900` });
					if (pRecords) records.push(pRecords.Response);
				}
				catch (e) {
					// EndPoint Not Available
				}
			}
		}
		catch (e) {
			if (fails > 2) return reject('Failed to Get API Data:\n' + e);
			return resolve(await getUserRecords(member, databaseClient, ++fails));
		}
		return resolve(records);
	});
}

function getUserCollectables(member: discord.GuildMember, databaseClient: Database, fails: number = 0): Promise<ICollectableResponse[]> {
	return new Promise(async (resolve, reject) => {
		const collectables: ICollectableResponse[] = [];
		try {
			const requester = new MyRequester({
				hostname: 'www.bungie.net',
				port: 443,
				method: 'GET',
				headers: {
					'X-API-Key': Settings.bungie.apikey
				},
				doNotFollowRedirect: false,
				responseType: 'JSON'
			});
			// Get User Bungie/Destiny Data
			const bungieAccounts = await databaseClient.query(`SELECT * FROM U_Bungie_Account WHERE user_id = ${member.id}`);
			if (!bungieAccounts.length) return reject('User Bungie Account Not Registered');
			const destinyAccounts = await databaseClient.query(`SELECT * FROM U_Destiny_Profile WHERE bungie_id = ${bungieAccounts[0].bungie_id}`);
			if (!destinyAccounts.length) return reject('User Has No Destiny Profiles [Xbox, Playstation, PC]');
			for (const dProfile of destinyAccounts) {
				try {
					const pCollectables: BungieResponse<ICollectableResponse> = await requester.request({ path: `/Platform/Destiny2/${dProfile.membership_id}/Profile/${dProfile.destiny_id}/?components=800` });
					if (pCollectables) collectables.push(pCollectables.Response);
				}
				catch (e) {
					// EndPoint Not Available
				}
			}
		}
		catch (e) {
			if (fails > 2) return reject('Failed to Get API Data:\n' + e);
			return resolve(await getUserCollectables(member, databaseClient, ++fails));
		}
		return resolve(collectables);
	});
}
interface IBungieRequest {
	member: discord.GuildMember;
	databaseClient: Database;
	fails: number;
	requestPath: string;
}
function getBungieResponse<T = any>(member: discord.GuildMember, databaseClient: Database, fails: number = 0): Promise<T[]> {
	return new Promise(async (resolve, reject) => {
		const collectables: T[] = [];
		try {
			const requester = new BungieApiRequester();
			// Get User Bungie/Destiny Data
			const bungieAccounts = await databaseClient.query(`SELECT * FROM U_Bungie_Account WHERE user_id = ${member.id}`);
			if (!bungieAccounts.length) return reject('User Bungie Account Not Registered');
			const destinyAccounts = await databaseClient.query(`SELECT * FROM U_Destiny_Profile WHERE bungie_id = ${bungieAccounts[0].bungie_id}`);
			if (!destinyAccounts.length) return reject('User Has No Destiny Profiles [Xbox, Playstation, PC]');
			for (const dProfile of destinyAccounts) {
				try {
					const apiResponse = await requester.ContactEndpoint<T>(`/Platform/Destiny2/${dProfile.membership_id}/Profile/${dProfile.destiny_id}/?components=800`);
					if (apiResponse) collectables.push(apiResponse.Response);
				}
				catch (e) {
					// EndPoint Not Available
				}
			}
		}
		catch (e) {
			if (fails > 2) return reject('Failed to Get API Data:\n' + e);
			return resolve(await getBungieResponse<T>(member, databaseClient, ++fails));
		}
		return resolve(collectables);
	});
}

class BungieApiRequester {
	public numberOfRetries: number = 0;

	private requester: MyRequester;
	private currentFails: number = 0;

	constructor(requestOptions?: ExtendedRequestOptions) {
		const defaultOptions: ExtendedRequestOptions = {
			hostname: 'www.bungie.net',
			port: 443,
			method: 'GET',
			headers: {
				'X-API-Key': Settings.bungie.apikey
			},
			doNotFollowRedirect: false,
			responseType: 'JSON'
		};
		if (requestOptions) Object.assign(defaultOptions, requestOptions);
		this.requester = new MyRequester(defaultOptions);
	}
	public ContactEndpoint<T>(apiEndpoint: string, overrideRequestOptions?: ExtendedRequestOptions): Promise<BungieResponse<T>> {
		return new Promise(async (resolve, reject) => {
			try {
				if (overrideRequestOptions) Object.assign(this.requester.options, overrideRequestOptions);
				try {
					const apiResponse: BungieResponse<T> = await this.requester.request({ path: apiEndpoint });

					if (apiResponse.ThrottledSeconds > 0) {
						await new Promise(sleepDone => setTimeout(sleepDone, apiResponse.ThrottledSeconds * 1000));
						throw apiResponse;
					}

					if (apiResponse.ErrorCode !== 1) {
						return reject({
							ErrorType: 'API Provided Error Code',
							Error: apiResponse
						} as EndPointError<BungieResponse<T>>);
					}

					return resolve(apiResponse);
				}
				catch (e) {
					if (e instanceof RequestError) { // Request Error
						return reject({
							ErrorType: 'Request Error',
							Error: e
						} as EndPointError<RequestError>);
					}
					else if (e instanceof Error) { // Default HTTP Client Error
						return reject({
							ErrorType: 'Generic Error',
							Error: e
						} as EndPointError<Error>);
					}
					else { // Verficiation Error
						throw e;
					}
				}
			}
			catch (e) {
				if (this.numberOfRetries <= ++this.currentFails) { // Max Attempts
					return reject({
						ErrorType: 'Max Attempts',
						Error: e
					} as EndPointError<BungieResponse<T>>); // e should be a IContactEndpointResponse
				}
				else {
					return this.ContactEndpoint<T>(apiEndpoint, overrideRequestOptions);
				}
			}
			finally {
				this.currentFails = 0;
			}
		});
	}
}
interface EndPointError<T> {
	ErrorType: string;
	Error: T;
}
interface IContactEndpointResponse<T> {
	BungieResponse: T;
	ThrottleTime: number;
	ErrorOccurred: boolean;
}


function checkTriumph(medal: IMedalData, response: IRecordResponse): boolean {
	try {
		const triumph = response.profileRecords.data.records[medal.acquisitionMethod.data.recordId];
		if (triumph) { // Profile IRecord
			const pTriumphState = new RecordState(triumph.state);
			if (!pTriumphState.objectiveNotCompleted) return true;
		}
		else { // Character IRecord
			for (const characterId in response.characterRecords.data) {
				if (characterId) {
					const cTriumph = response.characterRecords.data[characterId].records[medal.acquisitionMethod.data.recordId];
					const cTriumphState = new RecordState(cTriumph.state);
					if (!cTriumphState.objectiveNotCompleted) return true;
				}
			}
		}
	}
	catch (e) { }
	return false;
}
function medalFunction(member: discord.GuildMember, medal: IMedalData, databaseClient?: Database, existingRecords?: IRecordResponse[]): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		const dynamicFunctions: {
			[functionName: string]: (args: string[]) => Promise<boolean>
		} = {
			test: async (args: string[]) => {
				return false;
			},
			medalMaster: async (args: string[]) => {

				return false;
			},
			triumphScore: async (args: string[]) => {
				const requiredTriumphScore = +args[0];
				if (databaseClient) {
					const records = await getUserRecords(member, databaseClient);
					for (const record of records) {
						if (record.profileRecords.data.score >= requiredTriumphScore) return true;
					}
				}
				return false;
			},
			multipleRecords: async (args: string[]) => {
				if (databaseClient) {
					const records = existingRecords || await getUserRecords(member, databaseClient);
					for (const record of records) {
						for (const arg of args) {
							const falseMedal = medal;
							falseMedal.acquisitionMethod = {
								function: 'TRIUMPH',
								data: {
									recordId: arg
								}
							};
							if (checkTriumph(falseMedal, record)) return true;
						}
					}
				}
				return false;
			},
			checkReset: async (args: string[]) => {
				const requiredReset = args[0];
				if (databaseClient) {
					const response = await databaseClient.query(`SELECT reset FROM U_Experience WHERE user_id = ${member.id}`);
					if (response.length && response[0].reset >= requiredReset) return true;
				}
				return false;
			},
			collectable: async (args: string[]) => { // idk what im doing lol
				if (databaseClient) {
					const userCollectables = await getUserCollectables(member, databaseClient);
					for (const collectable of userCollectables) {
						for (const itemHash of args) {
							const collectableState = new CollectableState(collectable.profileCollectibles.data.collectibles[itemHash].state);
							return collectableState.none ||
								collectableState.cannotAffordMaterialRequirements ||
								collectableState.inventorySpaceUnavailable ||
								collectableState.uniquenessViolation ||
								collectableState.purchaseDisabled;
						}
					}
				}
				return false;
			},
			nitroBooster: async (args: string[]) => {
				return member.premiumSinceTimestamp !== null;
			}
		};
		try {
			// Get User Bungie/Destiny Data
			const args: string[] = medal.acquisitionMethod.data.args;
			// GOT USER DATA
			if (!medal.acquisitionMethod.data.functionName) return resolve(false);
			return resolve(await dynamicFunctions[medal.acquisitionMethod.data.functionName](args));
		}
		catch (e) {
			// print Error Maybe
			console.error(e);
			return resolve(false);
		}

	});
}
function categoriseMedals(): ICategorisedMedal {
	return Settings.lighthouse.medals.map(v => (
		{
			[v.category]: v
		}
	)).reduce((newObj: any, obj) => {
		Object.keys(obj).forEach(k => {
			newObj[k] = (newObj[k] || []).concat(obj[k]);
		});
		return newObj as ICategorisedMedal; // Can Remove Categorised Medal Typing and Replace with any if errors occur
	}, {});
}

function voiceChannelXp(member: discord.GuildMember | undefined, xpPerTick: number, discordBot: ExtendedClient, timeOut: number = 300000) {
	return new Promise(async (resolve: (recursive: Promise<void> | void) => void, reject: (e: Error) => void) => {
		if (!member) return reject(new Error('No Member'));
		const voiceState = member.voice;
		const bannedVoiceChannelIds = ['197984269430161408'];
		setTimeout(async () => {
			try {
				if (voiceState.channelID) {
					if (discordBot.usersEarningXp[member.id]) {
						if (!bannedVoiceChannelIds.includes(voiceState.channelID)) {
							if (voiceState.channelID === discordBot.usersEarningXp[member.id] && discordBot.usersEarningXp[member.id]) {
								if ((member.guild.channels.get(voiceState.channelID) as discord.VoiceChannel).members.size > 1) {
									if (member) await giveExperience(member.id, xpPerTick, discordBot.databaseClient);
								}
							} else if (discordBot.usersEarningXp[member.id] !== voiceState.channelID && voiceState.channelID) {
								discordBot.usersEarningXp[member.id] = voiceState.channelID;
							} else {
								delete discordBot.usersEarningXp[member.id];
								return resolve();
							}
							return resolve(voiceChannelXp(member, xpPerTick, discordBot));
						}
					}
				}
			}
			catch (e) {
				reject(e);
			}
		}, timeOut);
	});
}

function handleRoles() {


}


class RecordState {
	public none: boolean; // If there are no flags set, the record is in a state where it *could* be redeemed, but it has not been yet.
	public recordRedeemed: boolean; // If this is set, the completed record has been redeemed.
	public rewardUnavailable: boolean; // If this is set, there's a reward available from this Record but it's unavailable for redemption.
	public objectiveNotCompleted: boolean; // If this is set, the objective for this Record has not yet been completed.
	public obscured: boolean; // If this is set, the game recommends that you replace the display text of this Record with DestinyRecordDefinition.stateInfo.obscuredString.
	public invisible: boolean; // If this is set, the game recommends that you not show this record. Do what you will with this recommendation.
	public entitlementUnowned: boolean; // If this is set, you can't complete this record because you lack some permission that's required to complete it.
	public canEquipTitle: boolean; // If this is set, the record has a title (check DestinyRecordDefinition for title info) and you can equip it.
	constructor(public state: number) {
		// tslint:disable: no-bitwise
		this.none = !!(state & 0);
		this.recordRedeemed = !!(state & 1);
		this.rewardUnavailable = !!(state & 2);
		this.objectiveNotCompleted = !!(state & 4);
		this.obscured = !!(state & 8);
		this.invisible = !!(state & 16);
		this.entitlementUnowned = !!(state & 32);
		this.canEquipTitle = !!(state & 64);
	}

}
// tslint:disable-next-line: max-classes-per-file
class CollectableState {
	public none: boolean; // Has Collectable
	public notAcquired: boolean; // If this flag is set, you have not yet obtained this collectible.
	public obscured: boolean; // If this flag is set, the item is "obscured" to you: you can/should use the alternate item hash found in DestinyCollectibleDefinition.stateInfo.obscuredOverrideItemHash when displaying this collectible instead of the default display info.
	public invisible: boolean; // If this flag is set, the collectible should not be shown to the user.
	public cannotAffordMaterialRequirements: boolean; // If this flag is set, the collectible requires payment for creating an instance of the item, and you are lacking in currency. Bring the benjamins next time. Or spinmetal. Whatever.
	public inventorySpaceUnavailable: boolean; // If this flag is set, you can't pull this item out of your collection because there's no room left in your inventory.
	public uniquenessViolation: boolean; // If this flag is set, you already have one of these items and can't have a second one.
	public purchaseDisabled: boolean; // If this flag is set, the ability to pull this item out of your collection has been disabled.
	constructor(public state: number) {
		// tslint:disable: no-bitwise
		this.none = !!(state & 0);
		this.notAcquired = !!(state & 1);
		this.obscured = !!(state & 2);
		this.invisible = !!(state & 4);
		this.cannotAffordMaterialRequirements = !!(state & 8);
		this.inventorySpaceUnavailable = !!(state & 16);
		this.uniquenessViolation = !!(state & 32);
		this.purchaseDisabled = !!(state & 64);
	}

}


interface IMedalData {
	name: string;
	emoji: string;
	dbData: {
		column: string,
		table: string
	};
	acquisitionMethod: {
		function: string,
		data: any
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
		animated: boolean;
		text: string;
	};
}

interface ICategorisedMedal {
	[key: string]: IMedalData[];
}
interface IRecordResponse {
	profileRecords: {
		data: {
			score: number;
			trackedRecordHash?: number;
			records: {
				[recordId: string]: IRecord
			}
		}
	};
	characterRecords: {
		data: {
			[characterId: string]: {
				featuredRecordHashes?: number[];
				records: {
					[recordId: string]: IRecord
				}
			}
		}
	};
}
interface ICollectableResponse {
	profileCollectibles: {
		data: {
			recentCollectibleHashes: number[];
			newnessFlaggedCollectibleHashes: number[];
			collectibles: {
				[id: string]: ICollectable
			}
		}
	};
}
interface ICollectable {
	state: number;
}
interface IRecord {
	state: number;
	objectives: Array<{
		objectiveHash: number;
		progress: number;
		completionValue: number;
		complete: boolean;
		visible: boolean;
	}>;
}
interface IExperienceResponse {
	difference: number;
	level: number;
	levelUps: IRankData[];
	nextLevelAmount: number;
	xp: number;
}

export { calculateExperience, giveExperience, giveMedal, voiceChannelXp, categoriseMedals, disconnectUser, connectUser, checkAllMedals, revokeMedal, IMedalData as MedalData };