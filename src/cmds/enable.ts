import ExtendedClientCommand, { ICommandResult } from "@extensions/CommandTemplate";
import { Message } from "discord.js";
import CommandHandler from "@extensions/CommandHandler";
import RichEmbedGenerator from "@extensions/RichEmbeds";

export default class EnableCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'enable';
		this.description = 'Enable A Disabled Bot Command';
		this.environments = ['dm', 'text'];
		this.expectedArguments = [
			{ name: 'Command Name', example: 'enable', optional: false }
		];
		this.permissionRequired = 'SUPER_USER';
		this.requiredProperties = undefined;
		this.hidden = true;
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		const commandToEnable = args[0];
		this.CommandHandler.EnableCommand(commandToEnable);
		await message.channel.send(RichEmbedGenerator.successEmbed(`Successfully Enabled Command`, `The Command: ${commandToEnable} has Successfully Been Enabled`));
	}
}