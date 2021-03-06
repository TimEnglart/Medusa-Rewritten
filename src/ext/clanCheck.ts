
// // import { BungieResponse } from './discordToBungie';
// import { MyRequester } from './webClient';
// import ExtendedClient from './ExtendedClient';
// import { IKeyBasedObject } from '.';
// import { Utility } from './utility';

// class ClanSync {
// 	private requester: MyRequester;
// 	constructor(public discordInstance: ExtendedClient) {
// 		this.requester = new MyRequester({
// 			hostname: 'www.bungie.net',
// 			port: 443,
// 			// path: `/GroupV2/{groupId}/Members/`,
// 			method: 'GET',
// 			headers: {
// 				'X-API-Key': discordInstance.settings.bungie.apikey,
// 			},
// 			doNotFollowRedirect: false,
// 			responseType: 'JSON',
// 		});
// 		return this;
// 	}
// 	public async updateClanList(): Promise<IKeyBasedObject<IClanListPlayer[]>> {
// 		// Sunbreakers Id: 2135581
// 		// Tidebreakers Id: GONE
// 		// Cursebreakers Id: 3212540
// 		const clanPlayers: IKeyBasedObject<IClanListPlayer[]> = {};
// 		try {
// 			this.discordInstance.logger.logS(`GETTING SUNBREAKER MEMBERS`);
// 			const sbResponse: BungieResponse<IClanListResponse> = await this.requester.request({
// 				path: `/Platform/GroupV2/2135581/Members/`,
// 			});
// 			clanPlayers.sunbreakers = sbResponse.Response.results;
// 			this.discordInstance.logger.logS(`GETTING CURSEBREAKER MEMBERS`);
// 			const cbResponse: BungieResponse<IClanListResponse> = await this.requester.request({
// 				path: `/Platform/GroupV2/3212540/Members/`,
// 			});
// 			clanPlayers.cursebreakers = cbResponse.Response.results;
// 		} catch (e) {
// 			this.discordInstance.logger.logS(`ERROR: ${JSON.stringify(e)}`);
// 		}
// 		return clanPlayers;
// 	}
// 	public async resolveDiscordNames(
// 		clanPlayers: IKeyBasedObject<IClanListPlayer[]>,
// 	): Promise<IKeyBasedObject<string>> {
// 		const playerRoles: IKeyBasedObject<string> = {};
// 		this.discordInstance.logger.logS(`GETTING GUILD`);
// 		const guild = this.discordInstance.guilds.resolve(this.discordInstance.settings.lighthouse.discordId);
// 		if (!guild) return playerRoles;
// 		this.discordInstance.logger.logS(`CYCLING PLAYERS`);
// 		for (const clan in clanPlayers) {
// 			if (!clan) continue;
// 			this.discordInstance.logger.logS(`THERE ARE PLAYERS IN CLAN: ${clan}`);
// 			for (const player of clanPlayers[clan]) {
// 				this.discordInstance.logger.logS(`SEARCHING: ${player.destinyUserInfo.displayName}`);
// 				try {
// 					const playerInGuild = Utility.LookupMember(guild, player.destinyUserInfo.displayName, true);
// 					if (playerInGuild) {
// 						playerRoles[playerInGuild.id] = (this.discordInstance.settings.lighthouse.roleIds as any)[clan];
// 						this.discordInstance.logger.logS(
// 							`ADDED ROLE TO LOOKUP:\n${playerInGuild.displayName} ->${player.destinyUserInfo.displayName}\n`,
// 						);
// 					} else {
// 						// Lookup Via Database
// 						/*
// 						const discordId = await this.discordInstance.databaseClient.query(
// 							`SELECT user_id FROM U_Bungie_Account WHERE bungie_id = ${player.bungieNetUserInfo.membershipId}`,
// 						);
// 						if (discordId && discordId.length) {
// 							const possibleUser = guild.member(discordId[0].user_id);
// 							if (possibleUser) {
// 								playerRoles[possibleUser.id] = (this.discordInstance.settings.lighthouse
// 									.roleIds as any)[clan];
// 								this.discordInstance.logger.logS(
// 									`ADDED ROLE FROM DATABASE REGISTER:\n${player.destinyUserInfo.displayName}\n`,
// 								);
// 							}
// 						}*/
// 					}
// 				} catch (e) {
// 					this.discordInstance.logger.logS(
// 						`Failed to Parse Player Name: ${player.destinyUserInfo.displayName}`,
// 						1,
// 					);
// 				}
// 			}
// 		}
// 		return playerRoles;
// 	}
// 	public async updateDiscordRoles(playersInClan: IKeyBasedObject<string>) {
// 		const guild = this.discordInstance.guilds.resolve(this.discordInstance.settings.lighthouse.discordId);
// 		if (!guild) return;
// 		for (const [snowflake, member] of guild.members.cache) {
// 			await member.roles.remove(this.getRolesToRemove());
// 			const roleToAssign = playersInClan[snowflake];
// 			if (roleToAssign) {
// 				await member.roles.add(roleToAssign);
// 			}
// 		}
// 	}
// 	public async fullUpdate() {
// 		const clanList = await this.updateClanList();
// 		const updatedRoles = await this.resolveDiscordNames(clanList);
// 		await this.updateDiscordRoles(updatedRoles);
// 	}

// 	private getRolesToRemove(roleToAdd?: string) {
// 		// Add Dynamic Resolution For Roles to Remove
// 		return [
// 			this.discordInstance.settings.lighthouse.roleIds.cursebreakers,
// 			this.discordInstance.settings.lighthouse.roleIds.sunbreakers,
// 		];
// 	}
// }

// interface IClanListResponse {
// 	results: IClanListPlayer[];
// }
// interface IClanListPlayer {
// 	memberType: number;
// 	isOnline: boolean;
// 	lastOnlineStatusChange: string;
// 	groupId: string;
// 	destinyUserInfo: {
// 		LastSeenDisplayName: string;
// 		LastSeenDisplayNameType: number;
// 		iconPath: string;
// 		crossSaveOverride: number;
// 		applicableMembershipTypes: number[];
// 		isPublic: boolean;
// 		membershipType: number;
// 		membershipId: string;
// 		displayName: string;
// 	};
// 	bungieNetUserInfo: {
// 		supplementalDisplayName: string;
// 		iconPath: string;
// 		crossSaveOverride: number;
// 		isPublic: boolean;
// 		membershipType: number;
// 		membershipId: string;
// 		displayName: string;
// 	};
// 	joinDate: string;
// }

// export { ClanSync };
