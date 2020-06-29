import { IMedalData } from "./settingsInterfaces";
import { IKeyBasedObject } from "ext";
import ExtendedClient from "./ExtendedClient";
import { GuildMember, User } from "discord.js";
import { IBungieResponse } from "./BungieAPIRequester";
import { Collection } from "mongodb";
import { MongoDBHandler } from "./newDatabaseHandler";

interface ICategorizedMedals {
	[medalCategory: string]: IMedalData[];
}


export default class MedalHandler {
	private Functions: IKeyBasedObject<(args: string[]) => Promise<boolean>>;
	constructor(private readonly client: ExtendedClient) {
		this.Functions = {};
	}
	private async getExperienceCollection(): Promise<Collection<any>> {
		return await this.client.nextDBClient.getCollection('experience');
	}
	private async ChangeMedalStatus(user: User, medal: IMedalData, unlock: boolean): Promise<void> {
		const experienceCollection = await this.getExperienceCollection();
		const status = await experienceCollection.updateOne(
			{
				_id: user.id,
			},
			{
				$set: {
					[`medals.${medal.name}`]: unlock,
				},
			},
			{ upsert: true },
		);
		if (status.result.nModified > 0) // add exp if it was updated
			await this.client.experienceHandler.GiveExperience(user, unlock ? +medal.xp : -medal.xp);
	}
	public async UnlockMedals(user: User, medals: IMedalData[]): Promise<void> {
		for (const medal of medals) {
			await this.ChangeMedalStatus(user, medal, true);
		}
	}
	public async LockMedals(user: User, medals: IMedalData[]): Promise<void> {
		for (const medal of medals) {
			await this.ChangeMedalStatus(user, medal, false);
		}
	}
	public async SetMedals(
		user: User,
		medalStatuses: { unlock: boolean; medal: IMedalData }[],
	): Promise<void> {
		for (const medal of medalStatuses) {
			await this.ChangeMedalStatus(user, medal.medal, medal.unlock);
		}
	}
	public FindMostRelatedMedal(medalString: string): { name: string; correctness: number } {
		const medalCheck: {
			[index: string]: boolean[];
		} = {};
		for (const listedMedal of this.client.settings.lighthouse.medals) {
			for (let i = 0; i < medalString.length; i++) {
				if (
					medalString[i] === listedMedal.name[i]
						? listedMedal.name[i].toLowerCase()
						: undefined
				) {
					if (Array.isArray(medalCheck[listedMedal.name])) {
						medalCheck[listedMedal.name].push(true);
					} else {
						medalCheck[listedMedal.name] = [true];
					}
				}
			}
		}
		let selection = {
			name: '',
			correctness: 0,
		};
		for (const checkedMedal in medalCheck) {
			if (!checkedMedal) continue;
			const percentCheck =
                               (medalCheck[checkedMedal].filter((element) => element).length / checkedMedal.length) *
                               100;
			if (selection.correctness < percentCheck) {
				selection = { name: checkedMedal, correctness: percentCheck };
			}
		}
		return selection;
	}
	public async checkAllMedals(
		member: GuildMember | User | null,
		getRecords: boolean,
	): Promise<IMedalData[]> {
		return []; /*
		try {
			if (!member) throw new Error('No User Supplied');
			const records = getRecords ? await getUserRecords(member, databaseClient) : undefined;
			const unlockedMedals: IMedalData[] = [];
			for (const medal of this.client.experienceHandler.discordClient.settings.lighthouse.medals) {
				if (!medal) continue;
				if (medal.available && (await checkMedal(member, medal, databaseClient, records)))
					unlockedMedals.push(medal);
			}
			return unlockedMedals;
		} catch (e) {
			console.log(e);
			throw e;
		}*/
	}
	public async checkMedal(
		member: GuildMember | User,
		medal: IMedalData,
		records?: IRecordResponse[],
	): Promise<boolean> {
		return false; /*
		try {
			switch (medal.acquisitionMethod.function.toUpperCase()) {
				case 'DISCORD': {
					if (medalRoles(member, medal)) return true;
					break;
				}
				case 'TRIUMPH': {
					const userRecords = records || (await getUserRecords(member, databaseClient));
					for (const record of userRecords) {
						if (checkTriumph(medal, record)) return true;
					}
					break;
				}
				case 'FUNCTION': {
					if (await medalFunction(member, medal, databaseClient, records)) return true;
					break;
				}
				default:
					break;
			}
			return false;
		} catch (e) {
			console.log(e);
			return false;
		}*/
	}
	public medalRoles(member: GuildMember, medal: IMedalData): boolean {
		if (medal.acquisitionMethod.data.roleIds) {
			for (const roleId of medal.acquisitionMethod.data.roleIds) {
				if (member.roles.resolve(roleId)) return true; // Using Id
			}
		}
		if (
			medal.acquisitionMethod.data.roleName &&
                           member.roles.cache.find((role) => role.name.toLowerCase() === medal.acquisitionMethod.data.roleName)
		)
			return true; // Using Name. Probs Better
		return false;
	}
	private SetupFunctions(func: string) {
		//Object.apply();
		return;
	}
	public async medalFunction(
		member: GuildMember,
		medal: IMedalData,
		databaseClient?: MongoDBHandler,
		existingRecords?: IRecordResponse[],
	): Promise<boolean> {
		const a = 'as';
		return false; /*
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
						const records =
                                           existingRecords || (await getUserRecords(member, databaseClient));
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
		});*/
	}

	public categorizeMedals(): ICategorizedMedals {
		return this.client.settings.lighthouse.medals
			.map((v) => ({
				[v.category]: v,
			}))
			.reduce((newObj: ICategorizedMedals, obj) => {
				Object.keys(obj).forEach((k) => {
					newObj[k] = (newObj[k] || []).concat(obj[k]);
				});
				return newObj; // Can Remove Categorized Medal Typing and Replace with any if errors occur
			}, {});
	}
	private async GetUserRecords(
		destinyMembershipId: string,
		membershipType: string,
	): Promise<IBungieResponse<IRecordResponse> | undefined> {
		return await this.client.bungieApiRequester.SendRequest<IRecordResponse>(
			`/Destiny2/${membershipType}/Profile/${destinyMembershipId}/?components=900`,
		);
	}
	private async GetUserCollectables(
		destinyMembershipId: string,
		membershipType: string,
	): Promise<IBungieResponse<IRecordResponse> | undefined> {
		return await this.client.bungieApiRequester.SendRequest<IRecordResponse>(
			`/Destiny2/${membershipType}/Profile/${destinyMembershipId}/?components=800`,
		);
	}
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
