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
import ExtendedClientCommand from "./CommandTemplate";
import * as path from 'path';
import { MongoDBHandler } from "./newDatabaseHandler";

interface IExtendedClientStaticPaths {
	SettingsFile: string;
	PackageFile: string;
	WorkingPath: string;
}
interface IExtendedClientDynamicPaths {
	CommandFolder: {
		Relative: string;
		Absolute: string;
	};
	LoggingFolder: string;
}
	

	
export default class ExtendedClient extends Client {
	public commandHandler: CommandHandler;
	public settings: ISettingsTemplate;
	public experienceHandler: ExperienceHandler;
	public logger: Logger;
	public nextDBClient: MongoDBHandler;
	public webServer: WebServer;
	public scoreBook: ScoreBook;
	public bungieApiRequester: BungieAPIRequester;
	public MedalHandler: MedalHandler;
	public TempChannelHandler: TempChannelHandler;
	public ReactionRoleHandler: ReactionRoleHandler;
	private BasePaths: IExtendedClientStaticPaths;
	private DynamicPaths: IExtendedClientDynamicPaths;
	constructor(options?: ClientOptions) {
		super(options);
		// Extended Client Stuff Here
		if (!require.main) throw new Error('Unable to Resolve Working Directory');
		this.BasePaths = this.ResolveBasePaths();
		if (!existsSync(this.BasePaths.SettingsFile)) throw new Error('No Settings Provided For Bot');
		this.settings = require(this.BasePaths.SettingsFile);
		this.DynamicPaths = this.ResolveDynamicPaths({
			commandDirectory: this.settings.commandDir,
			LogDirectory: 'logs', // Change Config File For Different Path
		});
		this.logger = new Logger(
			this.DynamicPaths.LoggingFolder,
			[LogFilter.Info, LogFilter.Debug, LogFilter.Error, LogFilter.Success],
			true,
		);
		this.nextDBClient = new MongoDBHandler(this.logger, this.settings.database.mongo.uri);
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

	private ResolveBasePaths(): IExtendedClientStaticPaths {
		if (!require.main) throw new Error('Unable to Resolve Working Directory');
		const workingDirectory = path.dirname(require.main.filename);
		return {
			WorkingPath: workingDirectory,
			PackageFile: path.resolve(workingDirectory, 'package.json'),
			SettingsFile: path.resolve(workingDirectory, 'config', 'settings.json'),
		};
	}
	private ResolveDynamicPaths(overrides?: {
		commandDirectory?: string;
		LogDirectory?: string;
	}): IExtendedClientDynamicPaths {
		if (!this.BasePaths.WorkingPath) throw new Error('Unable to Resolve Working Directory');
		return {
			CommandFolder: {
				Relative: overrides?.commandDirectory || 'cmds',
				Absolute: path.resolve(
					this.BasePaths.WorkingPath,
                                   overrides?.commandDirectory || 'cmds',
				),
			},
			LoggingFolder: path.join(this.BasePaths.WorkingPath, overrides?.LogDirectory || 'logs'),
		};
	}

	public LoadCommands(): void {
		this.logger.logS(`Command Directory: ${this.DynamicPaths.CommandFolder.Absolute}`, 1);
		const commandFiles = readdirSync(this.DynamicPaths.CommandFolder.Absolute).filter(
			(f) => f.split('.').pop() === 'js',
		);
		for (const fileName of commandFiles) {
			try {
				this.logger.logS(
					`Loading Command File: ${path.join(
						this.DynamicPaths.CommandFolder.Relative,
						fileName,
					)}`,
					1,
				);
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const commandFile:
				| typeof ExtendedClientCommand
				| typeof ExtendedClientCommand[] = require(`${path.join(
					this.DynamicPaths.CommandFolder.Absolute,
					fileName,
				)}`).default;
				if (Array.isArray(commandFile))
					for (const command of commandFile) {
						this.commandHandler.AddCommand(command);
					}
				else this.commandHandler.AddCommand(commandFile);
			} catch (e) {
				this.logger.logS(
					`Failed to Load Command File: ${path.join(
						this.DynamicPaths.CommandFolder.Absolute,
						fileName,
					)}`,
					2,
				);
			}
		}
		this.logger.logS(`${commandFiles.length} Command Files Loaded`, 3);
	}
	public RandomPresence(): void {
		// ONLY CALL ONCE
		if (this.user) {
			this.user.setPresence({
				activity: {
					name: this.settings.statuses[
						Math.floor(Math.random() * this.settings.statuses.length)
					],
					type: 'PLAYING',
				},
				status: 'online',
			});
		}
		setTimeout(() => this.RandomPresence(), 600000);
	}

	public async PrimeDatabase(): Promise<void> {
		// Relation Databases...
		try {
			this.logger.logS('Started Database Prime', LogFilter.Debug);
			// Add All Missing Guilds & Users

			const guildCollection = await this.nextDBClient.getCollection('guilds');
			await guildCollection.insertMany(this.guilds.cache.map((guild) => { return { _id: guild.id } }), {ordered: false});
			const userCollection = await this.nextDBClient.getCollection('users');
			for (const [, guild] of this.guilds.cache) {
				try {
					await userCollection.insertMany(
						guild.members.cache.map((user) => {
							return {
								_id: user.id,
								$addToSet: {
									connectedGuilds: guild.id,
								},
							};
						}),
						{ ordered: true },
					);
				}
				catch (e) {
					// may fail due to multiple keys
					this.logger.logS(`Failed to Add Record in Database Prime: ${e}`, LogFilter.Error);
				}
			}
			const disabledCommands = Object.keys(this.commandHandler.DisabledCommands);
			this.logger.logS(
				`Finished Database Prime\n# Guilds: ${this.guilds.cache.size}\n# Disabled Commands: ${disabledCommands.length}`,
				LogFilter.Debug,
			);
		} catch (e) {
			this.logger.logS(`Database Prime Failed\n${e}`, LogFilter.Error);
		}
	}
	public async CacheAndCleanUp(): Promise<void> { // move this to dedicated Classes
		const reactionRoleCollection = await this.nextDBClient.getCollection('roleReactions');
		for await (const reactionRole of reactionRoleCollection.find()) {
			try {
				const resolvedGuild = this.guilds.resolve(reactionRole.guildId);
				if (resolvedGuild) {
					const resolvedTextChannel = resolvedGuild.channels.resolve(
						reactionRole.channelId,
					) as TextChannel | null;
					if (resolvedTextChannel)
						await resolvedTextChannel.messages.fetch(reactionRole.messageId, true);
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

		await this.TempChannelHandler.UpdateFromDatabase();
		
		const tempChannelCollection = await this.nextDBClient.getCollection('temporaryChannels');
		// Check All Existing Temporary Channels & Delete if Empty
		for await (const tempChannel of tempChannelCollection.find()) {
			const resolvedGuild = this.guilds.resolve(tempChannel.guildId);
			if (resolvedGuild) {
				const resolvedVoiceChannel = resolvedGuild.channels.resolve(
					tempChannel.voiceChannelId,
				) as VoiceChannel | null;
				if (resolvedVoiceChannel) {
					if (!resolvedVoiceChannel.members.size) {
						await tempChannelCollection.deleteOne({
							guildId: tempChannel.guildId,
							voiceChannelId: tempChannel.voiceChannelId,
						});
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

	private async handleEvent<K extends keyof ClientEvents>(
		eventName: K,
		listener: (...args: ClientEvents[K]) => void,
		...args: ClientEvents[K]
	): Promise<void> {
		const eventReceived = Date.now();
		let eventError: Error | null = null;
		try {
			await listener(...args);
		} catch (e) {
			eventError = new Error(`${eventName}`);
		}
		const eventTime = Date.now() - eventReceived;
		this.logger.logS(
			`[EVENT - ${eventName.toUpperCase()}] Time To Execute: ${eventTime}ms${
				eventError ? `\n${JSON.stringify(eventError)}` : ''
			}`,
			eventError ? 2 : 1,
		);
	}
	public on<K extends keyof ClientEvents>(
		event: K,
		listener: (...args: ClientEvents[K]) => void,
	): this {
		this.logger.logS(`[LISTENER - On] Added Listener For Event: ${event}`, 1);
		return super.on(event, (...args: ClientEvents[K]) => {
			this.handleEvent(event, listener, ...args);
		});
	}
	public once<K extends keyof ClientEvents>(
		event: K,
		listener: (...args: ClientEvents[K]) => void,
	): this {
		this.logger.logS(`[LISTENER - Once] Added Listener For Event: ${event}`, 1);
		return super.once(event, (...args: ClientEvents[K]) => {
			this.handleEvent(event, listener, ...args);
		});
	}
}