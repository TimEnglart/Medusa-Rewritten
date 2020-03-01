import { UpsertResult } from "mariadb";

export interface IDisabledCommandsResponse { // G_Disabled_Commands
	name: string;
	reason: string;
}
export { UpsertResult };
export interface IDatabaseUpdateResponse { // Generic Response When Not Returning Rows
	affectedRows: number;
	insertId: number;
	warningStatus: number;
}

export interface IMemeHistoryResponse { // C_Meme_Lookup
	hash: string;
	data?: string;
}

export interface IAutoRoleResponse { // G_Auto_Role
	guild_id: string;
	role_id: string;
}

export interface IConnectedGuildsResponse { // G_Connected_Guilds
	guild_id: string;
}

export interface ILogChannelResponse { // G_Event_Log_Channel
	guild_id: string;
	text_channel_id: string;
}

export interface ITempChannelMasterResponse { // G_Master_Temp_Channels
	guild_id: string;
	voice_channel_id: string;
}

export interface IGuildPrefixResponse { // G_Prefix
	guild_id: string;
	prefix: string;
}

export interface IReactionRoleResponse { // G_Reaction_Roles
	guild_id: string;
	channel_id: string;
	message_id: string;
	role_id: string;
	reaction_id?: string;
	reaction_name: string;
	reaction_animated: boolean;
}

export interface ITempChannelResponse { // G_Temp_Channels
	guild_id: string;
	voice_channel_id: string;
}

export interface IWelcomeChannelResponse { // G_Welcome_Channel
	guild_id: string;
	text_channel_id: string;
}

export interface IScorebookSubmissionResponse { // SB_Submissions
	pgcr_id: string;
	score: number;
	time: number;
	date_completed: Date;
}

export interface IScorebookWinnerResponse { // SB_Winners
	week: number;
	type: 'SPEED' | 'POINT';
	pgcr_id: string;
	season: number;
}

export interface IBungieAccountResponse { // U_Bungie_Account
	user_id: string;
	bungie_id: string;
	time_added: Date;
}

export interface IConnectedUserResponse { // U_Connected_Users
	user_id: string;
}

export interface IDestinyProfileResponse { // U_Destiny_Profile
	destiny_id: string;
	bungie_id: string;
	membership_id: number;
}

export interface IUserExperienceResponse { // U_Experience
	user_id: string;
	xp: number;
	level: number;
	reset: number;
	connected: boolean;
	last_checked_medals: Date;
}

export interface IClanMedalResponse { // U_M_Clan
	user_id: string;
	breaker: boolean;
	original: boolean;
	pointbreaker: boolean;
	pointbreaker_v: boolean;
	speedbreaker: boolean;
	speedbreaker_v: boolean;
	legend: boolean;
	legend_v: boolean;
	hero_among_guardians: boolean;
	light_booster: boolean;
}

export interface IEventMedalResponse { // U_M_Event
	user_id: string;
	dawning_2018: boolean;
}

export interface IPveMedalResponse { // U_M_Pve
	user_id: string;
	flawless_hunter: boolean;
	throne_breaker: boolean;
	hammer_of_sol: boolean;
	wrath_of_sol: boolean;
	blink: boolean;
	blink_master: boolean;	
}
export interface IPvpMedalResponse { // U_M_Pvp
	user_id: string;
	broadsword: boolean;
	luna: boolean;
	not_forgotten: boolean;
	mountain_top: boolean;
	shaxx_proud: boolean;
}
export interface ISealMedalResponse { // U_M_Seals
	user_id: string;
	wayfarer: boolean;
	dredgen: boolean;
	rivensbane: boolean;
	cursebreaker: boolean;
	unbroken: boolean;
	chronicler: boolean;
	blacksmith: boolean;
	reckoner: boolean;
	shadow: boolean;
	mmxix: boolean;
}

export interface IScorebookStatisticResponse { // U_SB_Statistics
	user_id: string;
	pointbreaker_wins: number;
	speedbreaker_wins: number;
}

