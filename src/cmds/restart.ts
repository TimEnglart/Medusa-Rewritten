import ExtendedClientCommand, { ICommandResult } from "@extensions/CommandTemplate";
import CommandHandler from "@extensions/CommandHandler";
import { Message } from "discord.js";
import { CommandError } from "@extensions/errorParser";



export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'kill';
		this.description = 'Kills the Current Bot Session';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [{ name: 'Exit Code', optional: true, example: '1' }];
		this.permissionRequired = 'SUPER_USER';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
				me: undefined,
			},
		};
		this.hidden = true;
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		await message.channel.send('Restarting :)');
		process.exit(+args[0] || 0);
	}
}