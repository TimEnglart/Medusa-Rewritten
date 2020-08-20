import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, GuildMember, MessageReaction, User } from "discord.js";
import { CommandError } from "../ext/errorParser";
import { Utility } from "../ext/utility";
import RichEmbedGenerator from "../ext/RichEmbeds";
import { IMedalData } from '../ext/settingsInterfaces'

export default class RevokeMedalCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'revoke';
		this.description =
            'Award selected user a given medal.\nUse ``?medals`` to see available Medals.';
		this.environments = ['text'];
		this.expectedArguments = [
			{ name: 'User Resolvable', optional: false, example: '@User#12345' },
			{ name: 'Medal Resolvable', optional: false, example: 'pointbreaker' },
		];
		this.executorPermissionRequired = 'MANAGE_ROLES';
		this.clientPermissionsRequired = ['MANAGE_ROLES', 'SEND_MESSAGES'];
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		args = Utility.quotedWords(args.join(' '));
		const member: GuildMember | null = Utility.LookupMember(message.guild, args[0]);
		if (!member) throw new CommandError('NO_USER_FOUND');
		const possibleMedal = args.slice(1).join(' ');
		let myMedal: IMedalData | undefined = this.client.settings.lighthouse.medals.find(
			(medal) => medal.name.toLowerCase() === possibleMedal.toLowerCase(),
		);
		if (!myMedal) {
			const matchMedal = this.client.MedalHandler.FindMostRelatedMedal(possibleMedal.toLowerCase());
			if (matchMedal.correctness > 30) {
				const correctionMessage = await message.channel.send(`Did You Mean ${matchMedal.name}?`);
				await correctionMessage.react(`✅`);
				const filter = (reaction: MessageReaction, _user: User): boolean =>
					reaction.emoji.name === `✅` && _user.id === message.author.id;
				const collectedReactions = await correctionMessage.awaitReactions(filter, {
					max: 1,
					time: 40000,
				});
				await correctionMessage.delete();
				if (collectedReactions.size > 0) {
					myMedal = this.client.settings.lighthouse.medals.find((x) => x.name === (matchMedal.name));
				}
			}
		}
		if (!myMedal) throw new CommandError('NO_MEDAL_FOUND', `Was Unable to Find Medal Matching: ${possibleMedal}.`);
		await this.client.MedalHandler.LockMedals(member.user, [myMedal]);
		await message.channel.send(
			RichEmbedGenerator.successEmbed(`Successfully Revoked ${myMedal.name}`, `To User ${member.displayName}`),
		);
	}
}