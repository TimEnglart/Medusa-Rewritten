import { MyRequester, ExtendedClient, Utility } from ".";
import { BungieResponse } from "./discordToBungie";

class ClanSync {
	public clanPlayers: {
		[clan: string]: IClanListPlayer[]
	};
	private requester: MyRequester;
	constructor(public discordInstance: ExtendedClient) {
		this.requester = new MyRequester({
			hostname: 'www.bungie.net',
			port: 443,
			path: `/GroupV2/{groupId}/Members/`,
			method: 'GET',
			headers: {
				'X-API-Key': discordInstance.settings.bungie.apikey
			},
			doNotFollowRedirect: false,
			responseType: 'JSON'
		});
		return this;
	}
	public async update(): Promise<ClanSync> {
		// Sunbreakers Id: 2135581
		// Tidebreakers Id: GONE
		// Cursebreakers Id: 3212540
		const sbResponse: BungieResponse<IClanListResponse> = await this.requester.request({ path: `/GroupV2/2135581/Members/` });
		this.clanPlayers.sunbreakers = sbResponse.Response.results;
		const cbResponse: BungieResponse<IClanListResponse> = await this.requester.request({ path: `/GroupV2/3212540/Members/` });
		this.clanPlayers.cursebreakers = cbResponse.Response.results;
		return this;
	}
	public async updateRoles(): Promise<void> {
		const guild = this.discordInstance.guilds.get('157737184684802048');
		if (!guild) return;
		for (const clan in this.clanPlayers) {
			if (!clan) continue;
			for (const player of this.clanPlayers[clan]) {
				try {
					let playerInGuild = Utility.LookupMember(guild, player.destinyUserInfo.displayName, true);
					if (playerInGuild) await playerInGuild.roles.add((this.discordInstance.settings.lighthouse.roleIds as any)[clan]);
				}
				catch (e) {
					console.error('Failed to Parse Player Name');
				}
			}
		}
	}

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