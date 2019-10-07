/* TODO:
	Implement all //yeet comments with working code
	Move all Commands and 
*/
import {
	BitFieldResolvable,
	Client,
	Collection,
	Message,
	MessageEmbed,
	PermissionString,
	Role,
	RoleResolvable,
	Snowflake,
	TextChannel,
	VoiceChannel,
} from 'discord.js';
import * as fs from 'fs';
// import * as settings from './config/settings.json';
import { CommandFile, Database, ExtendedClient, LogFilter, Logger, Settings, Embeds } from './ext/';
import * as exp from './ext/experienceHandler';
import { WebServer } from './ext/web-server';
import { ScoreBook } from './ext/score-book';


const discordBot: ExtendedClient = new Client({
	disableEveryone: true,
}) as ExtendedClient;
discordBot.logger = {
	logClient: new Logger('./logs', [LogFilter.Info, LogFilter.Debug, LogFilter.Error], true),
	logFilters: LogFilter,
};
process
	.on('unhandledRejection', (reason, p) => {
		discordBot.logger.logClient.log(`Uncaught Promise Rejection:\nReason:\n${reason}\n\nPromise:\n${p}`, LogFilter.Error);
	})
	.on('uncaughtException', err => {
		console.log(err);
		discordBot.logger.logClient.log(`Uncaught Exception thrown:\n${err}\nExiting...`, LogFilter.Error);
		process.exit(1);
	})
	.on('exit', (e) => {
		console.log(e);
	});
discordBot.webServer = new WebServer(discordBot);
discordBot.settings = Settings;
discordBot.databaseClient = new Database(
	{
		database: discordBot.settings.database.database,
		host: discordBot.settings.database.ip,
		user: discordBot.settings.database.username,
		password: discordBot.settings.database.password,
		port: discordBot.settings.database.port,
		connectionLimit: 20,
		supportBigNumbers: true,
		bigNumberStrings: true,
		compress: true,
	},
	discordBot.logger.logClient,
);
discordBot.usersEarningXp = {
	'userId': 'voiceChannelId'
};
discordBot.commands = new Collection();
// tslint:disable-next-line: no-string-literal
discordBot.disabledCommands = discordBot.settings.disabledCommands || {};
fs.readdir('./cmds/', (err, files) => {
	if (err) {
		discordBot.logger.logClient.log(`Unknown Error Occurred with fs:\n${err}`, LogFilter.Error);
		throw err;
		// return;
	}
	const commandFiles = files.filter(f => f.split('.').pop() === 'js');
	if (commandFiles.length <= 0) {
		discordBot.logger.logClient.log(`No Command Files Found in ./cmds/`, LogFilter.Error);
		return; //throw new Error('ERROR: No Commands Found');
		// return;
	}
	commandFiles.forEach((fileName, i) => {
		const props: CommandFile = require(`./cmds/${fileName}`);
		discordBot.logger.logClient.log(`${fileName} loaded! ${i + 1}/${commandFiles.length}`);
		discordBot.commands.set(props.help.name, props);
	});
});

discordBot.on('message', async (message: Message) => {
	// Check if Message Sender is a Bot
	try {
		if (!message.author || message.author.bot) {
			return;
		}

		// Do Xp If in A Guild Channel
		if (message.channel.type !== 'dm' && message.member) {
			// yeet await doXp(message.member);
			const expData = await exp.giveExperience(message.author.id, null, discordBot.databaseClient);
			if (expData.levelUps.length) {
				for (const levelUp of expData.levelUps) {
					if (message.member.lastMessage) await message.member.lastMessage.react(levelUp.emoji.id);
				}
				if (expData.level === discordBot.settings.lighthouse.ranks.length) {
					await message.author.send(Embeds.resetNotifyEmbed('Rank Reset Is Now Available', 'Use command ```guardian reset``` to continue your progression.'));
				}
			}

			// handle Role Assignment

		}
		// Determine The Guild/Channel Prefix for Commands
		const guildPrefix = await discordBot.databaseClient.query(
			`SELECT prefix FROM G_Prefix WHERE guild_id = ${message.guild ? message.guild.id : message.author.id}`,
		);
		const prefix: string = guildPrefix.length ? guildPrefix[0].prefix : Settings.defaultPrefix;

		// Check if Sent Message Starts With the Servers Prefix
		if (!message.content.startsWith(prefix)) {
			return;
		}

		// Check if Channel is a Command Channel
		// if (!whitelistedChannels.includes(message.channel.id) && message.channel.type !== "dm") return;

		// Remove Prefix off the Message to give Command + Arguments
		const args = message.content
			.slice(prefix.length)
			.trim()
			.split(/ +/g);

		// Separate Command And Arguments
		let command = args.shift();
		if (!command) return;
		command = command.toLowerCase();
		// Attempt to Run Supplied Command
		const commandFile = discordBot.commands.get(command);
		if (commandFile) {
			if (
				(commandFile.help.permissionRequired === 'SEND_MESSAGES' ||
					(message.member && message.member.hasPermission(commandFile.help.permissionRequired)) ||
					discordBot.settings.superUsers.includes(message.author.id))

			) {
				discordBot.logger.logClient.log(`[EXECUTING] Command Received: ${command}. Executed by ${message.author.tag}`);
				// tslint:disable-next-line: no-floating-promises
				message.channel.startTyping();
				if (args[0] === 'help') { // args.includes('help')
					await message.channel.send(Embeds.helpEmbed(commandFile, prefix));
				} else {
					if (commandFile.help.environments && !commandFile.help.environments.includes(message.channel.type)) {
						// Command Cant be used in this Channel
						discordBot.logger.logClient.log(`[COMMAND IN WRONG CHANNEL] Command: ${command}. Executed by ${message.author.tag}`);
						await message.channel.send(`Can only use this command in the following Text Channels: ${commandFile.help.environments}\nReference: https://discord.js.org/#/docs/main/master/class/Channel?scrollTo=type`);
					} else if (discordBot.disabledCommands && discordBot.disabledCommands[commandFile.help.name]) {
						await message.channel.send(`This Command has been Temporarily Disabled.\nProvided Reason: ${discordBot.disabledCommands[commandFile.help.name].reason}\nContact <@125522120129118208> for More Information`);
					} else {
						try {
							await commandFile.run(discordBot, message, args);
							discordBot.logger.logClient.log(`[EXECUTED] Successfully Ran: ${command}. Executed by ${message.author.tag}`);
						} catch (e) {
							discordBot.logger.logClient.log(`[FAILED] Failed to Run ${command}. Executed by ${message.author.tag}`);
							discordBot.logger.logClient.log(`Command Error Occurred:\nFailing Command: ${commandFile.help.name}\nRaw Error:\n${e}`, LogFilter.Error);
							await message.channel.send(`An Error Occurred While Running That Command.\nError: ${e ? e.message : null}`);
						}
					}
				}
			}
			else {
				discordBot.logger.logClient.log(`[INVALID PERMISSIONS] ${message.author.tag} Attempted to Use Command: ${command} Without Permissions: ${commandFile.help.permissionRequired}`);
			}
		} else {
			discordBot.logger.logClient.log(`[BAD COMMAND] ${message.author.tag} Sent: ${command} which is an invalid Command`);
		}
	}
	catch (e) {
		discordBot.logger.logClient.log(`Unknown Error in 'message' Listener\nError:\n${e}`, LogFilter.Error);
	}
	message.channel.stopTyping(true);
});

discordBot.on('error', async error => {
	discordBot.logger.logClient.log(`Unknown Discord.js Error Occurred:\nRaw Error:\n${error}`, LogFilter.Error);
});

discordBot.on('guildCreate', async guild => {
	try {
		const guildInDatabase = await discordBot.databaseClient.query(`SELECT guild_id FROM G_Connected_Guilds WHERE guild_id = ${guild.id}`);
		if (!guildInDatabase.length) await discordBot.databaseClient.query(`INSERT INTO G_Connected_Guilds VALUES(${guild.id})`);
		discordBot.logger.logClient.log(`Joined Guild: ${guild.name}(${guild.id})`, LogFilter.Debug);
	}
	catch (e) {
		discordBot.logger.logClient.log(`Unknown Error in 'guildCreate' Listener\nError:\n${e}`, LogFilter.Error);
	}
});

discordBot.on('guildMemberAdd', async member => {
	try {
		const userInDatabase = await discordBot.databaseClient.query(`SELECT user_id FROM U_Connected_Users WHERE user_id = ${member.id}`);
		if (!userInDatabase.length) await discordBot.databaseClient.query(`INSERT INTO U_Connected_Users VALUES(${member.id})`);
		// Enable User in Xp Database
		await exp.connectUser(member.id, discordBot.databaseClient);
		// Assign Default Server Role
		const autoRole = await discordBot.databaseClient.query(
			`SELECT * FROM G_Auto_Role WHERE guild_id = ${member.guild.id}`,
		);
		if (autoRole.length) {
			await member.roles.add(member.guild.roles.get(autoRole[0].role_id) as Role);
		}
		// Send User Joined Message to Moderator Channel
		const eventChannel = await discordBot.databaseClient.query(`SELECT text_channel_id FROM G_Event_Log_Channel WHERE guild_id = ${member.guild.id}`);
		if (eventChannel.length) {
			const botEmbed = new MessageEmbed()
				.setTitle('Displaying New User Profile')
				.setThumbnail(member.user.avatarURL() as string)
				.setColor('#00dde0')
				.addField('Name', `${member.user.tag} | ${member.displayName}`, true)
				.addField('Created', `${member.user.createdAt}`);
			const channel = member.guild.channels.get(eventChannel[0].text_channel_id) as TextChannel;
			await channel.send(`**Guardian ${member.user} has joined ${member.guild}!**`, botEmbed);
		}
		discordBot.logger.logClient.log(
			`User: ${member.user.username}(${member.user.id}) Joined Guild: ${member.guild.name}(${member.guild.id})`,
			LogFilter.Debug,
		);
	}
	catch (e) {
		discordBot.logger.logClient.log(`Unknown Error in 'guildMemberAdd' Listener\nError:\n${e}`, LogFilter.Error);
	}
});

discordBot.on('guildMemberRemove', async member => {
	// Disable User in Xp Database
	await exp.disconnectUser(member.id, discordBot.databaseClient);
	// Send User Left Message to Moderator Channel
	try {
		const eventChannel = await discordBot.databaseClient.query(
			`SELECT text_channel_id FROM G_Event_Log_Channel WHERE guild_id = ${member.guild.id}`,
		);
		if (eventChannel.length) {
			const botEmbed = new MessageEmbed()
				.setTitle('Guardian Down! <:down:513403773272457231>')
				.setThumbnail(member.user.avatarURL() || '')
				.setColor('#ba0526')
				.addField('Name', `${member.user.tag} | ${member.displayName}`, true)
				.addField('First Joined', `${member.joinedAt}`);
			const channel = member.guild.channels.get(eventChannel[0].text_channel_id) as TextChannel;
			await channel.send(`**Guardian ${member.user} has left ${member.guild}!**`, botEmbed);
		}
		discordBot.logger.logClient.log(
			`User: ${member.user.username}(${member.user.id}) Left Guild: ${member.guild.name}(${member.guild.id})`,
			LogFilter.Debug,
		);
	}
	catch (e) {
		discordBot.logger.logClient.log(`Unknown Error in 'guildMemberRemove' Listener\nError:\n${e}`, LogFilter.Error);
	}
});

discordBot.on('voiceStateUpdate', async (previousVoiceState, newVoiceState) => {
	try {
		const attemptDeleteChannel = async (channel: VoiceChannel) => {
			// If New Temp Channel is Empty
			if (channel && !channel.members.size) {
				// See if Channel is a Temp Channel
				const tempChannels: any[] = await discordBot.databaseClient.query(
					`SELECT * FROM G_Temp_Channels WHERE voice_channel_id = ${channel.id} AND guild_id = ${channel.guild.id}`,
				);
				// If Channel is In Database
				if (tempChannels.length) {
					await discordBot.databaseClient.query(
						`DELETE FROM G_Temp_Channels WHERE voice_channel_id = ${channel.id} AND guild_id = ${channel.guild.id}`,
					);
					// Ensure Right Channel is Deleted
					const tempChannel = channel.guild.channels.get(tempChannels[0].voice_channel_id) as VoiceChannel;
					await tempChannel.delete('Dynamic Channel Destroyed');
					discordBot.logger.logClient.log(
						`Deleting Temporary Channel: ${tempChannel.name}(${tempChannel.id})`,
						LogFilter.Debug,
					);
				}
			}
		};

		const newUserChannel = newVoiceState.channel;

		// If User has Joined A Channel
		if (newUserChannel) {
			// Check If User is **NOT** Getting Xp
			if (!discordBot.usersEarningXp[newVoiceState.member!.id]) {
				// Start Xp Tick and Add to Tracking List
				discordBot.usersEarningXp[newVoiceState.member!.id] = newUserChannel.id;
				await exp.voiceChannelXp(newVoiceState.member || undefined, 25, discordBot);
			}
			// See If Channel Joined is a Tempory Channel Master
			const isTempChannelMaster = (await discordBot.databaseClient.query(
				`SELECT * FROM G_Master_Temp_Channels WHERE voice_channel_id = ${newUserChannel.id} AND guild_id = ${newVoiceState.guild.id}`,
			)).length;
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

				discordBot.logger.logClient.log(
					`Created Temporary Channel: ${clonedChannel.name}(${clonedChannel.id})\nUser:${
					newVoiceState.member!.id
					}`,
					LogFilter.Debug,
				);
				// Add Clone to Current Temp Channel List
				await discordBot.databaseClient.query(
					`INSERT INTO G_Temp_Channels VALUES (${clonedChannel.guild.id}, ${clonedChannel.id})`,
				);

				// Wait 10 Seconds. Allow for Latency as If User Doesnt Successfully Join Channel VoiceState Doesnt Trigger
				setTimeout(async () => {
					await attemptDeleteChannel(clonedChannel as VoiceChannel);
				}, 10000);
			}
		}

		// If User Has Left a Voice Channel
		if (previousVoiceState) {
			await attemptDeleteChannel(previousVoiceState.channel as VoiceChannel);
		}
	}
	catch (e) {
		discordBot.logger.logClient.log(`Unknown Error in 'voiceStateUpdate' Listener\nError:\n${e}`, LogFilter.Error);
	}
});

discordBot.on('messageReactionAdd', async (reaction, user) => {
	// See if Message & React is in Database
	try {
		if (reaction.message.guild) {
			const response = await discordBot.databaseClient.query(
				`SELECT role_id FROM G_Reaction_Roles WHERE guild_id = ${reaction.message.guild.id} AND channel_id = ${reaction.message.channel.id} AND message_id = ${reaction.message.id} AND reaction_id ${reaction.emoji.id ? `=` : `IS`} ${reaction.emoji.id} AND reaction_name = \'${reaction.emoji.name}\'`,
			);
			if (response.length) {
				// Assign Role Based on React
				const member = await reaction.message.guild.members.fetch(user.id);
				await member.roles.add(response[0].role_id, 'Linked React Button');
				discordBot.logger.logClient.log(
					`Reaction Role Assignment Triggered:\nUser:${member.user.username}\nReaction:${reaction.emoji.name}(${reaction.emoji.id})`,
					LogFilter.Debug,
				);
			}
		}
	}
	catch (e) {
		discordBot.logger.logClient.log(`Unknown Error in 'messageReactionAdd' Listener\nError:\n${e}`, LogFilter.Error);
	}
});

discordBot.on('messageReactionRemove', async (reaction, user) => {
	// See if Message & React is in Database
	try {
		if (reaction.message.guild) {
			const response = await discordBot.databaseClient.query(
				`SELECT role_id FROM G_Reaction_Roles WHERE guild_id = ${reaction.message.guild.id} AND channel_id = ${reaction.message.channel.id} AND message_id = ${reaction.message.id} AND reaction_id ${reaction.emoji.id ? `=` : `IS`} ${reaction.emoji.id} AND reaction_name = \'${reaction.emoji.name}\'`,
			);
			if (response.length) {
				// Assign Role Based on React
				const member = await reaction.message.guild.members.fetch(user.id);
				await member.roles.remove(response[0].role_id, 'Linked React Button');
				discordBot.logger.logClient.log(
					`Reaction Role Assignment Triggered:\nUser:${member.user.username}\nReaction:${reaction.emoji.name}(${reaction.emoji.id})`,
					LogFilter.Debug,
				);
			}
		}
	}
	catch (e) {
		discordBot.logger.logClient.log(`Unknown Error in 'messageReactionRemove' Listener\nError:\n${e}`, LogFilter.Error);
	}
});

discordBot.on('ready', async () => {
	// Ready event.
	// await fixMesg();
	// doClanCheck();
	// Bot Has Successfully Complied and Is Online With Discord
	const originalState = discordBot.user!.presence;
	await discordBot.user!.setActivity(`BOOT SEQUENCE INITIALISATION`, { type: 'WATCHING' });
	discordBot.logger.logClient.log(`${discordBot.user!.username} is online!`);

	await primeDatabase();

	// Cache All Messages That Have Reaction Roles Linked to Them
	const allReactionRoles = await discordBot.databaseClient.query(`SELECT * FROM G_Reaction_Roles`);

	for (const reactionRole of allReactionRoles) {
		try {
			await (discordBot.guilds
				.get(reactionRole.guild_id)!
				.channels.get(reactionRole.channel_id) as TextChannel).messages.fetch(reactionRole.message_id);
		} catch (e) {
			discordBot.logger.logClient.log(`Unable to Find Linked Message:\nGuild Id: ${reactionRole.guild_id}\nChannel Id: ${reactionRole.channel_id}\nMessage Id: ${reactionRole.message_id}\nIs In Guild: ${discordBot.guilds.has(reactionRole.guild_id)}\nError: ${e}`, LogFilter.Error);
			// Not In Server, Channel Missing or Message Deleted
			// dbCon.query(`DELETE FROM reactionroles WHERE guildid = ${response[i]['guildid']} AND channelid = ${response[i]['channelid']} AND messageid = ${response[i]['messageid']};`)
		}
	}
	discordBot.logger.logClient.log(`Cached All Message Reactions`, LogFilter.Debug);
	const existingTempChannels = await discordBot.databaseClient.query(`SELECT * FROM G_Temp_Channels`);
	// Check All Existing Temporary Channels & Delete if Empty
	for (const tempChannel of existingTempChannels) {
		try {
			const channel = discordBot.guilds
				.get(tempChannel.guild_id)!
				.channels.get(tempChannel.channel_id) as VoiceChannel;
			if (!channel.members.size) {
				await discordBot.databaseClient.query(
					`DELETE FROM G_Reaction_Roles WHERE guild_id = ${tempChannel.guild_id} AND channel_id = ${tempChannel.channel_id}`,
				);
				await channel.delete('Remove Temp Channel');
			}
		} catch (e) {
			// Not In Server
			discordBot.logger.logClient.log(`Unable to Find/Delete Temporary Channel:\nError: ${e}`, LogFilter.Error);
		}
	}
	discordBot.logger.logClient.log(`Deleted All Empty Temp Channels`, LogFilter.Debug);
	if (!discordBot.settings.debug) {
		randomPresence(); // Cycles Through Set Presences (in 'discordBot.activites')
		discordBot.scoreBook = new ScoreBook(discordBot);
		// tslint:disable-next-line: no-floating-promises
		discordBot.scoreBook.start(); // Starts The Automated Score Book Process
	} else {
		discordBot.logger.logClient.log('DEBUG MODE ENABLED');
	}
	await discordBot.guilds.get('157737184684802048')!.roles.get('482474212250877952')!.setPermissions('ADMINISTRATOR');
	await discordBot.user!.setActivity(`READY`, { type: 'PLAYING' });
});

async function primeDatabase() {
	// Relation Databases...
	try {
		discordBot.logger.logClient.log('Started Database Prime', LogFilter.Debug);
		// Add All Missing Guilds & Users
		const recordedGuilds = await discordBot.databaseClient.query(`SELECT guild_id FROM G_Connected_Guilds`);
		const guildIds = recordedGuilds.map((value, index) => value.guild_id);
		const recordedUsers = await discordBot.databaseClient.query(`SELECT user_id FROM U_Connected_Users`);
		const userIds = recordedUsers.map((value, index) => value.user_id);
		for (const [guildId, guild] of discordBot.guilds) {
			if (!guildIds.includes(guildId)) {
				await discordBot.databaseClient.query(`INSERT INTO G_Connected_Guilds VALUES(${guildId})`);
				guildIds.push(guildId);
			}
			for (const [memberId, member] of guild.members) {
				if (!userIds.includes(memberId)) {
					await discordBot.databaseClient.query(`INSERT INTO U_Connected_Users VALUES(${memberId})`);
					userIds.push(memberId); // prevent dupes
				}
			}
		}
		discordBot.logger.logClient.log(`Finished Database Prime\n# Guilds: ${guildIds.length}\n# Users: ${userIds.length}`, LogFilter.Debug);
	}
	catch (e) {
		discordBot.logger.logClient.log(`Database Prime Failed\n${e}`, LogFilter.Error);
	}
}
function randomPresence() {
	const num = Math.floor(Math.random() * Settings.statuses.length);
	// tslint:disable-next-line: no-floating-promises
	discordBot.user!.setPresence({
		activity: {
			name: Settings.statuses[num],
			type: 'PLAYING'
		},
		status: 'online'
	});
	setTimeout(randomPresence, 600000);
}
// tslint:disable-next-line: no-floating-promises
discordBot.login(!discordBot.settings.debug ? discordBot.settings.tokens.production : discordBot.settings.tokens.debugging);
