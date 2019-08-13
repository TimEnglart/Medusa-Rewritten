import { CommandFile, CommandHelp, CommandRun, discord, Embeds, ExtendedClient, Utility } from '../ext/index';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			let selectUser: discord.GuildMember | null = null;
			if (args[0]) {
				selectUser = Utility.LookupMember(message, args[0]);
				if (!selectUser) {
					selectUser = Utility.LookupMember(message, Utility.quotedWords(args.join(' ')).join(' '));
				}
			}
			if (!selectUser) {
				await message.channel.send(
					Embeds.errorEmbed(
						'Error Locating User',
						`I was unable to find the user ${args[0]} in the Server`
					)
				);
				return resolve();
			}

			if (!message.member) return reject(new Error('No Member Object'));

			const inviteEmbed = new discord.MessageEmbed()
				.setColor('#00dde0')
				.setAuthor(
					`${message.member.displayName} Invited you to join their Voice Channel!`,
					message.member.user.displayAvatarURL()
				)
				.setDescription(
					`React below to accept the invitation, invite will expire soon.`
				);

			const expiredEmbed = new discord.MessageEmbed()
				.setColor('#ba0526')
				.setAuthor(
					`${message.member.displayName}'s Invite Expired. You Are Still Able to Join The Voice Channel`,
					message.member.user.displayAvatarURL()
				)
				.setDescription(`${selectUser.displayName} did not respond in time.`);

			if (message.member.voice.channel) {
				if (message.member.voice.channel.userLimit > 0) {
					await message.member.voice.channel.setUserLimit(message.member.voice.channel.userLimit ? message.member.voice.channel.userLimit + 1 : 0);
					await message.member.voice.channel.updateOverwrite(selectUser, {
						CONNECT: true
					}, `${selectUser.displayName} was invited to the Voice Channel by ${message.member.displayName}`);
				}
			}
			const inviteMessage = await message.channel.send(inviteEmbed) as discord.Message;
			await inviteMessage.react(`✅`);

			const filter = (reaction: discord.MessageReaction, user: discord.User) =>
				reaction.emoji.name === `✅` && user.id === selectUser!.id;
			const collectedReactions = await inviteMessage.awaitReactions(filter, {
				max: 1,
				time: 15000
			});
			if (collectedReactions.size > 0) {
				if (selectUser.voice.channel) await selectUser.voice.setChannel(message.member.voice.channel);
				else {
					const errorMessage = await message.channel.send(expiredEmbed) as discord.Message;
					await errorMessage.delete({
						timeout: 40000
					});
				}
			} else if (!message.member.voice.channelID) {
				await message.channel.send(
					Embeds.errorEmbed(
						`${message.member.displayName}`,
						`Join a Voice Channel you wish to invite a Guardian to.`
					)
				);
			}
			await inviteMessage.delete();
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	environments: ['text'],
	expectedArgs: [{ name: 'User Resolvable', optional: false, example: '@User#12345' }],
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
	name: 'invite',
	description: 'To invite a user to your voice channel and move them in if they accept.',
	example: 'invite <@User#12345>',
};

module.exports = {
	help,
	run
} as CommandFile;