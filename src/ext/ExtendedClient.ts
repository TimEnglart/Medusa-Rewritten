import { Client, ClientOptions, User, GuildMember, TextChannel, VoiceChannel, ClientEvents, MessageEmbed, Message, Guild, PartialGuildMember, VoiceState, MessageReaction, PartialUser, RateLimitData } from "discord.js";
import CommandHandler from "./CommandHandler";
import { ISettingsTemplate } from "./settingsInterfaces";
import { ExperienceHandler } from "./experienceHandler";
import BungieAPIRequester from './BungieAPIRequester';
import { Logger, LogFilter } from "./logger";
import { WebServer } from "./web-server";
// import { ScoreBook } from "./score-book";
import { existsSync, readdirSync } from "fs";
import MedalHandler from "./MedalHandler";
import TempChannelHandler from "./TempChannelHandler";
import ReactionRoleHandler from "./ReactionRoleHandler";
import ExtendedClientCommand from "./CommandTemplate";
import * as path from 'path';
import { MongoDBHandler } from "./newDatabaseHandler";
import HotReload from "./HotReload";
import { exec, execSync, ExecException } from "child_process";
import RichEmbedGenerator from "./RichEmbeds";
import { inspect } from "util";
import { CommandError } from "./errorParser";
import RainbowRoleHandler from "./RainbowRoleHandler";

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

interface IExtendedClientOptions extends ClientOptions {
	reloader?: HotReload;
}
export const ChannelTypes = {
	dm: 'Direct Message',
	text: 'Guild Text Channel',
	voice: 'Guild Voice Channel',
	category: 'Guild Category Channel',
	news: 'Guild News Channel',
	store: 'Guild Store Channel',
	unknown: 'Unknown Channel',
};

export default class ExtendedClient extends Client {
	public readonly commandHandler: CommandHandler;
	public readonly settings: ISettingsTemplate;
	public readonly experienceHandler: ExperienceHandler;
	public readonly logger: Logger;
	public readonly nextDBClient: MongoDBHandler;
	public readonly webServer: WebServer;
	//public scoreBook: ScoreBook;
	public readonly bungieApiRequester: BungieAPIRequester;
	public readonly MedalHandler: MedalHandler;
	public readonly TempChannelHandler: TempChannelHandler;
	public readonly ReactionRoleHandler: ReactionRoleHandler;
	public readonly BasePaths: IExtendedClientStaticPaths;
	public readonly DynamicPaths: IExtendedClientDynamicPaths;
	public readonly HotReloader?: HotReload<ExtendedClient>;
	public readonly RainbowRoles: RainbowRoleHandler;

	constructor(options?: IExtendedClientOptions) {
		super(options);
		if (options)
			this.HotReloader = options.reloader;
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
		this.logger.logS(`Working Path: ${this.BasePaths.WorkingPath}`);
		this.nextDBClient = new MongoDBHandler(this.logger, this.settings.database.mongo.uri);
		this.commandHandler = new CommandHandler(this);
		this.experienceHandler = new ExperienceHandler(this);
		this.webServer = new WebServer(this);
		//this.scoreBook = new ScoreBook(this);
		this.bungieApiRequester = new BungieAPIRequester("", this.logger, {
			headers: {
				'X-API-Key': this.settings.bungie.apikey,
			},
		});
		this.MedalHandler = new MedalHandler(this);
		this.TempChannelHandler = new TempChannelHandler(this);
		this.ReactionRoleHandler = new ReactionRoleHandler(this);
		this.RainbowRoles = new RainbowRoleHandler(this, 1500);
		this.LoadListeners();
	}


	public login(token?: string): Promise<string> {
		return super.login(token || this.settings.debug ? this.settings.tokens.debugging : this.settings.tokens.production);
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
				console.error(e);
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
		setTimeout(this.RandomPresence.bind(this), 600000);
	}

	public async PrimeDatabase(): Promise<void> {
		// Relation Databases...
		try {
			this.logger.logS('Started Database Prime', LogFilter.Debug);
			// Add All Missing Guilds & Users

			const guildCollection = await this.nextDBClient.getCollection('guilds');
			await guildCollection.insertMany(this.guilds.cache.map((guild) => { return { _id: guild.id } }), { ordered: false });
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
		const reactionRoles = await this.ReactionRoleHandler.GetRemoteReactionRoles();
		for (const reactionRole of reactionRoles.values()) {
			try {
				const resolvedGuild = this.guilds.resolve(reactionRole.guildId);
				if (resolvedGuild) {
					const resolvedTextChannel = resolvedGuild.channels.resolve(reactionRole.channelId) as TextChannel | null;
					if (resolvedTextChannel)
						await resolvedTextChannel.messages.fetch(reactionRole.messageId, true);
					else {
						// Cant Find Text Channel But Bot IS IN Guild
						this.logger.logS(`Cannot Find Channel: ${reactionRole.channelId} in Guild: ${resolvedGuild.name}(${resolvedGuild.id})`, 2);
					}
				} else {
					// Cant Find Text Channel Because Bot ISN'T IN Guild
					this.logger.logS(`No Longer in Guild ${reactionRole.guildId} Therefore Cannot Resolve Channel: ${reactionRole.channelId}`, 2);
				}
			} catch (e) {
				// Error
				this.logger.logS(`Unknown Error Occurred When Caching Reaction Roles for Reaction Role:\n${JSON.stringify(reactionRole)}\n\nError:\n${JSON.stringify(e)}`, 2);
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
						//this.logger.logS(``);
					}
				} else {
					// Cant Find Voice Channel But Bot IS IN Guild
					this.logger.logS(`Cannot Find Voice Channel: ${tempChannel.voiceChannelId} in Guild: ${resolvedGuild.name} (${resolvedGuild.id})`);
				}
			} else {
				// Not In Server
				this.logger.logS(`No Longer in Guild: ${tempChannel.guildId} Therefore Cannot Resolve Voice Channel: ${tempChannel.voiceChannelId}`, LogFilter.Error);
			}
		}
		this.logger.logS(`Deleted All Empty Temp Channels`, LogFilter.Debug);


		await this.ReactionRoleHandler.assignMissingRoles();
		this.logger.logS(`Removed and Assigned all Reaction Roles Which Occured While Offline`, LogFilter.Debug);

	}
	public isSuperUser(user: User | GuildMember | string | undefined): boolean {
		if (user instanceof User || user instanceof GuildMember)
			return this.settings.superUsers.includes(user.id);
		else if (typeof user === 'string') return this.settings.superUsers.includes(user);
		return false;
	}

	private async handleEvent<K extends keyof ClientEvents>(
		eventName: K,
		listener: (...args: ClientEvents[K]) => void | Promise<void>,
		...args: ClientEvents[K]
	): Promise<void> {
		const eventReceived = Date.now();
		let eventError: any | null = null;
		try {
			await listener(...args);
		} catch (e) {
			eventError = e;
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


	public LoadListeners(): void {
		this.on('message', this.onMessage.bind(this));
		this.on('error', this.onError.bind(this));
		this.on('warn', this.onWarn.bind(this));
		this.on('guildCreate', this.onGuildJoin.bind(this));
		this.on('guildMemberAdd', this.onGuildMemberJoin.bind(this));
		this.on('guildMemberRemove', this.onGuildMemberLeave.bind(this));
		this.on('voiceStateUpdate', this.onVoiceStateUpdate.bind(this));
		this.on('messageReactionAdd', this.onMessageReactionAdd.bind(this));
		this.on('messageReactionRemove', this.onMessageReactionRemove.bind(this));
		this.on('ready', this.onReady.bind(this));

		//if (this.settings.debug) {
		this.on('debug', this.onDebug.bind(this));
		this.on('rateLimit', this.onRateLimit.bind(this));
		this.on('invalidated', this.onInvalidated.bind(this));
		//}
	}

	public Update(): void {
		this.logger.logS('Performing Client Update', LogFilter.Debug);
		exec(`cd "${this.BasePaths.WorkingPath}" && git pull && npm run build`,
			(error, stdout, stderr) => {
				if (error) this.logger.logS(`Failed Update Operation:\n${error.message}`, LogFilter.Error);
				else this.logger.logS(`Update Response:\nOutput: ${stdout}\nError: ${stderr}`, LogFilter.Debug);
				if (this.HotReloader)
					this.HotReloader.reload();
			}
		);
	}
	public Version(): Promise<string> {
		return new Promise((res: (ret: string) => void) => {
			exec(`cd "${this.BasePaths.WorkingPath}" && git rev-parse HEAD`, function (err, stdout) {
				return res(stdout);
			});
		});
	}

	protected onRateLimit(rateLimitData: RateLimitData): void {
		this.logger.logS(`Request to: ${rateLimitData.path} has Triggered a Rate Limit... Time Limited: ${rateLimitData.timeout}`);
	}
	protected onInvalidated(): void {
		this.Update();
	}


	protected async onMessage(message: Message): Promise<void> {
		// Check if Message Sender is a Bot
		if (!message.author || message.author.bot) return;

		// Do Xp If in A Guild Channel
		if (message.channel && message.channel.type !== 'dm') {
			const expData = await this.experienceHandler.GiveExperience(message.author);
			if (expData.levelUps.length) {
				for (const levelUp of expData.levelUps) {
					if (message.member?.lastMessage) await message.member.lastMessage.react(levelUp.emoji.id);
				}
				if (expData.level === this.settings.lighthouse.ranks.length) {
					await message.author.send(
						RichEmbedGenerator.resetNotifyEmbed(
							'Rank Reset Is Now Available',
							'Use command ```guardian reset``` to continue your progression.',
						),
					);
				}
			}

			//await memeChecker.run(message);
		}

		// Determine The Guild/Channel Prefix for Commands
		const guildCollection = await this.nextDBClient.getCollection('guilds');
		const guildPrefix = await guildCollection.findOne({ _id: message.guild ? message.guild.id : message.author.id });
		const prefix = guildPrefix ? guildPrefix.prefix : this.settings.defaultPrefix;

		// Check if Sent Message Starts With the Servers Prefix
		if (!message.content.startsWith(prefix)) return;

		// Remove Prefix off the Message to give Command + Arguments
		const args = message.content
			.slice(prefix.length)
			.trim()
			.split(/ +/g);

		// Separate Command And Arguments
		const commandName = args.shift();
		if (!commandName || !/^[a-zA-Z]+$/.test(commandName)) return;
		// Attempt to Run Supplied Command
		
		const commandFile = await this.commandHandler.ExecuteCommand(commandName.toLowerCase(), message, ...args);
		if (commandFile.error) {
			if (commandFile.error instanceof CommandError) {
				this.logger.logS(
					`Command: ${commandName} Failed to Execute.\nExecuting User: ${message.author.username}\nReason: ${commandFile.error.name} -> ${commandFile.error?.reason}\nStack Trace: ${commandFile.error.stack}`, 2
				);
				if (commandFile.error.message !== 'NO_COMMAND')
					message.channel.send(
						RichEmbedGenerator.errorEmbed(
							`An Error Occurred When Running the Command ${commandName}`,
							`Provided Reason: ${commandFile.error.reason}`,
						),
					);
			}
			else {
				this.logger.logS(
					`Command: ${commandName} Failed to Execute.\nExecuting User: ${message.author.username} (${message.author.id})\nReason: ${commandFile.error.name}\nStack Trace: ${commandFile.error.stack}`, 2);
				message.channel.send(
					RichEmbedGenerator.errorEmbed(
						`An Error Occurred When Running the Command ${commandName}`,
						`No Reason Provided`,
					),
				);
			}
			/*
			this.logger.logS(
				`Command Error Occurred:\n
							Failing Command: ${commandName}\n
							Executing User: ${message.author.tag}\n
							Raw Error:\n
							${inspect(commandFile.error)}`,
				LogFilter.Error,
			);
			*/
		}
		message.channel.stopTyping(true);
	}




	protected async onGuildJoin(guild: Guild): Promise<void> {
		const guildCollection = await this.nextDBClient.getCollection('guilds');
		await guildCollection.updateOne({ _id: guild.id }, { $set: { _id: guild.id } }, { upsert: true });
		this.logger.logS(`Joined Guild: ${guild.name}(${guild.id})`, LogFilter.Debug);
	}


	protected async onGuildMemberJoin(guildMember: GuildMember | PartialGuildMember): Promise<void> {
		try {
		// Enable User in Xp Database
			// await this.experienceHandler.connectUser(guildMember);
			// Assign Default Server Role
			const guildCollection = await this.nextDBClient.getCollection('guilds');
			const guild = await guildCollection.findOne({
				_id: guildMember.guild.id
			});

			if (guild && guild.autoRoleId && guildMember.roles) {
				const role = guildMember.guild.roles.resolve(guild.autoRoleId);
				if (role) await guildMember.roles.add(role);
			}
			// Send User Joined Message to Moderator Channel
			if (guildMember.user) {
				if (guild && guild.eventChannelId) {
					const botEmbed = new MessageEmbed()
						.setTitle('Displaying New User Profile')
						.setThumbnail(guildMember.user.avatarURL() || '')
						.setColor('#00dde0')
						.addFields(
							{ name: 'Name', value: `${guildMember.user.tag} | ${guildMember.displayName} (${guildMember.id})`, inline: true },
							{ name: 'Created', value: `${guildMember.user.createdAt}`, inline: false },
						);
					const channel = guildMember.guild.channels.resolve(guild.eventChannelId) as TextChannel | null;
					if (channel) await channel.send(`**Guardian ${guildMember.user} has joined ${guildMember.guild}!**`, botEmbed);
				}
				this.logger.logS(`User: ${guildMember.displayName}(${guildMember.id}) Joined Guild: ${guildMember.guild.name}(${guildMember.guild.id})`, LogFilter.Debug);
			}
		}
		catch (e) {
			this.logger.logS(JSON.stringify(e), 2);
		}
	}

	protected async onGuildMemberLeave(guildMember: GuildMember | PartialGuildMember): Promise<void> {
		try{

			// Disable User in Xp Database
			// await this.experienceHandler.disconnectUser(guildMember);
			// Send User Left Message to Moderator Channel
			const guildCollection = await this.nextDBClient.getCollection('guilds');
			const guild = await guildCollection.findOne({
				_id: guildMember.guild.id,
			});
			if (guildMember.user) {
				if (guild && guild.eventChannelId) {
					const botEmbed = new MessageEmbed()
						.setTitle(`Guardian Down! <:down:513403773272457231>`)
						.setThumbnail(guildMember.user.avatarURL() || '')
						.setColor('#ba0526')
						.addFields(
							{ name: 'Name', value: `${guildMember.user.tag} | ${guildMember.displayName} (${guildMember.id})`, inline: true },
							{ name: 'First Joined', value: `${guildMember.joinedAt}`, inline: false },
						);
					const userBan = (await guildMember.guild.fetchBans()).get(guildMember.id);
					if (userBan)
						botEmbed.addField('BANNED', userBan.reason || 'Unspecified Reason');
					const channel = guildMember.guild.channels.resolve(guild.eventChannelId) as TextChannel | null;
					if (channel) await channel.send(`**Guardian ${guildMember.user} has left ${guildMember.guild}!**`, botEmbed);
				}
				this.logger.logS(`User: ${guildMember.user.username}(${guildMember.id}) Left Guild: ${guildMember.guild.name}(${guildMember.guild.id})`, LogFilter.Debug);
			}
		}
		catch(e){
			this.logger.logS(JSON.stringify(e), 2);
		}
	}

	protected async onVoiceStateUpdate(previousVoiceState: VoiceState, newVoiceState: VoiceState): Promise<void> {
		if (newVoiceState.channel) {
			if (this.TempChannelHandler.isMasterTempChannel(newVoiceState.channel)) { // Do Temp Channel
				const tempChannel = await this.TempChannelHandler.AddTempChannel(newVoiceState.channel);
				await newVoiceState.setChannel(tempChannel);
			}
		}

		if (previousVoiceState.channel)
			if (this.TempChannelHandler.isTempChannel(previousVoiceState.channel) && previousVoiceState.channel.members.size === 0)
				this.TempChannelHandler.DeleteEmptyChannel(previousVoiceState.channel);
	}

	protected async onMessageReactionAdd(reaction: MessageReaction, user: User | PartialUser): Promise<void> {
		await this.ReactionRoleHandler.OnReactionAdd(reaction, user);
	}
	protected async onMessageReactionRemove(reaction: MessageReaction, user: User | PartialUser): Promise<void> {
		await this.ReactionRoleHandler.OnReactionRemove(reaction, user);
	}

	protected async onReady(): Promise<void> {
		
		if (!this.user) return;
		await this.user.setActivity(`BOOT SEQUENCE INITIALIZATION`, { type: 'WATCHING' });

		await this.PrimeDatabase();
		await this.CacheAndCleanUp();
		// Cache All Messages That Have Reaction Roles Linked to Them
		this.LoadCommands();

		if (!this.settings.debug) {
			this.RandomPresence(); // Cycles Through Set Presences (in 'this.activites')
			//this.scoreBook.start(); // Starts The Automated Score Book Process
		} else {
			this.logger.logS('DEBUG MODE ENABLED', 1);
		}
		await this.user.setActivity(`READY`, { type: 'PLAYING' });
		this.logger.logS(`Successfully Booted and Online -> ${this.user.username}`, LogFilter.Success);
		this.RainbowRoles.start();
	}

	protected onError(error: Error): void {
		this.logger.logS(`Unknown Discord.js Error Occurred:\nRaw Error:\n${error}`, LogFilter.Error);
	}
	protected onWarn(warning: string): void {
		this.logger.logS(`Discord Warn Message: ${warning}`, LogFilter.Debug);
	}
	protected onDebug(debug: string): void {
		this.logger.logS(`Discord Debug Message: ${debug}`, LogFilter.Debug);
	}

}