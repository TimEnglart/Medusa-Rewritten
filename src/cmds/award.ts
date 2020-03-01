import ExtendedClientCommand, { ICommandResult } from "@extensions/CommandTemplate";
import CommandHandler from "@extensions/CommandHandler";
import { Message, GuildMember, MessageReaction, User } from "discord.js";
import { CommandError } from "@extensions/errorParser";
import { Utility } from "@extensions/utility";
import RichEmbedGenerator from "@extensions/RichEmbeds";
import { MedalData } from "@extensions/experienceHandler";

export default class AwardCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'award';
		this.description =
            'Award selected user a given medal.\nUse ``?medals`` to see Medals.';
		this.environments = ['text'];
		this.expectedArguments = [
			{ name: 'User Resolvable', optional: false, example: '@User#12345' },
			{ name: 'Medal Resolvable', optional: false, example: 'pointbreaker' },
		];
		this.permissionRequired = 'MANAGE_ROLES';
		this.requiredProperties = {
			Message: {
				author: undefined,
				member: undefined,
				guild: undefined,
			},
			ExtendedClient: {
				user: undefined,
				me: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !message.member || !message.guild || !this.client.user || !message.guild.me)
			throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		if (args.length === 0) throw new CommandError('NO_ARGUMENTS');
		const [userResolvable, medalName] = Utility.quotedWords(args.join(' '));
		const user: GuildMember | null = Utility.LookupMember(message.guild, userResolvable);
		if (!user) throw new CommandError('NO_USER_FOUND');
		let myMedal: MedalData | undefined = this.client.settings.lighthouse.medals.find(
			(medal) => medal.name.toLowerCase() === medalName.toLowerCase(),
		);
		if (!myMedal) {
			const matchMedal = this.client.MedalHandler.FindMostRelatedMedal(medalName.toLowerCase());
			if (matchMedal.correctness > 30) {
				const correctionMessage = await message.channel.send(`Did You Mean ${matchMedal.name}?`);
				await correctionMessage.react(`✅`);
				const filter = (reaction: MessageReaction, reactionUser: User): boolean =>
					reaction.emoji.name === `✅` && reactionUser.id === message.author.id;
				const collectedReactions = await correctionMessage.awaitReactions(filter, {
					max: 1,
					time: 40000,
				});
				await correctionMessage.delete();
				if (collectedReactions.size > 0) {
					myMedal = this.client.settings.lighthouse.medals.find((medal) => medal.name === matchMedal.name);
				}
			}
		}
		if (!myMedal) throw new CommandError('NO_MEDAL_FOUND', `Was Unable to Find Medal Matching: ${medalName}.`);
		await this.client.MedalHandler.UnlockMedals(user.id, [myMedal])
		await message.channel.send(
			RichEmbedGenerator.successEmbed(`Successfully Awarded ${myMedal.name}`, `To User ${user.displayName}`),
		);
	}
}