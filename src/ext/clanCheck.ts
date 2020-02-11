import { MyRequester, ExtendedClient, Utility, discord, Settings } from ".";
import { BungieResponse } from "./discordToBungie";

class ClanSync {
	private requester: MyRequester;
	constructor(public discordInstance: ExtendedClient) {
		this.requester = new MyRequester({
			hostname: 'www.bungie.net',
			port: 443,
			// path: `/GroupV2/{groupId}/Members/`,
			method: 'GET',
			headers: {
				'X-API-Key': discordInstance.settings.bungie.apikey
			},
			doNotFollowRedirect: false,
			responseType: 'JSON'
		});
		return this;
	}
	public async updateClanList(): Promise<IClanPlayerList> {
		// Sunbreakers Id: 2135581
		// Tidebreakers Id: GONE
		// Cursebreakers Id: 3212540
		const clanPlayers: IClanPlayerList = {};
		try {
			this.discordInstance.logger.logClient.logS(`GETTING SUNBREAKER MEMBERS`);
			const sbResponse: BungieResponse<IClanListResponse> = await this.requester.request({ path: `/Platform/GroupV2/2135581/Members/`});
			clanPlayers.sunbreakers = sbResponse.Response.results;
			this.discordInstance.logger.logClient.logS(`GETTING CURSEBREAKER MEMBERS`);
			const cbResponse: BungieResponse<IClanListResponse> = await this.requester.request({ path: `/Platform/GroupV2/3212540/Members/`});
			clanPlayers.cursebreakers = cbResponse.Response.results;
		}
		catch (e) {
			this.discordInstance.logger.logClient.logS(`ERROR: ${JSON.stringify(e)}`);
		}
		return clanPlayers;
	}
	public async resolveDiscordNames(clanPlayers: IClanPlayerList): Promise<IClanPlayerUpdateList> {
		const playerRoles: IClanPlayerUpdateList = {};
		this.discordInstance.logger.logClient.logS(`GETTING GUILD`);
		const guild = this.discordInstance.guilds.get(Settings.lighthouse.discordId);
		if (!guild) return playerRoles;
		this.discordInstance.logger.logClient.logS(`CYCLING PLAYERS`);
		for (const clan in clanPlayers) {
			if (!clan) continue;
			this.discordInstance.logger.logClient.logS(`THERE ARE PLAYERS IN CLAN: ${clan}`);
			for (const player of clanPlayers[clan]) {
				this.discordInstance.logger.logClient.logS(`SEARCHING: ${player.destinyUserInfo.displayName}`);
				try {
					const playerInGuild = Utility.LookupMember(guild, player.destinyUserInfo.displayName, true);
					if (playerInGuild) {
						playerRoles[playerInGuild.id] = (this.discordInstance.settings.lighthouse.roleIds as any)[clan];
						this.discordInstance.logger.logClient.logS(`ADDED ROLE TO LOOKUP:\n${playerInGuild.displayName} ->${player.destinyUserInfo.displayName}\n`);
					}
					else {
						// Lookup Via Database
						const discordId = await this.discordInstance.databaseClient.query(`SELECT user_id FROM U_Bungie_Account WHERE bungie_id = ${player.bungieNetUserInfo.membershipId}`);
						if (discordId.length) {
							const possibleUser = guild.member(discordId[0].user_id);
							if (possibleUser) {
								playerRoles[possibleUser.id] = (this.discordInstance.settings.lighthouse.roleIds as any)[clan];
								this.discordInstance.logger.logClient.logS(`ADDED ROLE FROM DATABASE REGISTER:\n${player.destinyUserInfo.displayName}\n`);
							}
						}
					}
				}
				catch (e) {
					await this.discordInstance.logger.logClient.log(`Failed to Parse Player Name: ${player.destinyUserInfo.displayName}`, 1);
				}
			}
		}
		return playerRoles;
	}
	public async updateDiscordRoles(playersInClan: IClanPlayerUpdateList) {
		const guild = this.discordInstance.guilds.get(Settings.lighthouse.discordId);
		if (!guild) return;
		for (const [snowflake, member] of guild.members) {
			await member.roles.remove(this.getRolesToRemove());
			const roleToAssign = playersInClan[snowflake];
			if (roleToAssign.length) {
				await member.roles.add(roleToAssign);
			}
		}
	}
	public async fullUpdate() {
		const clanList = await this.updateClanList();
		const updatedRoles = await this.resolveDiscordNames(clanList);
		await this.updateDiscordRoles(updatedRoles);
	}

	private getRolesToRemove(roleToAdd?: string) {
		// Add Dynamic Resolution For Roles to Remove
		return [
			this.discordInstance.settings.lighthouse.roleIds.cursebreakers,
			this.discordInstance.settings.lighthouse.roleIds.sunbreakers
		];
	}

}
interface IClanPlayerUpdateList
{
	[discordId: string]: string; // Role id
}
interface IClanPlayerList
{
	[clan: string]: IClanListPlayer[];
}
interface IClanListResponse {
	results: IClanListPlayer[];
}
interface IClanListPlayer {
	memberType: number;
	isOnline: boolean;
	lastOnlineStatusChange: string;
	groupId: string;
	destinyUserInfo: {
		LastSeenDisplayName: string,
		LastSeenDisplayNameType: number,
		iconPath: string,
		crossSaveOverride: number,
		applicableMembershipTypes: number[],
		isPublic: boolean,
		membershipType: number,
		membershipId: string,
		displayName: string
	};
	bungieNetUserInfo: {
		supplementalDisplayName: string,
		iconPath: string,
		crossSaveOverride: number,
		isPublic: boolean,
		membershipType: number,
		membershipId: string,
		displayName: string
	};
	joinDate: string;
}

export { ClanSync };