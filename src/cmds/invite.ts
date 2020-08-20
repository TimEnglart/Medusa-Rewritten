import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, GuildMember, MessageEmbed, MessageReaction, User } from "discord.js";
import { CommandError } from "../ext/errorParser";
import { Utility } from "../ext/utility";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class InviteCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'invite';
		this.description = 'To invite a user to your voice channel and move them in if they accept.';
		this.environments = ['text'];
		this.expectedArguments = [{ name: 'User Resolvable', optional: false, example: '@User#12345' }];
		this.executorPermissionRequired = 'SUPER_USER';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
			},
		};
		this.hidden = true;
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed

		let selectUser: GuildMember | null = null;
		if (args[0]) {
			selectUser = Utility.LookupMember(message.guild, args[0]);
			if (!selectUser) {
				selectUser = Utility.LookupMember(message.guild, Utility.quotedWords(args.join(' ')).join(' '));
			}
		}
		if (!selectUser)
			throw new CommandError('NO_USER_FOUND', `I was unable to find the user ${args[0]} in the Server`);

		const inviteEmbed = new MessageEmbed()
			.setColor('#00dde0')
			.setAuthor(
				`${message.member.displayName} Invited you to join their Voice Channel!`,
				message.member.user.displayAvatarURL(),
			)
			.setDescription(`React below to accept the invitation, invite will expire soon.`);

		const expiredEmbed = new MessageEmbed()
			.setColor('#ba0526')
			.setAuthor(
				`${message.member.displayName}'s Invite Expired. You Are Still Able to Join The Voice Channel`,
				message.member.user.displayAvatarURL(),
			)
			.setDescription(`${selectUser.displayName} did not respond in time.`);

		if (message.member.voice.channel) {
			if (message.member.voice.channel.userLimit > 0) {
				await message.member.voice.channel.setUserLimit(
					message.member.voice.channel.userLimit ? message.member.voice.channel.userLimit + 1 : 0,
				);
				await message.member.voice.channel.updateOverwrite(
					selectUser,
					{
						CONNECT: true,
					},
					`${selectUser.displayName} was invited to the Voice Channel by ${message.member.displayName}`,
				);
			}
		}
		const inviteMessage = await message.channel.send(inviteEmbed);
		await inviteMessage.react(`✅`);

		const filter = (reaction: MessageReaction, user: User): boolean =>
			reaction.emoji.name === `✅` && user.id === selectUser?.id;
		const collectedReactions = await inviteMessage.awaitReactions(filter, {
			max: 1,
			time: 15000,
		});
		if (collectedReactions.size > 0) {
			if (selectUser.voice.channel) await selectUser.voice.setChannel(message.member.voice.channel);
			else {
				const errorMessage = await message.channel.send(expiredEmbed);
				await errorMessage.delete({
					timeout: 40000,
				});
			}
		} else if (!message.member.voice.channelID) {
			await message.channel.send(
				RichEmbedGenerator.errorEmbed(
					`${message.member.displayName}`,
					`Join a Voice Channel you wish to invite a Guardian to.`,
				),
			);
		}
		await inviteMessage.delete();
	}
}