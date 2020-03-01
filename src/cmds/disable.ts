import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import { Message } from "discord.js";
import CommandHandler from "../ext/CommandHandler";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class DisableCommand extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'disable';
		this.description = 'Disable A Bot Command';
		this.environments = ['dm', 'text'];
		this.expectedArguments = [
			{ name: 'Command Name', example: 'disable', optional: false },
			{ name: 'Reason', example: 'Error Occurring When Used', optional: true },
		];
		this.permissionRequired = 'SUPER_USER';
		this.requiredProperties = undefined;
		this.hidden = true;
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		const commandToDisable = args[0];
		const reason = args.length > 1 ? args.slice(1).join(' ') : 'NO_REASON_PROVIDED';
		await this.CommandHandler.DisableCommand(commandToDisable, reason);
		await message.channel.send(RichEmbedGenerator.successEmbed(`Successfully Disabled Command`, `The Command: ${commandToDisable} has Successfully Been Disabled\n\nReason: ${reason}`));
	}
}