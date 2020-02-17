import { CommandError, CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Utility } from '../ext/';



const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: CommandError) => void) => {
		try {
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			if (args.length === 0) throw new CommandError('NO_ARGUMENTS');
			const emojiInfo = Utility.parseEmojiMentionToObject(args[1]);
			if (!emojiInfo) throw new CommandError('FAILED_EMOJI_PARSE');
			const roleId = Utility.parseRoleMentionToId(args.slice(2).join(' '));
			if (!roleId) throw new CommandError('FAILED_ROLE_PARSE');
			const role = message.guild.roles.get(roleId);
			if (!role) throw new CommandError('NO_ROLE_FOUND');
			if ((role.position >= message.member.roles.highest.position || role.position >= message.guild.me!.roles.highest.position) && !message.guild.me!.hasPermission('ADMINISTRATOR')) throw new CommandError('INSUFFICIENT_PRIVILEGES');
			const statusMessage = await message.channel.send('Attempting To Find Message....');
			const textChannels = message.guild.channels.filter(guildChannel => guildChannel.type === 'text') as discord.Collection<string, discord.TextChannel>;
			let foundMessageChannel: discord.TextChannel | undefined;
			let foundMessage: discord.Message | undefined;
			for (const [channelId, channel] of textChannels) {
				try {
					const messageLookup = await channel.messages.fetch(args[0]);
					if (messageLookup) {
						foundMessage = messageLookup;
						foundMessageChannel = channel;
						break;
					}
				}
				catch (e) {
					continue;
					// message was not found in channel
				}
			}
			if (foundMessageChannel && foundMessage) {
				const databaseResponse = await discordBot.databaseClient.query(`SELECT * FROM G_Reaction_Roles WHERE guild_id = ${message.guild.id} AND message_id = ${foundMessage.id} AND channel_id = ${foundMessageChannel.id} AND role_id = ${role.id}`);
				if (!databaseResponse.length) {
					await discordBot.databaseClient.query(`INSERT INTO G_Reaction_Roles(guild_id, message_id, channel_id, role_id, reaction_name, reaction_id, reaction_animated) VALUES(${message.guild.id}, ${foundMessage.id}, ${foundMessageChannel.id}, ${role.id}, '${emojiInfo.name}', ${emojiInfo.id}, ${emojiInfo.animated})`);
					await foundMessage.react(emojiInfo.id || emojiInfo.name);
					// Update Response Message
					await statusMessage.edit('Done'/*, Place embed Here*/);
				}
				else {
					// Already in db
					await statusMessage.edit('Already Linked'/*, Place embed Here*/);
				}
			}
			else {
				await statusMessage.edit('Cant Locate Message'/*, Place embed Here*/);
				// Failed to Find Message
			}
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	name: 'addreact',
	description: 'Adds a selfassignable role via user reaction.',
	example: 'addreact <Message ID> 👍 @role',
	permissionRequired: 'ADMINISTRATOR', // Change nulls to 'SEND_MESSAGES'
	environments: ['text'],
	expectedArgs: [{ name: 'Message Id', optional: false, example: '31267345614' }, { name: 'Emoji', optional: false, example: ':smile:' }, { name: 'Role Resolvable', optional: false, example: '@Role' }]
};

module.exports = {
	help,
	run
} as CommandFile;

function determineRole(message: discord.Message, args: string[]) {
	// See if it is Raw Name of Role
	if (args.length > help.expectedArgs.length) { // its a raw name
		const lookupRole = message.guild!.roles.find(role => role.name.toLowerCase() === args.slice(2).join(' '));
		if (!lookupRole && isNaN(Number(args[2]))) {
			return args[2];
		} else {
			return lookupRole!.id;
		}
	}
	else {
		return Utility.parseRoleMentionToId(args[2]);
	}
}