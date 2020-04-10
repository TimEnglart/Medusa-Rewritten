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
		// yeet await doXp(message.member);
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
	if (!commandName || /^[a-zA-Z]+$/.test(commandName)) return;
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
				{ name: 'Name', value: `${member.user.tag} | ${member.displayName}`, inline: true },
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
				{ name: 'Name', value: `${member.user.tag} | ${member.displayName}`, inline: true },
				{ name: 'First Joined', value:`${member.joinedAt}`, inline: false })
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
		if(discordBot.TempChannelHandler.isMasterTempChannel(newVoiceState.channel)) {
			const tempChannel = await discordBot.TempChannelHandler.AddTempChannel(newVoiceState.channel);
			await newVoiceState.setChannel(tempChannel);
		}
	if(previousVoiceState.channel)
		if(discordBot.TempChannelHandler.isTempChannel(previousVoiceState.channel))
			discordBot.TempChannelHandler.RemoveTempChannel(previousVoiceState.channel);
	const attemptDeleteChannel = async (channel: VoiceChannel | null): Promise<void> => {
		// If New Temp Channel is Empty
		if (channel && !channel.members.size) {
			// See if Channel is a Temp Channel
			const tempChannels = await discordBot.databaseClient.query<ITempChannelResponse>(
				`SELECT * FROM G_Temp_Channels WHERE voice_channel_id = ${channel.id} AND guild_id = ${channel.guild.id}`,
			);
				// If Channel is In Database
			if (tempChannels.length) {
				await discordBot.databaseClient.query<ITempChannelResponse>(
					`DELETE FROM G_Temp_Channels WHERE voice_channel_id = ${channel.id} AND guild_id = ${channel.guild.id}`,
				);
				// Ensure Right Channel is Deleted
				const tempChannel = channel.guild.channels.resolve(
					tempChannels[0].voice_channel_id,
				) as VoiceChannel | null;
				if (tempChannel) {
					await tempChannel.delete('Dynamic Channel Destroyed');
					discordBot.logger.logS(
						`Deleting Temporary Channel: ${tempChannel.name}(${tempChannel.id})`,
						LogFilter.Debug,
					);
				}
			}
		}
	};

	const newUserChannel = newVoiceState.channel;

	if (!newVoiceState.member) return; //

	// If User has Joined A Channel
	if (newUserChannel) {
		// Check If User is **NOT** Getting Xp
		if (!discordBot.experienceHandler.VoiceChannelOccupants[newVoiceState.member.id]) {
			// Start Xp Tick and Add to Tracking List
			discordBot.experienceHandler.VoiceChannelOccupants[newVoiceState.member.id] = {channelId: newUserChannel.id, time: Date.now() };
			//await exp.voiceChannelXp(newVoiceState.member || undefined, 25, discordBot);
		}
		// See If Channel Joined is a Tempory Channel Master
		const isTempChannelMaster = (
			await discordBot.databaseClient.query<ITempChannelMasterResponse>(
				`SELECT * FROM G_Master_Temp_Channels WHERE voice_channel_id = ${newUserChannel.id} AND guild_id = ${newVoiceState.guild.id}`,
			)
		).length;
		if (isTempChannelMaster) {
			// Channel is A Tempory Master

			// Regex to Check if String is an Emoji
			// let emojidetection = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g; // var emojidetection2 = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu
			// Get Last Letter of Channel Name
			// let lastLetter = newUserChannel.name.substr(-2); // Dont Know Why 2.. maybe some blank or newline char
			// ^^^^^Can Probably Remove as Emoji isnt Very Important...

			// Clone Current Voice Channel as a Temporary Channel
			const clonedChannel = await newUserChannel.clone({
				name: `${newVoiceState.member!.displayName}`,
				reason: 'Dynamic Channel Created',
			});

			// Set Members Voice Channel to New Temp Channel
			await newVoiceState.setChannel(clonedChannel, 'Moving to Temp Channel');

			discordBot.logger.logS(
				`Created Temporary Channel: ${clonedChannel.name}(${clonedChannel.id})\nUser:${
					newVoiceState.member!.id
				}`,
				LogFilter.Debug,
			);
			// Add Clone to Current Temp Channel List
			await discordBot.databaseClient.query(
				`INSERT IGNORE INTO G_Temp_Channels VALUES (${clonedChannel.guild.id}, ${clonedChannel.id})`,
			);

			// Wait 10 Seconds. Allow for Latency as If User Doesnt Successfully Join Channel VoiceState Doesnt Trigger
			setTimeout(async () => {
				await attemptDeleteChannel(clonedChannel);
			}, 10000);
		}
	}

	// If User Has Left a Voice Channel
	if (previousVoiceState) {
		await attemptDeleteChannel(previousVoiceState.channel);
	}
});

discordBot.on('messageReactionAdd', async (reaction, user) => {
	
	await discordBot.ReactionRoleHandler.OnReactionAdd(reaction, user);
});

discordBot.on('messageReactionRemove', async (reaction, user) => {

	await discordBot.ReactionRoleHandler.OnReactionRemove(reaction, user)
	
});

discordBot.on('ready', async () => {
	if (!discordBot.user) return;
	await discordBot.user.setActivity(`BOOT SEQUENCE INITIALIZATION`, { type: 'CUSTOM_STATUS' });
	discordBot.logger.logS(`${discordBot.user.username} is online!`);

	await discordBot.PrimeDatabase();
	await discordBot.CacheAndCleanUp();
	// Cache All Messages That Have Reaction Roles Linked to Them
	discordBot.LoadCommands();
	
	if (!discordBot.settings.debug) {
		discordBot.RandomPresence(); // Cycles Through Set Presences (in 'discordBot.activites')
		discordBot.scoreBook.start(); // Starts The Automated Score Book Process
	} else {
		discordBot.logger.logS('DEBUG MODE ENABLED');
	}

	await discordBot.user.setActivity(`READY`, { type: 'CUSTOM_STATUS' });
	discordBot.logger.logS(`COMPLETED ALL BOOT SEQUENCES`);
});

discordBot.login(
	!discordBot.settings.debug ? discordBot.settings.tokens.production : discordBot.settings.tokens.debugging,
);
