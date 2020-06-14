import { Message } from 'discord.js';
import { Collection } from 'mongodb';
import { IDisabledCommandsResponse } from './DatabaseInterfaces';
import ExtendedClient from './ExtendedClient';
import ExtendedClientCommand, { ICommandResult } from './CommandTemplate';
import { CommandError } from './errorParser';

interface IDisabledCommand {
	[commandName: string]: string; // reason
}

export default class CommandHandler {
	public readonly Commands: Map<string, ExtendedClientCommand>;
	public readonly DisabledCommands: IDisabledCommand;
	constructor(public readonly client: ExtendedClient) {
		this.Commands = new Map();
		this.DisabledCommands = {};
		Object.assign(this.DisabledCommands, this.client.settings.disabledCommands); // Apply Fixed Disabled Commands
		
	}
	public AddCommand(command: /*ExtendedClientCommand |*/ typeof ExtendedClientCommand): void {
		/*if (!(command instanceof ExtendedClientCommand))*/ 
		const constructedCommand = new command(this); // is not Instanced
		if (constructedCommand.name) this.Commands.set(constructedCommand.name.toLowerCase(), constructedCommand);
	}
	public RemoveCommand(command: ExtendedClientCommand | string): void {
		if (typeof command === 'string') this.Commands.delete(command);
		else this.Commands.delete(command.name);
	}
	public async ExecuteCommand(commandName: string, message: Message, ...args: string[]): Promise<ICommandResult> {
		const command = this.Commands.get(commandName);
		if (!command)
			return {
				success: false,
				error: new CommandError('NO_COMMAND', `The Command: ${commandName} Doesn't Exist`),
			};
		if (this.DisabledCommands[commandName]) {
			return {
				success: false,
				error: new CommandError(
					'COMMAND_DISABLED',
					`${this.DisabledCommands[commandName]}`,
				),
			};
		}
		return command.Execute(message, ...args);
	}
	public async DisableCommand(commandName: string, reason: string): Promise<void> {
		this.DisabledCommands[commandName] = reason; // Override Reason if there is One
		const disabledCommands = await this.getDisabledCommandCollection();
		await disabledCommands.updateOne(
			{
				commandName: commandName,
			},
			{
				$set: {
					commandName: commandName,
					reason: reason
				}
			},
		);
	}
	public async EnableCommand(commandName: string): Promise<void> {
		if (!this.DisabledCommands[commandName]) return;
		delete this.DisabledCommands[commandName];

		const disabledCommands = await this.getDisabledCommandCollection();
		await disabledCommands.deleteOne(
			{
				commandName: commandName,
			}
		);
	}
	public async GetRemoteDisabledCommands(): Promise<void> {
		const disabledCommands = await this.getDisabledCommandCollection();
		for await (const disabledCommand of disabledCommands.find<any>()) {
			this.DisabledCommands[disabledCommand.commandName] = disabledCommand.reason;
		}
	}

	private async getDisabledCommandCollection(): Promise<Collection<any>> {
		return await this.client.nextDBClient.getCollection('disabledCommands');
	}

}

