import { Client, ClientOptions, User, GuildMember, Channel, PartialChannel, GuildEmoji, Guild, PartialUser, PartialGuildMember, Collection, Snowflake, Speaking, Invite, Message, PartialMessage, MessageReaction, Presence, RateLimitData, Role, VoiceState, TextChannel, VoiceChannel } from "discord.js";
import CommandHandler from "./CommandHandler";
import { ISettingsTemplate } from "./settingsInterfaces";
import { ExperienceHandler} from "./experienceHandler";
import BungieAPIRequester from './BungieAPIRequester';
import { Logger, LogFilter } from "./logger";
import { Database } from "./database";
import { WebServer } from "./web-server";
import { ScoreBook } from "./score-book";
import { existsSync, readdir, readdirSync } from "fs";
import ExtendedClientCommand from "./CommandTemplate";
import { ITempChannelResponse, IReactionRoleResponse } from "./DatabaseInterfaces";
import MedalHandler from "./MedalHandler";
import TempChannelHandler from "./TempChannelHandler";
import ReactionRoleHandler from "./ReactionRoleHandler";


	

	
export default class ExtendedClient extends Client {
	public commandHandler: CommandHandler;
	public settings: ISettingsTemplate;
	public experienceHandler: ExperienceHandler;
	public logger: Logger;
	public databaseClient: Database;
	public webServer: WebServer;
	public scoreBook: ScoreBook;
	public bungieApiRequester: BungieAPIRequester;
	public MedalHandler: MedalHandler;
	public TempChannelHandler: TempChannelHandler;
	public ReactionRoleHandler: ReactionRoleHandler;
	constructor(options?: ClientOptions) {
		super(options);
		// Extended Client Stuff Here
		if (!existsSync('./config/settings.json')) throw new Error('No Settings Provided For Bot');
		this.settings = require('../config/settings.json');
		this.logger = new Logger('./logs', [LogFilter.Info, LogFilter.Debug, LogFilter.Error], true);
		this.databaseClient = new Database(
			{
				database: this.settings.database.database,
				host: this.settings.database.hostname,
				user: this.settings.database.username,
				password: this.settings.database.password,
				port: this.settings.database.port,
				connectionLimit: 20,
				supportBigNumbers: true,
				bigNumberStrings: true,
				compress: true,
			},
			this.logger,
		);
		this.commandHandler = new CommandHandler(this);
		this.experienceHandler = new ExperienceHandler(this);
		this.webServer = new WebServer(this);
		this.scoreBook = new ScoreBook(this);
		this.bungieApiRequester = new BungieAPIRequester({
			headers: {
				'X-API-Key': this.settings.bungie.apikey,
			},
		});
		this.MedalHandler = new MedalHandler(this);
		this.TempChannelHandler = new TempChannelHandler(this);
		this.ReactionRoleHandler = new ReactionRoleHandler(this);
	}

	public LoadCommands(commandFolder?: string): void {
		if (!commandFolder) commandFolder = this.settings.commandDir;
		this.logger.logS(`Command Directory: .${commandFolder}`);
		for(const fileName of readdirSync(commandFolder).filter((f) => f.split('.').pop() === 'js')) {
			this.logger.logS(`Loading Command File: .${commandFolder}/${fileName}`);
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const commandFile = require(`.${commandFolder}/${fileName}`);
			this.commandHandler.AddCommand(commandFile.default);
			this.logger.logS(`${fileName} loaded!`);
		}
	}
	public RandomPresence(): void {
		// ONLY CALL ONCE
		if (this.user) {
			this.user.setPresence({
				activity: {
					name: this.settings.statuses[
						Math.floor(Math.random() * this.settings.statuses.length)
					],
					type: 'CUSTOM_STATUS',
				},
				status: 'online',
			});
		}
		setTimeout(this.RandomPresence, 600000);
	}

	public async PrimeDatabase(): Promise<void> {
		// Relation Databases...
		try {
			this.logger.logS('Started Database Prime', LogFilter.Debug);
			// Add All Missing Guilds & Users

			await this.databaseClient.batch(`INSERT IGNORE INTO G_Connected_Guilds VALUES (?)`, [
				[this.guilds.cache.map((guild) => [guild.id])],
			]);
			for (const [guildId, guild] of this.guilds.cache) {
				await this.databaseClient.batch(`INSERT IGNORE INTO U_Connected_Users VALUES (?)`, [[
					guild.members.cache.map((user) => [user.id]),
				]]);
			}
			const disabledCommands = await this.commandHandler.GetRemoteDisabledCommands();
			this.logger.logS(
				`Finished Database Prime\n# Guilds: ${this.guilds.cache.size}\n# Disabled Commands: ${disabledCommands.length}`,
				LogFilter.Debug,
			);
		} catch (e) {
			this.logger.logS(`Database Prime Failed\n${e}`, LogFilter.Error);
		}
	}
	public async CacheAndCleanUp(): Promise<void> {
		const allReactionRoles = await this.databaseClient.query<IReactionRoleResponse>(`SELECT * FROM G_Reaction_Roles`);
		for (const reactionRole of allReactionRoles) {
			try{
				const resolvedGuild = this.guilds.resolve(reactionRole.guild_id);
				if (resolvedGuild) {
					const resolvedTextChannel = resolvedGuild.channels.resolve(reactionRole.channel_id) as TextChannel | null;
					if (resolvedTextChannel) await resolvedTextChannel.messages.fetch(reactionRole.message_id, true);
					else {
					// Cant Find Text Channel But Bot IS IN Guild
					// this.logger.logS(``);
					}
				}
				else {
				// Cant Find Text Channel Because Bot ISN'T IN Guild
				// this.logger.logS(``);
				}
			}
			catch(e) {
				// Error
			}
		}
		this.logger.logS(`Cached All Message Reactions`, LogFilter.Debug);

		const existingTempChannels = await this.databaseClient.query<ITempChannelResponse>(`SELECT * FROM G_Temp_Channels`);
		// Check All Existing Temporary Channels & Delete if Empty
		for (const tempChannel of existingTempChannels) {
			const resolvedGuild = this.guilds.resolve(tempChannel.guild_id);
			if (resolvedGuild) {
				const resolvedVoiceChannel = resolvedGuild.channels.resolve(tempChannel.voice_channel_id) as VoiceChannel | null;
				if (resolvedVoiceChannel) {
					if (!resolvedVoiceChannel.members.size) {
						await this.databaseClient.query<ITempChannelResponse>(
							`DELETE FROM G_Temp_Channels WHERE guild_id = ${tempChannel.guild_id} AND channel_id = ${tempChannel.voice_channel_id}`,
						);
						await resolvedVoiceChannel.delete('Remove Temp Channel');
					}
					else {
						// There are People in The Temp Voice Channel
						// this.logger.logS(``);
					}
				}
				else {
					// Cant Find Voice Channel But Bot IS IN Guild
					// this.logger.logS(``);
				}
			}
			else {
				// Not In Server
				// this.logger.logS(``, LogFilter.Error);
			}
		}
		this.logger.logS(`Deleted All Empty Temp Channels`, LogFilter.Debug);
	}
	public isSuperUser(user: User | GuildMember | string | undefined): boolean {
		if (user instanceof User || user instanceof GuildMember)
			return this.settings.superUsers.includes(user.id);
		else if (typeof user === 'string') return this.settings.superUsers.includes(user);
		return false;
	}
	private passOn(event: string, listener: (...args: any[]) => void): this {
		this.logger.logS(`Adding Listener For Discord Event: ${event}`);
		super.on(event, (...args: any[]) => {
			const eventReceived = Date.now();
			const eventStatus: {
				message: string;
				error?: Error;
			} = {
				message: 'NO_MESSAGE'
			};
			try {
				listener(...args);
				eventStatus.message = `Event (${event}) Completed Successfully`;
			} catch (e) {
				eventStatus.message = `Event (${event}) Failed to Complete`;
				eventStatus.error = new Error(`${event}`);
			}
			const eventTime = Date.now() - eventReceived;
			this.logger.logS(
				`[EVENT] Time To Execute: ${eventTime}\n${eventStatus.message}\n${JSON.stringify(eventStatus.error || '')}`,
				eventStatus.error ? 2 : 1,
			);
		});
		return this;
	}
	private passOnce(event: string, listener: (...args: any[]) => void): this {
		this.logger.logS(`Adding Listener For Discord Event: ${event}`);
		super.on(event, (...args: any[]) => {
			const eventReceived = Date.now();
			const eventStatus: {
				message: string;
				error?: Error;
			} = {
				message: 'NO_MESSAGE'
			};
			try {
				listener(...args);
				eventStatus.message = `Event (${event}) Completed Successfully`;
			} catch (e) {
				eventStatus.message = `Event (${event}) Failed to Complete`;
				eventStatus.error = new Error(`${event}`);
			}
			const eventTime = Date.now() - eventReceived;
			this.logger.logS(
				`[EVENT] Time To Execute: ${eventTime}\n${eventStatus.message}\n${JSON.stringify(eventStatus.error || '')}`,
				eventStatus.error ? 2 : 1,
			);
		});
		return this;
	}

	
	// Overloads Don't Get Inherited as The Base Function is being Overridden
	public on(
		event: 'channelCreate' | 'channelDelete',
		listener: (channel: Channel | PartialChannel) => void,
	): this;
	public on(
		event: 'channelPinsUpdate',
		listener: (channel: Channel | PartialChannel, time: Date) => void,
	): this;
	public on(
		event: 'channelUpdate',
		listener: (oldChannel: Channel | PartialChannel, newChannel: Channel | PartialChannel) => void,
	): this;
	public on(event: 'debug' | 'warn', listener: (info: string) => void): this;
	public on(event: 'disconnect', listener: (event: any, shardID: number) => void): this;
	public on(event: 'emojiCreate' | 'emojiDelete', listener: (emoji: GuildEmoji) => void): this;
	public on(
		event: 'emojiUpdate',
		listener: (oldEmoji: GuildEmoji, newEmoji: GuildEmoji) => void,
	): this;
	public on(event: 'error', listener: (error: Error) => void): this;
	public on(
		event: 'guildBanAdd' | 'guildBanRemove',
		listener: (guild: Guild, user: User | PartialUser) => void,
	): this;
	public on(
		event: 'guildCreate' | 'guildDelete' | 'guildUnavailable',
		listener: (guild: Guild) => void,
	): this;
	public on(
		event: 'guildMemberAdd' | 'guildMemberAvailable' | 'guildMemberRemove',
		listener: (member: GuildMember | PartialGuildMember) => void,
	): this;
	public on(
		event: 'guildMembersChunk',
		listener: (
			members: Collection<Snowflake, GuildMember | PartialGuildMember>,
			guild: Guild,
		) => void,
	): this;
	public on(
		event: 'guildMemberSpeaking',
		listener: (member: GuildMember | PartialGuildMember, speaking: Readonly<Speaking>) => void,
	): this;
	public on(
		event: 'guildMemberUpdate',
		listener: (
			oldMember: GuildMember | PartialGuildMember,
			newMember: GuildMember | PartialGuildMember,
		) => void,
	): this;
	public on(event: 'guildUpdate', listener: (oldGuild: Guild, newGuild: Guild) => void): this;
	public on(event: 'inviteCreate' | 'inviteDelete', listener: (invite: Invite) => void): this;
	public on(event: 'guildIntegrationsUpdate', listener: (guild: Guild) => void): this;
	public on(
		event: 'message' | 'messageDelete' | 'messageReactionRemoveAll',
		listener: (message: Message | PartialMessage) => void,
	): this;
	public on(event: 'messageReactionRemoveEmoji', listener: (reaction: MessageReaction) => void): this;
	public on(
		event: 'messageDeleteBulk',
		listener: (messages: Collection<Snowflake, Message | PartialMessage>) => void,
	): this;
	public on(
		event: 'messageReactionAdd' | 'messageReactionRemove',
		listener: (messageReaction: MessageReaction, user: User | PartialUser) => void,
	): this;
	public on(
		event: 'messageUpdate',
		listener: (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => void,
	): this;
	public on(
		event: 'presenceUpdate',
		listener: (oldPresence: Presence | undefined, newPresence: Presence) => void,
	): this;
	public on(event: 'rateLimit', listener: (rateLimitData: RateLimitData) => void): this;
	public on(event: 'ready', listener: () => void): this;
	public on(event: 'roleCreate' | 'roleDelete', listener: (role: Role) => void): this;
	public on(event: 'roleUpdate', listener: (oldRole: Role, newRole: Role) => void): this;
	public on(
		event: 'typingStart' | 'typingStop',
		listener: (channel: Channel | PartialChannel, user: User | PartialUser) => void,
	): this;
	public on(
		event: 'userUpdate',
		listener: (oldUser: User | PartialUser, newUser: User | PartialUser) => void,
	): this;
	public on(
		event: 'voiceStateUpdate',
		listener: (oldState: VoiceState, newState: VoiceState) => void,
	): this;
	public on(event: 'webhookUpdate', listener: (channel: TextChannel) => void): this;
	public on(event: 'invalidated', listener: () => void): this;
	public on(event: 'shardDisconnect', listener: (event: CloseEvent, id: number) => void): this;
	public on(event: 'shardError', listener: (error: Error, id: number) => void): this;
	public on(event: 'shardReconnecting', listener: (id: number) => void): this;
	public on(event: 'shardReady', listener: (id: number) => void): this;
	public on(event: 'shardResume', listener: (id: number, replayed: number) => void): this;
	public on(event: string, listener: (...args: any[]) => void): this;
	public on(event: string, listener: (...args: any[]) => void): this {
		return this.passOn(event, listener);
	}

	public once(
		event: 'channelCreate' | 'channelDelete',
		listener: (channel: Channel | PartialChannel) => void,
	): this;
	public once(
		event: 'channelPinsUpdate',
		listener: (channel: Channel | PartialChannel, time: Date) => void,
	): this;
	public once(
		event: 'channelUpdate',
		listener: (oldChannel: Channel | PartialChannel, newChannel: Channel | PartialChannel) => void,
	): this;
	public once(event: 'debug' | 'warn', listener: (info: string) => void): this;
	public once(event: 'disconnect', listener: (event: any, shardID: number) => void): this;
	public once(event: 'emojiCreate' | 'emojiDelete', listener: (emoji: GuildEmoji) => void): this;
	public once(
		event: 'emojiUpdate',
		listener: (oldEmoji: GuildEmoji, newEmoji: GuildEmoji) => void,
	): this;
	public once(event: 'error', listener: (error: Error) => void): this;
	public once(
		event: 'guildBanAdd' | 'guildBanRemove',
		listener: (guild: Guild, user: User | PartialUser) => void,
	): this;
	public once(
		event: 'guildCreate' | 'guildDelete' | 'guildUnavailable',
		listener: (guild: Guild) => void,
	): this;
	public once(
		event: 'guildMemberAdd' | 'guildMemberAvailable' | 'guildMemberRemove',
		listener: (member: GuildMember | PartialGuildMember) => void,
	): this;
	public once(
		event: 'guildMembersChunk',
		listener: (
			members: Collection<Snowflake, GuildMember | PartialGuildMember>,
			guild: Guild,
		) => void,
	): this;
	public once(
		event: 'guildMemberSpeaking',
		listener: (member: GuildMember | PartialGuildMember, speaking: Readonly<Speaking>) => void,
	): this;
	public once(
		event: 'guildMemberUpdate',
		listener: (
			oldMember: GuildMember | PartialGuildMember,
			newMember: GuildMember | PartialGuildMember,
		) => void,
	): this;
	public once(event: 'guildUpdate', listener: (oldGuild: Guild, newGuild: Guild) => void): this;
	public once(event: 'guildIntegrationsUpdate', listener: (guild: Guild) => void): this;
	public once(
		event: 'message' | 'messageDelete' | 'messageReactionRemoveAll',
		listener: (message: Message | PartialMessage) => void,
	): this;
	public once(
		event: 'messageDeleteBulk',
		listener: (messages: Collection<Snowflake, Message | PartialMessage>) => void,
	): this;
	public once(
		event: 'messageReactionAdd' | 'messageReactionRemove',
		listener: (messageReaction: MessageReaction, user: User | PartialUser) => void,
	): this;
	public once(
		event: 'messageUpdate',
		listener: (oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => void,
	): this;
	public once(
		event: 'presenceUpdate',
		listener: (oldPresence: Presence | undefined, newPresence: Presence) => void,
	): this;
	public once(event: 'rateLimit', listener: (rateLimitData: RateLimitData) => void): this;
	public once(event: 'ready', listener: () => void): this;
	public once(event: 'roleCreate' | 'roleDelete', listener: (role: Role) => void): this;
	public once(event: 'roleUpdate', listener: (oldRole: Role, newRole: Role) => void): this;
	public once(
		event: 'typingStart' | 'typingStop',
		listener: (channel: Channel | PartialChannel, user: User | PartialUser) => void,
	): this;
	public once(
		event: 'userUpdate',
		listener: (oldUser: User | PartialUser, newUser: User | PartialUser) => void,
	): this;
	public once(
		event: 'voiceStateUpdate',
		listener: (oldState: VoiceState, newState: VoiceState) => void,
	): this;
	public once(event: 'webhookUpdate', listener: (channel: TextChannel) => void): this;
	public once(event: 'invalidated', listener: () => void): this;
	public once(event: 'shardDisconnect', listener: (event: CloseEvent, id: number) => void): this;
	public once(event: 'shardError', listener: (error: Error, id: number) => void): this;
	public once(event: 'shardReconnecting', listener: (id: number) => void): this;
	public once(event: 'shardReady', listener: (id: number) => void): this;
	public once(event: 'shardResume', listener: (id: number, replayed: number) => void): this;
	public once(event: string, listener: (...args: any[]) => void): this;
	public once(event: string, listener: (...args: any[]) => void): this {
		return this.passOnce(event, listener);
	}
}