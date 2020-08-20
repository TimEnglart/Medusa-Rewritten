import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import { Message } from "discord.js";
import CommandHandler from "../ext/CommandHandler";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class EnableCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'enable';
		this.description = 'Enable A Disabled Bot Command';
		this.environments = ['dm', 'text'];
		this.expectedArguments = [
			{ name: 'Command Name', example: 'enable', optional: false }
		];
		this.executorPermissionRequired = 'SUPER_USER';
		this.requiredProperties = undefined;
		this.hidden = true;
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		const commandToEnable = args.shift();
		if(!commandToEnable) {
			await message.channel.send(RichEmbedGenerator.helpEmbed(this));
			return;
		}
		this.CommandHandler.EnableCommand(commandToEnable);
		await message.channel.send(RichEmbedGenerator.successEmbed(`Successfully Enabled Command`, `The Command: ${commandToEnable} has Successfully Been Enabled`));
	}
}