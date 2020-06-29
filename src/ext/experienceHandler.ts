import ExtendedClient from "./ExtendedClient";
import { IRankData } from "./settingsInterfaces";
import { GuildMember, User, PartialGuildMember } from "discord.js";
import { Collection } from "mongodb";

interface IExperienceVoiceChannelState {
	[userId: string]: {
		channelId: string;
		time: number;
	}
}

export class ExperienceHandler {

	private readonly _MINIMUM_XP = 8;
	private readonly _MAXIMUM_XP = 12;

	public VoiceChannelOccupants: IExperienceVoiceChannelState;
	constructor(public discordClient: ExtendedClient) {
		this.VoiceChannelOccupants = {};
	}
	private async getUserCollection(): Promise<Collection<any>> {
		return await this.discordClient.nextDBClient.getCollection('users');
	}
	public async GiveExperience(user: User, xp?: number): Promise<IExperienceResponse> {
		if (!xp) xp = this.RandomXP(this._MINIMUM_XP, this._MAXIMUM_XP);
		const users = await this.discordClient.nextDBClient.getCollection('experience');
		const response = await users.findOne({
			_id: user.id,
		});
		const xpData = response
			? this.CalculateExperience(xp + response.xp, response.level)
			: this.CalculateExperience(xp, 0);
		await users.updateOne(
			{
				_id: user.id,
			},
			{
				$set: {
					xp: xpData.xp,
					level: xpData.level,
				}
			},
			{upsert: true}
		);
		return xpData;
	}
	private RandomXP(min: number, max: number): number {
		return min + Math.floor(Math.random() * (max - min + 1));
	}
	private CalculateExperience(xp: number, currLevel: number): IExperienceResponse {
		let nextLevelRequirement = currLevel * 3000; // 3000 is the multiplier for each level... eg. level 1 -> 3000xp. level 2 -> 6000xp (level * 3000)
		const levelUps = [];
		while (xp >= nextLevelRequirement) {
			currLevel += 1;
			nextLevelRequirement += 3000;
			if (currLevel <= this.discordClient.settings.lighthouse.ranks.length)
				levelUps.push(this.discordClient.settings.lighthouse.ranks[currLevel - 1]);
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
			xp,
		};
	}

	private async updateConnectionStatus(member: GuildMember| PartialGuildMember, connected: boolean): Promise<void> {
		/* Add User to Experience Table */
		const users = await this.getUserCollection();
		await users.updateOne(
			{
				_id: member.id,
			},
			connected // Yuck
				? {
					_id: member.id,
					$addToSet: {
						connectedGuilds: member.guild.id,
					},
				}
				: {
					_id: member.id,
					$pull: {
						connectedGuilds: member.guild.id,
					},
				},
			{ upsert: true },
		);
	}
	public disconnectUser(member: GuildMember | PartialGuildMember): Promise<void> {
		return this.updateConnectionStatus(member, false);
	}
	public connectUser(member: GuildMember | PartialGuildMember): Promise<void> {
		return this.updateConnectionStatus(member, true);
	}
}
/*
function medalRoles(member: discord.GuildMember, medal: IMedalData): boolean {
	if (medal.acquisitionMethod.data.roleIds) {
		for (const roleId of medal.acquisitionMethod.data.roleIds) {
			if (member.roles.resolve(roleId)) return true; // Using Id
		}
	}
	if (
		medal.acquisitionMethod.data.roleName &&
        member.roles.cache.find(role => role.name.toLowerCase() === medal.acquisitionMethod.data.roleName)
	)
		return true; // Using Name. Probs Better
	return false;
}
function getUserRecords(member: discord.GuildMember, databaseClient: Database, fails = 0): Promise<IRecordResponse[]> {
	return new Promise(async (resolve, reject) => {
		const records: IRecordResponse[] = [];
		try {
			const requester = new MyRequester({
				hostname: 'www.bungie.net',
				port: 443,
				method: 'GET',
				headers: {
					'X-API-Key': Settings.bungie.apikey,
				},
				doNotFollowRedirect: false,
				responseType: 'JSON',
			});
			// Get User Bungie/Destiny Data
			const bungieAccounts = await databaseClient.query(
				`SELECT * FROM U_Bungie_Account WHERE user_id = ${member.id}`,
			);
			if (!bungieAccounts.length) return reject('User Bungie Account Not Registered');
			const destinyAccounts = await databaseClient.query(
				`SELECT * FROM U_Destiny_Profile WHERE bungie_id = ${bungieAccounts[0].bungie_id}`,
			);
			if (!destinyAccounts.length) return reject('User Has No Destiny Profiles [Xbox, Playstation, PC]');
			for (const dProfile of destinyAccounts) {
				try {
					const pRecords: BungieResponse<IRecordResponse> = await requester.request({
						path: `/Platform/Destiny2/${dProfile.membership_id}/Profile/${dProfile.destiny_id}/?components=900`,
					});
					if (pRecords) records.push(pRecords.Response);
				} catch (e) {
					// EndPoint Not Available
				}
			}
		} catch (e) {
			if (fails > 2) return reject('Failed to Get API Data:\n' + e);
			return resolve(await getUserRecords(member, databaseClient, ++fails));
		}
		return resolve(records);
	});
}

function getUserCollectables(
	member: discord.GuildMember,
	databaseClient: Database,
	fails = 0,
): Promise<ICollectableResponse[]> {
	return new Promise(async (resolve, reject) => {
		const collectables: ICollectableResponse[] = [];
		try {
			const requester = new MyRequester({
				hostname: 'www.bungie.net',
				port: 443,
				method: 'GET',
				headers: {
					'X-API-Key': Settings.bungie.apikey,
				},
				doNotFollowRedirect: false,
				responseType: 'JSON',
			});
			// Get User Bungie/Destiny Data
			const bungieAccounts = await databaseClient.query(
				`SELECT * FROM U_Bungie_Account WHERE user_id = ${member.id}`,
			);
			if (!bungieAccounts.length) return reject('User Bungie Account Not Registered');
			const destinyAccounts = await databaseClient.query(
				`SELECT * FROM U_Destiny_Profile WHERE bungie_id = ${bungieAccounts[0].bungie_id}`,
			);
			if (!destinyAccounts.length) return reject('User Has No Destiny Profiles [Xbox, Playstation, PC]');
			for (const dProfile of destinyAccounts) {
				try {
					const pCollectables: BungieResponse<ICollectableResponse> = await requester.request({
						path: `/Platform/Destiny2/${dProfile.membership_id}/Profile/${dProfile.destiny_id}/?components=800`,
					});
					if (pCollectables) collectables.push(pCollectables.Response);
				} catch (e) {
					// EndPoint Not Available
				}
			}
		} catch (e) {
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
function getBungieResponse<T = any>(member: discord.GuildMember, databaseClient: Database, fails = 0): Promise<T[]> {
	return new Promise(async (resolve, reject) => {
		const collectables: T[] = [];
		try {
			const requester = new BungieApiRequester();
			// Get User Bungie/Destiny Data
			const bungieAccounts = await databaseClient.query(
				`SELECT * FROM U_Bungie_Account WHERE user_id = ${member.id}`,
			);
			if (!bungieAccounts.length) return reject('User Bungie Account Not Registered');
			const destinyAccounts = await databaseClient.query(
				`SELECT * FROM U_Destiny_Profile WHERE bungie_id = ${bungieAccounts[0].bungie_id}`,
			);
			if (!destinyAccounts.length) return reject('User Has No Destiny Profiles [Xbox, Playstation, PC]');
			for (const dProfile of destinyAccounts) {
				try {
					const apiResponse = await requester.ContactEndpoint<T>(
						`/Platform/Destiny2/${dProfile.membership_id}/Profile/${dProfile.destiny_id}/?components=800`,
					);
					if (apiResponse) collectables.push(apiResponse.Response);
				} catch (e) {
					// EndPoint Not Available
				}
			}
		} catch (e) {
			if (fails > 2) return reject('Failed to Get API Data:\n' + e);
			return resolve(await getBungieResponse<T>(member, databaseClient, ++fails));
		}
		return resolve(collectables);
	});
}



function checkTriumph(medal: IMedalData, response: IRecordResponse): boolean {
	try {
		const triumph = response.profileRecords.data.records[medal.acquisitionMethod.data.recordId];
		if (triumph) {
			// Profile IRecord
			const pTriumphState = new RecordState(triumph.state);
			if (!pTriumphState.objectiveNotCompleted) return true;
		} else {
			// Character IRecord
			for (const characterId in response.characterRecords.data) {
				if (characterId) {
					const cTriumph =
                        response.characterRecords.data[characterId].records[medal.acquisitionMethod.data.recordId];
					const cTriumphState = new RecordState(cTriumph.state);
					if (!cTriumphState.objectiveNotCompleted) return true;
				}
			}
		}
	} catch (e) {}
	return false;
}
function medalFunction(
	member: discord.GuildMember,
	medal: IMedalData,
	databaseClient?: Database,
	existingRecords?: IRecordResponse[],
): Promise<boolean> {
	return new Promise(async (resolve, reject) => {
		const dynamicFunctions: {
			[functionName: string]: (args: string[]) => Promise<boolean>;
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
					const records = existingRecords || (await getUserRecords(member, databaseClient));
					for (const record of records) {
						for (const arg of args) {
							const falseMedal = medal;
							falseMedal.acquisitionMethod = {
								function: 'TRIUMPH',
								data: {
									recordId: arg,
								},
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
					const response = await databaseClient.query(
						`SELECT reset FROM U_Experience WHERE user_id = ${member.id}`,
					);
					if (response.length && response[0].reset >= requiredReset) return true;
				}
				return false;
			},
			collectable: async (args: string[]) => {
				// idk what im doing lol
				if (databaseClient) {
					const userCollectables = await getUserCollectables(member, databaseClient);
					for (const collectable of userCollectables) {
						for (const itemHash of args) {
							const collectableState = new CollectableState(
								collectable.profileCollectibles.data.collectibles[itemHash].state,
							);
							return (
								collectableState.none ||
                                collectableState.cannotAffordMaterialRequirements ||
                                collectableState.inventorySpaceUnavailable ||
                                collectableState.uniquenessViolation ||
                                collectableState.purchaseDisabled
							);
						}
					}
				}
				return false;
			},
			nitroBooster: async (args: string[]) => {
				return member.premiumSinceTimestamp !== null;
			},
		};
		try {
			// Get User Bungie/Destiny Data
			const args: string[] = medal.acquisitionMethod.data.args;
			// GOT USER DATA
			if (!medal.acquisitionMethod.data.functionName) return resolve(false);
			return resolve(await dynamicFunctions[medal.acquisitionMethod.data.functionName](args));
		} catch (e) {
			// print Error Maybe
			console.error(e);
			return resolve(false);
		}
	});
}
function categoriseMedals(): ICategorisedMedal {
	return Settings.lighthouse.medals
		.map(v => ({
			[v.category]: v,
		}))
		.reduce((newObj: any, obj) => {
			Object.keys(obj).forEach(k => {
				newObj[k] = (newObj[k] || []).concat(obj[k]);
			});
			return newObj as ICategorisedMedal; // Can Remove Categorised Medal Typing and Replace with any if errors occur
		}, {});
}

async function HandleVoiceChannelExperince(xpPerTick: number, member?: GuildMember, timeOut = 300000): Promise<void> {

	
	return new Promise(async (resolve: (recursive: Promise<void> | void) => void, reject: (e: Error) => void) => {
		if (!member) return reject(new Error('No Member'));
		const voiceState = member.voice;
		const bannedVoiceChannelIds = ['197984269430161408'];
		setTimeout(async () => {
			try {
				if (voiceState.channelID) {
					if (discordBot.usersEarningXp[member.id]) {
						if (!bannedVoiceChannelIds.includes(voiceState.channelID)) {
							if (
								voiceState.channelID === discordBot.usersEarningXp[member.id] &&
                                discordBot.usersEarningXp[member.id]
							) {
								if (
									(member.guild.channels.resolve(voiceState.channelID) as discord.VoiceChannel)
										.members.size > 1
								) {
									if (member) await giveExperience(member.id, xpPerTick, discordBot.databaseClient);
								}
							} else if (
								discordBot.usersEarningXp[member.id] !== voiceState.channelID &&
                                voiceState.channelID
							) {
								discordBot.usersEarningXp[member.id] = voiceState.channelID;
							} else {
								delete discordBot.usersEarningXp[member.id];
								return resolve();
							}
							return resolve(voiceChannelXp(member, xpPerTick, discordBot));
						}
					}
				}
			} catch (e) {
				reject(e);
			}
		}, timeOut);
	});
}
*/
// tslint:disable-next-line: max-classes-per-file
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


interface IRecordResponse {
	profileRecords: {
		data: {
			score: number;
			trackedRecordHash?: number;
			records: {
				[recordId: string]: IRecord;
			};
		};
	};
	characterRecords: {
		data: {
			[characterId: string]: {
				featuredRecordHashes?: number[];
				records: {
					[recordId: string]: IRecord;
				};
			};
		};
	};
}
interface ICollectableResponse {
	profileCollectibles: {
		data: {
			recentCollectibleHashes: number[];
			newnessFlaggedCollectibleHashes: number[];
			collectibles: {
				[id: string]: ICollectable;
			};
		};
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
