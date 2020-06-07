import ExtendedClient from "./ext/ExtendedClient";
import { LogFilter } from "./ext/logger";
import { AntiRepost } from "./ext/antiRepostInitiative";
import { ClanSync } from "./ext/clanCheck";
import { Message, MessageEmbed, TextChannel, VoiceChannel, MessageReaction } from "discord.js";
import RichEmbedGenerator from "./ext/RichEmbeds";
import { IGuildPrefixResponse, IConnectedUserResponse, IAutoRoleResponse, ILogChannelResponse, ITempChannelResponse, ITempChannelMasterResponse, IReactionRoleResponse } from "./ext/DatabaseInterfaces";
import { CommandError } from "./ext/errorParser";
import { inspect } from "util";
import { UpsertResult } from "mariadb";

const discordBot = new ExtendedClient({
	fetchAllMembers: true,
	presence: {
		status: 'dnd',
		activity: {
			name: 'Starting Up Boi',
			type: 'CUSTOM_STATUS',
		},
	},
});

process
	.on('unhandledRejection', (reason, p) => {
		discordBot.logger.logS(
			`Uncaught Promise Rejection:\nReason:\n${reason}\n\nPromise:\n${JSON.stringify(p)}`,
			LogFilter.Error,
		);
	})
	.on('uncaughtException', err => {
		console.log(err);
		discordBot.logger.logS(`Uncaught Exception thrown:\n${err}\nExiting...`, LogFilter.Error);
		process.exit(1);
	})
	.on('exit', e => {
		console.log(e);
	});
const memeChecker = new AntiRepost('410369296217407491');
const clanSync = new ClanSync(discordBot);

discordBot.on('message', async (message) => {
	// Check if Message Sender is a Bot
	if (!(message instanceof Message)) return;
	if (!message.author || message.author.bot) return;

	// Do Xp If in A Guild Channel
	if (message.channel && message.channel.type !== 'dm' && message.member) {
		const expData = await discordBot.experienceHandler.GiveExperience(message.author.id);
		if (expData.levelUps.length) {
			for (const levelUp of expData.levelUps) {
				if (message.member.lastMessage) await message.member.lastMessage.react(levelUp.emoji.id);
			}
			if (expData.level === discordBot.settings.lighthouse.ranks.length) {
				await message.author.send(
					RichEmbedGenerator.resetNotifyEmbed(
						'Rank Reset Is Now Available',
						'Use command ```guardian reset``` to continue your progression.',
					),
				);
			}
		}

		await memeChecker.run(message);
	}
	
	// Determine The Guild/Channel Prefix for Commands
	const guildPrefix = await discordBot.databaseClient.query<IGuildPrefixResponse>(
		`SELECT prefix FROM G_Prefix WHERE guild_id = ${message.guild ? message.guild.id : message.author.id}`,
	);
	const prefix = guildPrefix.length ? guildPrefix[0].prefix : discordBot.settings.defaultPrefix;

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
	message.channel.startTyping();
	const commandFile = await discordBot.commandHandler.ExecuteCommand(commandName.toLowerCase(), message, ...args);
	if (commandFile.error) {
		if (commandFile.error instanceof CommandError) {
			discordBot.logger.logS(
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
			discordBot.logger.logS(
				`Command: ${commandName} Failed to Execute.\nExecuting User: ${message.author.username}\nReason: ${commandFile.error.name}\nStack Trace: ${commandFile.error.stack}`, 2);
			message.channel.send(
				RichEmbedGenerator.errorEmbed(
					`An Error Occurred When Running the Command ${commandName}`,
					`No Reason Provided`,
				),
			);
		}
		discordBot.logger.logS(
			`Command Error Occurred:\n
							Failing Command: ${commandName}\n
							Executing User: ${message.author.tag}\n
							Raw Error:\n
							${inspect(commandFile.error)}`,
			LogFilter.Error,
		);
	}
	message.channel.stopTyping(true);
});
discordBot.on('error', error =>
	discordBot.logger.logS(`Unknown Discord.js Error Occurred:\nRaw Error:\n${error}`, LogFilter.Error),
);
discordBot.on('warn' || 'debug', async info =>
	discordBot.logger.logS(`Discord Warn/Debug Message: ${info}`, LogFilter.Debug),
);

discordBot.on('guildCreate', async (guild) => {
	await discordBot.databaseClient.query<UpsertResult>(`INSERT IGNORE INTO G_Connected_Guilds VALUES(${guild.id})`);
	discordBot.logger.logS(
		`Joined Guild: ${guild.name}(${guild.id})`,
		LogFilter.Debug,
	);
});

discordBot.on('guildMemberAdd', async(member) => {
	if (!member.guild || !member.user) return; // wtf is this master update
	
	await discordBot.databaseClient.query<IConnectedUserResponse>(
		`INSERT IGNORE INTO U_Connected_Users VALUES(${member.id})`,
	);

	// Enable User in Xp Database
	await discordBot.experienceHandler.connectUser(member.id);
	// Assign Default Server Role
	const autoRole = await discordBot.databaseClient.query<IAutoRoleResponse>(
		`SELECT * FROM G_Auto_Role WHERE guild_id = ${member.guild.id}`,
	);
	if (autoRole.length && member.roles) {
		const role = member.guild.roles.resolve(autoRole[0].role_id);
		if (role) await member.roles.add(role);
	}
	// Send User Joined Message to Moderator Channel
	const eventChannel = await discordBot.databaseClient.query<ILogChannelResponse>(
		`SELECT text_channel_id FROM G_Event_Log_Channel WHERE guild_id = ${member.guild.id}`,
	);
	if (eventChannel.length) {
		const botEmbed = new MessageEmbed()
			.setTitle('Displaying New User Profile')
			.setThumbnail(member.user.avatarURL() || '')
			.setColor('#00dde0')
			.addFields(
				{ name: 'Name', value: `${member.user.tag} | ${member.displayName} (${member.id})`, inline: true },
				{ name: 'Created', value: `${member.user.createdAt}`, inline: false });
		const channel = member.guild.channels.resolve(eventChannel[0].text_channel_id) as TextChannel | null;
		if(channel) await channel.send(`**Guardian ${member.user} has joined ${member.guild}!**`, botEmbed);
	}
	discordBot.logger.logS(
		`User: ${member.user.username}(${member.user.id}) Joined Guild: ${member.guild.name}(${
			member.guild.id
		})`,
		LogFilter.Debug,
	);
});

discordBot.on('guildMemberRemove', async (member) => {
	if (!member.guild || !member.user) return; // wtf is this master update
	// Disable User in Xp Database
	await discordBot.experienceHandler.disconnectUser(member.id);
	// Send User Left Message to Moderator Channel

	const eventChannel = await discordBot.databaseClient.query(
		`SELECT text_channel_id FROM G_Event_Log_Channel WHERE guild_id = ${member.guild.id}`,
	);
	if (eventChannel.length) {
		const botEmbed = new MessageEmbed()
			.setTitle('Guardian Down! <:down:513403773272457231>')
			.setThumbnail(member.user.avatarURL() || '')
			.setColor('#ba0526')
			.addFields(
				{ name: 'Name', value: `${member.user.tag} | ${member.displayName} (${member.id})`, inline: true },
				{ name: 'First Joined', value: `${member.joinedAt}`, inline: false },
			);
		const channel = member.guild.channels.resolve(eventChannel[0].text_channel_id) as TextChannel | null;
		if(channel) await channel.send(`**Guardian ${member.user} has left ${member.guild}!**`, botEmbed);
	}
	discordBot.logger.logS(
		`User: ${member.user.username}(${member.user.id}) Left Guild: ${member.guild.name}(${
			member.guild.id
		})`,
		LogFilter.Debug,
	);
});

discordBot.on('voiceStateUpdate', async (previousVoiceState, newVoiceState) => {
	if(newVoiceState.channel)
	{
		if (discordBot.TempChannelHandler.isMasterTempChannel(newVoiceState.channel)) { // Do Temp Channel
			const tempChannel = await discordBot.TempChannelHandler.AddTempChannel(newVoiceState.channel);
			await newVoiceState.setChannel(tempChannel);
		}
		discordBot.experienceHandler
	}
		
	if(previousVoiceState.channel)
		if(discordBot.TempChannelHandler.isTempChannel(previousVoiceState.channel) && previousVoiceState.channel.members.size === 0)
			discordBot.TempChannelHandler.DeleteEmptyChannel(previousVoiceState.channel);
});

discordBot.on('messageReactionAdd', async (reaction, user) => {
	
	await discordBot.ReactionRoleHandler.OnReactionAdd(reaction, user);
});

discordBot.on('messageReactionRemove', async (reaction, user) => {

	await discordBot.ReactionRoleHandler.OnReactionRemove(reaction, user)
	
});

discordBot.on('ready', async () => {
	if (!discordBot.user) return;
	await discordBot.user.setActivity(`BOOT SEQUENCE INITIALIZATION`, { type: 'WATCHING' });

	await discordBot.PrimeDatabase();
	await discordBot.CacheAndCleanUp();
	// Cache All Messages That Have Reaction Roles Linked to Them
	discordBot.LoadCommands();
	
	if (!discordBot.settings.debug) {
		discordBot.RandomPresence(); // Cycles Through Set Presences (in 'discordBot.activites')
		discordBot.scoreBook.start(); // Starts The Automated Score Book Process
	} else {
		discordBot.logger.logS('DEBUG MODE ENABLED', 1);
	}

	await discordBot.user.setActivity(`READY`, { type: 'PLAYING' });
	discordBot.logger.logS(`COMPLETED ALL BOOT SEQUENCES`);
	discordBot.logger.logS(`${discordBot.user.username} is Online!`)
});

discordBot.login(
	!discordBot.settings.debug ? discordBot.settings.tokens.production : discordBot.settings.tokens.debugging,
);
