import { Database, discord, ExtendedClient, MyRequester, Settings } from '.';


class DiscordDestinyPlayer {
	public profileName: BNetProfile | null;
	constructor(public user: discord.GuildMember | string, public databaseClient?: Database) {
		this.profileName = this.resolveName(typeof user === 'string' ? user : user.displayName);
		if (!this.profileName) throw new Error('NO NAME FOUND');
	}
	public getBungieAccount() {
		return new Promise(async (resolve, reject) => {
			try {
				if (!this.profileName) throw new Error('No Name');
				const requester = new MyRequester({
					hostname: 'www.bungie.net',
					port: 443,
					path: `/Destiny2/SearchDestinyPlayer/${4}/${this.profileName.name}/`,
					method: 'GET',
					headers: {
						'X-API-Key': Settings.bungie.apikey
					},
					doNotFollowRedirect: false,
					responseType: 'JSON'
				});
				return resolve(requester.request());
			}
			catch (e) {
				return reject(e);
			}
		});
	}
	private resolveName(username: string) {
		const regexBNet = (): RegExpExecArray | null => {
			return /^(\w+)#(\d+)/.exec(username);
		};
		// try to resolve bNet
		let bNetName: BNetProfile | null = null;
		const regexResults = regexBNet();
		if (regexResults && regexResults.length === 2) { // regex worked
			bNetName = {
				name: regexResults[1],
				tag: regexResults[2]
			};
		}
		else if (username.includes('#')) {
			const split = username.split('#');
			if (split.length >= 2) {
				bNetName = {
					name: split[0].replace(/[^\w].*$/, ''),
					tag: split[1].replace(/[^0-9].*$/, '')
				};
			}
			else {
				// cant resolve Bnet
			}
		}
		else {
			// not a Bnet
		}
		return bNetName;
	}
}



interface BNetProfile {
	name: string;
	tag?: string;
}
interface BungieResponse<T> {
	Response: T;
	ErrorCode: number;
	ThrottledSeconds: number;
	ErrorStatus: string;
	Message: string;
	MessageData: any;
}
interface DestinyProfilesResponse {
	membershipType: string;
	membershipId: string;
	displayName: string;
}
interface DestinyCharacterResponse {
	inventory?: any;
	character?: any;
	progressions?: any;
	renderData?: any;
	activities?: any;
	equipment?: any;
	kiosks?: any;
	plugSets?: any;
	presentationNodes?: any;
	records?: any;
	collectibles?: any;
	itemComponents?: any;
	uninstancedItemComponents?: any;
	currencyLookups?: any;
}


interface IActivityDefinition {
	displayProperties: {
		description: string; //The Fanatic has returned. Take him down and finish the job you started.;
		name: string; //Nightfall: The Hollowed Lair;
		icon: string; ///common/destiny2_content/icons/f2154b781b36b19760efcb23695c66fe.png;
		hasIcon: boolean
	};
	originalDisplayProperties: {
		description: string; //The Fanatic has returned. Take him down and finish the job you started.;
		name: string; //Nightfall;
		icon: string; ///img/misc/missing_icon_d2.png;
		hasIcon: boolean
	};
	selectionScreenDisplayProperties: {
		description: string; //The Fanatic has returned. Take him down and finish the job you started.;
		name: string; //The Hollowed Lair;
		hasIcon: boolean
	};
	releaseIcon: string; ///img/misc/missing_icon_d2.png;
	releaseTime: number;
	activityLevel: number;
	completionUnlockHash: number;
	activityLightLevel: number;
	destinationHash: number;
	placeHash: number;
	activityTypeHash: number;
	tier: number;
	pgcrImage: string; ///img/destiny_content/pgcr/strike_taurus.jpg;
	rewards: any[];
	modifiers: Array<{
		activityModifierHash: number
	}>;
	isPlaylist: boolean;
	challenges: Array<{
		rewardSiteHash: number;
		inhibitRewardsUnlockHash: number;
		objectiveHash: number;
		dummyRewards: [
			{
				itemHash: number;
				quantity: number;
			}
		]
	}>;
	optionalUnlockStrings: [];
	inheritFromFreeRoam: boolean;
	suppressOtherRewards: boolean;
	playlistItems: [];
	matchmaking: {
		isMatchmade: boolean;
		minParty: number;
		maxParty: number;
		maxPlayers: number;
		requiresGuardianOath: boolean
	};
	directActivityModeHash: number;
	directActivityModeType: number;
	activityModeHashes: number[];
	activityModeTypes: number[];
	isPvP: boolean;
	insertionPoints: [];
	activityLocationMappings: [];
	hash: number;
	index: number;
	redacted: boolean;
	blacklisted: boolean;
}

// tslint:disable-next-line: max-classes-per-file
class DestinyPlayer {
	public static lookup(data: DestinyPlayerLookup, components?: string[]): Promise<DestinyPlayer[]> {
		return new Promise(async (resolve: (destinyPlayer: DestinyPlayer[]) => void, reject: (err: Error) => void) => {
			try {
				if (!data.membershipId && !data.displayName) throw new Error('No Data');
				const requester = new MyRequester({
					hostname: 'www.bungie.net',
					port: 443,
					path: '/Platform' + (data.membershipId ? `/Destiny2/${data.membershipType}/Profile/${data.membershipId}/?components=` + (components ? `${components.join(',')}` : '100') : `/Destiny2/SearchDestinyPlayer/-1/${encodeURIComponent(data.displayName || '')}/`),
					method: 'GET',
					headers: {
						'X-API-Key': Settings.bungie.apikey
					},
					doNotFollowRedirect: false,
					responseType: 'JSON'
				});
				if (data.membershipId) {
					const possibleProfiles: BungieResponse<any> = await requester.request();
					return resolve([new DestinyPlayer(possibleProfiles.Response)]);
				}
				else {
					const possibleProfiles: BungieResponse<DestinyProfilesResponse[]> = await requester.request();
					const profiles: DestinyPlayer[] = [];
					for (const profile of possibleProfiles.Response) {
						const player = await DestinyPlayer.lookup(profile, components);
						if (player) profiles.push(player[0]);
					}
					return resolve(profiles);
				}
			}
			catch (e) {
				return reject(e);
			}

		});
	}
	private requester: MyRequester;
	public parsedData: DestinyProfileResponse;
	constructor(public data: any) {
		this.requester = new MyRequester({
			hostname: 'www.bungie.net',
			port: 443,
			method: 'GET',
			headers: {
				'X-API-Key': Settings.bungie.apikey
			},
			doNotFollowRedirect: false,
			responseType: 'JSON'
		});
		this.parsedData = data as DestinyProfileResponse;
	}
	public get(key: string) {
		// tslint:disable-next-line: no-string-literal
		return this.data[key];
	}
	public characters(): Promise<DestinyCharacter[]> {
		return new Promise(async (resolve: (destinyCharacters: DestinyCharacter[]) => void, reject) => {
			const pendingCharacterRetrieval: DestinyCharacter[] = [];
			for (const characterId of this.parsedData.profile.data.characterIds) {
				try {
					const character = await DestinyCharacter.lookup(this, characterId);
					pendingCharacterRetrieval.push(character);
				}
				catch (e) {

				}
			}
			return resolve(pendingCharacterRetrieval);
		});
	}
}
// tslint:disable-next-line: max-classes-per-file
class DestinyCharacter {
	public static lookup(profile: DestinyPlayer, characterId: string | number): Promise<DestinyCharacter> {
		return new Promise(async (resolve: (destinyCharacter: DestinyCharacter) => void, reject: (err: Error) => void) => {
			const requester = new MyRequester({
				hostname: 'www.bungie.net',
				port: 443,
				method: 'GET',
				headers: {
					'X-API-Key': Settings.bungie.apikey
				},
				path: `/Platform/Destiny2/${profile.get('membershipType')}/Profile/${profile.get('')}/Character/${characterId}/`,
				doNotFollowRedirect: false,
				responseType: 'JSON'
			});
			const response: BungieResponse<DestinyCharacterResponse[]> = await requester.request();
			return resolve(new DestinyCharacter({}));
		});
	}
	private requester: MyRequester;
	private parsedData: DestinyProfileResponse;
	constructor(private data: any) {
		this.requester = new MyRequester({
			hostname: 'www.bungie.net',
			port: 443,
			method: 'GET',
			headers: {
				'X-API-Key': Settings.bungie.apikey
			},
			doNotFollowRedirect: false,
			responseType: 'JSON'
		});
		this.parsedData = data as DestinyProfileResponse;
	}
	public get(key: string) {
		// tslint:disable-next-line: no-string-literal
		return this.data[key];
	}
}

interface DestinyProfileResponse {
	profile: {
		data: {
			userInfo: {
				membershipType: number | string;
				membershipId: number | string;
				displayName: string;
			},
			dateLastPlayed: string | Date;
			versionsOwned: number | any;
			characterIds: string[] | number[];
		},
		privacy: number;
	};
}
interface DestinyPlayerLookup {
	membershipType: string | number;
	displayName?: string;
	membershipId?: string | number;
}
interface INightfallSubmission {
	nightfallData: { activityDetails: IActivityDetails } & IActivityValues;
	completed: Date;
}
interface IActivityValues {
	values: {
		[key: string]: {
			statId: string;
			basic: {
				value: number;
				displayValue: string;
			}
		}
	};
}
export interface IPostGameCarnageReport {
	period: string;
	startingPhaseIndex: number;
	activityDetails: IActivityDetails;
	entries: IActivityEntry[];
	teams: IActivityTeam[];
}
export interface IActivityDetails {
	referenceId: number;
	directorActivityHash: number;
	instanceId: string;
	mode: number[];
	isPrivate: boolean;
	membershipType: number;
}
interface IActivityTeam { }
interface IActivityEntry {
	standing: number;
	score: {
		basic: {
			value: number;
			displayValue: string;
		};
	};
	player: IActivityPlayer;
	characterId: string;
	values: {
		[key: string]: {
			basic: {
				value: number;
				displayValue: string;
			};
		};
	};
}
interface IActivityPlayer {
	destinyUserInfo: {
		iconPath: string;
		membershipType: number;
		membershipId: number;
		displayName: string;
	};
	characterClass: string;
	classHash: number;
	raceHash: number;
	genderHash: number;
	characterLevel: number;
	lightLevel: number;
	bungieNetUserInfo?: {
		iconPath: string;
		membershipType: number;
		membershipId: string;
		displayName: string;
	};
	emblemHash: number;
}

export { DestinyCharacter, DestinyPlayer, DiscordDestinyPlayer, BungieResponse, IActivityDefinition, INightfallSubmission, IActivityValues, IActivityPlayer, IActivityEntry };