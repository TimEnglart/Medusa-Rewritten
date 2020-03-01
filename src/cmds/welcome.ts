import ExtendedClientCommand, { ICommandResult } from "@extensions/CommandTemplate";
import CommandHandler from "@extensions/CommandHandler";
import { Message } from "discord.js";
import { CommandError } from "@extensions/errorParser";

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted

export default class PrintWelcomeMessage extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'welcome';
		this.description = 'Prints Welcome Messages to Welcome Channel [Hard Coded]';
		this.environments = ['text'];
		this.expectedArguments = [{ name: 'Text Channel Resolvable', optional: true, example: '4126456125411' }];
		this.permissionRequired = 'ADMINISTRATOR';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
				me: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed

		// Do Shit
	}
}