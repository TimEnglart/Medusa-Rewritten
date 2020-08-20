import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message } from "discord.js";
import { CommandError } from "../ext/errorParser";
import { Utility } from "../ext/utility";


export default class GiveMedalsCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'giveme';
		this.description = 'Gives In Game Acquired Medals for Guild Progression';
		this.environments = ['text'];
		this.expectedArguments = [];
		this.executorPermissionRequired = 'SEND_MESSAGES';
		this.requiredProperties = undefined;
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		const subject = Utility.LookupMember(message.guild, args.join(' ')) || message.member;
		
		const statusMessage = await message.channel.send(`Currently Checking Medals for ${subject.displayName}`);
		const awardedMedals = await this.client.MedalHandler.checkAllMedals(subject, true);
		await this.client.MedalHandler.UnlockMedals(subject.user, awardedMedals);
		await statusMessage.edit(
			awardedMedals.length
				? `Successfully Added Medals for ${subject.displayName}:\n- ${awardedMedals.map((x) => x.name).join('\n- ')}`
				: `No New Medals Awarded for ${subject.displayName}`,
		);
	}
}