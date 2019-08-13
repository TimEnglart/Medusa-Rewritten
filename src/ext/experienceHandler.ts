import { Database, discord, ExtendedClient, MyRequester, Settings } from '.';

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
		const response = await databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${userId}`);
		if (response.length) await databaseClient.query(`UPDATE U_Experience SET connected = ${true} WHERE user_id = ${userId}`);
		else await databaseClient.query(`INSERT INTO U_Experience(user_id, connected) VALUES(${userId}, ${true})`);
		return resolve();
	});
}

function giveExperience(userId: string | null, xp: number | null, databaseClient: Database): Promise<ExperienceResponse> {
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
interface MedalData {
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

interface RankData {
	name: string;
	icon: string;
	emoji: {
		name: string;
		id: string;
		animated: boolean;
		text: string;
	};
}
function giveMedal(userId: string | null, medals: MedalData[], databaseClient: Database) {
	return new Promise(async (resolve, reject) => {
		if (!userId) return reject('No User Provided');
		for (const medal of medals) {
			const response = await databaseClient.query(`SELECT ${medal.dbData.column} FROM ${medal.dbData.table} WHERE user_id = ${userId}`);
			if (!response.length) await databaseClient.query(`INSERT INTO ${medal.dbData.table}(${medal.dbData.column}) VALUES(${true}) WHERE user_id = ${userId}`);
			else if (response[0][medal.dbData.column]) continue;
			await databaseClient.query(`UPDATE ${medal.dbData.table} SET ${medal.dbData.column} = ${true} WHERE user_id = ${userId}`);
			await giveExperience(userId, medal.xp, databaseClient);
		}
		return resolve();
	});
}
function revokeMedal(userId: string | null, medals: MedalData[], databaseClient: Database) {
	return new Promise(async (resolve, reject) => {
		if (!userId) return reject('No User Provided');
		for (const medal of medals) {
			const response = await databaseClient.query(`SELECT ${medal.dbData.column} FROM ${medal.dbData.table} WHERE user_id = ${userId}`);
			if (!response.length) await databaseClient.query(`INSERT INTO ${medal.dbData.table}(${medal.dbData.column}) VALUES(${false}) WHERE user_id = ${userId}`);
			else if (!response[0][medal.dbData.column]) continue;
			await databaseClient.query(`UPDATE ${medal.dbData.table} SET ${medal.dbData.column} = ${false} WHERE user_id = ${userId}`);
			await giveExperience(userId, -medal.xp, databaseClient);
		}
		return resolve();
	});
}
interface ExperienceResponse {
	difference: number;
	level: number;
	levelUps: RankData[];
	nextLevelAmount: number;
	xp: number;
}
function calculateExperience(xp: number, currLevel: number): ExperienceResponse {
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

function checkAllMedals(member: discord.GuildMember | null, databaseClient: Database, getRecords: boolean): Promise<MedalData[]> {
	return new Promise(async (resolve, reject) => {
		if (!member) return reject('No User Supplied');
		const records = getRecords ? await getUserRecords(member, databaseClient) : undefined;
		const unlockedMedals: MedalData[] = [];
		for (const medalKey in Settings.lighthouse.medals) {
			if (!medalKey) continue;
			const medal: MedalData = (Settings.lighthouse.medals as any)[medalKey];
			if (medal.available && await checkMedal(member, medal, databaseClient, records)) unlockedMedals.push(medal);
		}
		return resolve(unlockedMedals);
	});
}
function checkMedal(member: discord.GuildMember, medal: MedalData, databaseClient?: Database, records?: any): Promise<boolean | Error> {
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
			return resolve(false);
		}
	});
}
function medalRoles(member: discord.GuildMember, medal: MedalData): boolean {
	if (medal.acquisitionMethod.data.roleId && member.roles.get(medal.acquisitionMethod.data.roleId)) return true; // Using Id
	if (medal.acquisitionMethod.data.roleName && member.roles.find(role => role.name.toLowerCase() === medal.acquisitionMethod.data.roleName)) return true; // Using Name. Probs Better
	return false;
}
function getUserRecords(member: discord.GuildMember, databaseClient: Database, fails: number = 0): Promise<any[]> {
	return new Promise(async (resolve, reject) => {
		const records = [];
		try {
			// Get User Bungie/Destiny Data
			const bungieAccounts = await databaseClient.query(`SELECT * FROM U_Bungie_Account WHERE user_id = ${member.id}`);
			if (!bungieAccounts.length) reject('User Bungie Account Not Registered');
			const destinyAccounts = await databaseClient.query(`SELECT * FROM U_Destiny_Profile WHERE bungie_id = ${bungieAccounts[0].bungie_id}`);
			if (!destinyAccounts.length) reject('User Has No Destiny Profiles [Xbox, Playstation, PC]');
			for (const dProfile of destinyAccounts) {
				const pRecords = await requester.request({ path: `/Platform/Destiny2/${dProfile.membership_id}/Profile/${dProfile.destiny_id}/?components=900` });
				if (pRecords) records.push(pRecords);
			}
		}
		catch (e) {
			if (fails > 2) return reject('Failed to Get API Data');
			return resolve(await getUserRecords(member, databaseClient, ++fails));
		}
		return resolve(records);
	});
}
function checkTriumph(medal: MedalData, response: any) {
	if (isNaN(Number(medal.acquisitionMethod.data.recordId))) {
		if (response.Response.profileRecords.data.score >= 50000) return true;
	}
	else {
		try {
			const triumph = response.Response.profileRecords.data.records[medal.acquisitionMethod.data.recordId];
			if (triumph) { // Profile Record
				const pTriumphState = new CollectableState(triumph.state);
				if (!pTriumphState.objectiveNotCompleted) return true;
			}
			else { // Character Record
				for (const characterId in response.Response.characterRecords.data) {
					if (characterId) {
						const cTriumph = response.Response.characterRecords.data[characterId].records[medal.acquisitionMethod.data.recordId];
						const cTriumphState = new CollectableState(cTriumph.state);
						if (!cTriumphState.objectiveNotCompleted) return true;
					}
				}
			}
		}
		catch (e) {
			return false;
		}
	}
	return false;
}
function medalTriumph(member: discord.GuildMember, medal: MedalData, databaseClient: Database, records?: any): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		try {
			// Get User Bungie/Destiny Data
			const bungieAccounts = await databaseClient.query(`SELECT * FROM U_Bungie_Account WHERE user_id = ${member.id}`);
			if (!bungieAccounts.length) reject('User Bungie Account Not Registered');
			const destinyAccounts = await databaseClient.query(`SELECT * FROM U_Destiny_Profile WHERE bungie_id = ${bungieAccounts[0].bungie_id}`);
			if (!destinyAccounts.length) reject('User Has No Destiny Profiles [Xbox, Playstation, PC]');
			// GOT USER DATA

			// Get Triumphs
			for (const dProfile of destinyAccounts) {
				const apiResponse = await requester.request({ path: `/Platform/Destiny2/${dProfile.membership_id}/Profile/${dProfile.destiny_id}/?components=900` });
				if (isNaN(Number(medal.acquisitionMethod.data.recordId))) {
					if (apiResponse.Response.profileRecords.data.score >= 50000) return resolve(true);
				}
				else {
					try {
						const triumph = apiResponse.Response.profileRecords.data.records[medal.acquisitionMethod.data.recordId];
						if (triumph) { // Profile Record
							const pTriumphState = new CollectableState(triumph.state);
							if (!pTriumphState.objectiveNotCompleted) return resolve(true);
						}
						else { // Character Record
							for (const characterId in apiResponse.Response.characterRecords.data) {
								if (characterId) {
									const cTriumph = apiResponse.Response.characterRecords.data[characterId].records[medal.acquisitionMethod.data.recordId];
									const cTriumphState = new CollectableState(cTriumph.state);
									if (!cTriumphState.objectiveNotCompleted) return resolve(true);
								}
							}
						}
					}
					catch (e) {
						return reject(`Failed to Find Record: ${medal.acquisitionMethod.data.recordId}`);
					}
				}
			}
			return resolve(false);
		}
		catch (e) {
			return resolve(false);
		}
	});
}
function medalFunction(member: discord.GuildMember, medal: MedalData, databaseClient?: Database, existingRecords?: any) {
	return new Promise(async (resolve, reject) => {
		const dynamicFunctions: any = {
			test: async (args: string[]) => {
				return true;
			},
			medalMaster: async (args: string[]) => {

				return false;
			},
			multipleRecords: async (args: string[]) => {
				if (databaseClient) {
					const records = existingRecords || await getUserRecords(member, databaseClient);
					for (const record of records) {
						for (const arg of args) {
							const falseMedal = medal;
							falseMedal.acquisitionMethod.data = {
								recordId: arg
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
			objectDefinition: async (args: string[]) => {

				return false;
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
function categoriseMedals(): CategorisedMedal {
	return Settings.lighthouse.medals.map(v => (
		{
			[v.category]: v
		}
	)).reduce((newObj: any, obj) => {
		Object.keys(obj).forEach(k => {
			newObj[k] = (newObj[k] || []).concat(obj[k]);
		});
		return newObj as CategorisedMedal; // Can Remove Categorised Medal Typing and Replace with any if errors occur
	}, {});
}
interface CategorisedMedal {
	[key: string]: MedalData[];
}
interface RecordResponse {
	profileRecords: {
		data: {
			score: number;
			trackedRecordHash: number;
			records: any;
		}
	};
}
interface Record {
	state: number;
	objectives: Array<{
		objectiveHash: number;
		progress: number;
		completionValue: number;
		complete: boolean;
		visible: boolean;
	}>;
}

class CollectableState {
	public none: boolean;
	public recordRedeemed: boolean;
	public rewardUnavailable: boolean;
	public objectiveNotCompleted: boolean;
	public obscured: boolean;
	public invisible: boolean;
	public entitlementUnowned: boolean;
	public canEquipTitle: boolean;
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

export { calculateExperience, giveExperience, giveMedal, voiceChannelXp, categoriseMedals, disconnectUser, connectUser, checkAllMedals, revokeMedal, MedalData };