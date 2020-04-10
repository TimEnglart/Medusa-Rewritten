import { Client, ClientOptions, User, GuildMember, TextChannel, VoiceChannel, ClientEvents } from "discord.js";
import CommandHandler from "./CommandHandler";
import { ISettingsTemplate } from "./settingsInterfaces";
import { ExperienceHandler} from "./experienceHandler";
import BungieAPIRequester from './BungieAPIRequester';
import { Logger, LogFilter } from "./logger";
import { Database } from "./database";
import { WebServer } from "./web-server";
import { ScoreBook } from "./score-book";
import { existsSync, readdirSync } from "fs";
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
		for (const fileName of readdirSync(commandFolder).filter((f) => f.split('.').pop() === 'js')) {
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
			for (const [, guild] of this.guilds.cache) {
				await this.databaseClient.batch(`INSERT IGNORE INTO U_Connected_Users VALUES (?)`, [
					[guild.members.cache.map((user) => [user.id])],
				]);
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
		const allReactionRoles = await this.databaseClient.query<IReactionRoleResponse>(
			`SELECT * FROM G_Reaction_Roles`,
		);
		for (const reactionRole of allReactionRoles) {
			try {
				const resolvedGuild = this.guilds.resolve(reactionRole.guild_id);
				if (resolvedGuild) {
					const resolvedTextChannel = resolvedGuild.channels.resolve(
						reactionRole.channel_id,
					) as TextChannel | null;
					if (resolvedTextChannel)
						await resolvedTextChannel.messages.fetch(reactionRole.message_id, true);
					else {
						// Cant Find Text Channel But Bot IS IN Guild
						// this.logger.logS(``);
					}
				} else {
					// Cant Find Text Channel Because Bot ISN'T IN Guild
					// this.logger.logS(``);
				}
			} catch (e) {
				// Error
			}
		}
		this.logger.logS(`Cached All Message Reactions`, LogFilter.Debug);

		const existingTempChannels = await this.databaseClient.query<ITempChannelResponse>(
			`SELECT * FROM G_Temp_Channels`,
		);
		// Check All Existing Temporary Channels & Delete if Empty
		for (const tempChannel of existingTempChannels) {
			const resolvedGuild = this.guilds.resolve(tempChannel.guild_id);
			if (resolvedGuild) {
				const resolvedVoiceChannel = resolvedGuild.channels.resolve(
					tempChannel.voice_channel_id,
				) as VoiceChannel | null;
				if (resolvedVoiceChannel) {
					if (!resolvedVoiceChannel.members.size) {
						await this.databaseClient.query<ITempChannelResponse>(
							`DELETE FROM G_Temp_Channels WHERE guild_id = ${tempChannel.guild_id} AND channel_id = ${tempChannel.voice_channel_id}`,
						);
						await resolvedVoiceChannel.delete('Remove Temp Channel');
					} else {
						// There are People in The Temp Voice Channel
						// this.logger.logS(``);
					}
				} else {
					// Cant Find Voice Channel But Bot IS IN Guild
					// this.logger.logS(``);
				}
			} else {
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

	private handleEvent<K extends keyof ClientEvents>(listener: (...args: ClientEvents[K]) => void,...args: ClientEvents[K]): void {
		const eventReceived = Date.now();
		const eventStatus: {
			message: string;
			error?: Error;
		} = {
			message: 'NO_MESSAGE',
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
			`[EVENT] Time To Execute: ${eventTime}\n${eventStatus.message}\n${
				eventStatus.error ? JSON.stringify(eventStatus.error) : ''
			}`,
			eventStatus.error ? 2 : 1,
		);
	}

	private passOn<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this {
		this.logger.logS(`Adding (On) Listener For Discord Event: ${event}`);
		super.on(event, (...args: ClientEvents[K]) => {
			this.handleEvent(listener, ...args);
		});
		return this;
	}
	private passOnce<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this {
		this.logger.logS(`Adding (Once) Listener For Discord Event: ${event}`);
		super.once(event, (...args: ClientEvents[K]) => {
			this.handleEvent(listener, ...args);
		});
		return this;
	}
	public on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
	public on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this {
		return this.passOn(event, listener);
	}
	public once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
	public once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this {
		return this.passOnce(event, listener);
	}
}