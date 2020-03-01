import { Collection, Message } from 'discord.js';
import ExtendedClientCommand, { ICommandResult } from '@extensions/CommandTemplate';
import { CommandError } from '@extensions/errorParser';
import { IDisabledCommandsResponse } from './DatabaseInterfaces';
import ExtendedClient from './ExtendedClient';

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
	public AddCommand(command: ExtendedClientCommand | typeof ExtendedClientCommand): void {
		if (!(command instanceof ExtendedClientCommand)) command = new command(this); // is not Instanced
		if (command.name) this.Commands.set(command.name, command);
	}
	public RemoveCommand(command: ExtendedClientCommand | string): void {
		if (typeof command === 'string') this.Commands.delete(command);
		else this.Commands.delete(command.name);
	}
	public async ExecuteCommand(commandName: string, message: Message): Promise<ICommandResult> {
		const command = this.Commands.get(commandName);
		if (!command)
			return {
				success: false,
				error: new CommandError('NO_COMMAND'),
			};
		if (this.DisabledCommands[commandName]) {
			return {
				success: false,
				error: new CommandError(
					'COMMAND_DISABLED',
					`Command **${commandName}** is Disabled - Reason: ${this.DisabledCommands[commandName]}`,
				),
			};
		}
		return await command.Execute(message);
	}
	public async DisableCommand(commandName: string, reason: string): Promise<void> {
		this.DisabledCommands[commandName] = reason; // Override Reason if there is One
		await this.client.databaseClient.query(
			`INSERT IGNORE INTO G_Disabled_Commands (name, reason) VALUES ("${commandName}", "${reason}");`,
		);
	}
	public async EnableCommand(commandName: string): Promise<void> {
		if (!this.DisabledCommands[commandName]) return;
		delete this.DisabledCommands[commandName];
		await this.client.databaseClient.query(
			`DELETE IGNORE FROM G_Disabled_Commands WHERE name = "${commandName}");`,
		);
	}
	public async GetRemoteDisabledCommands(): Promise<IDisabledCommandsResponse[]> {
		const disabledCommands = await this.client.databaseClient.query<IDisabledCommandsResponse>(
			`SELECT * FROM G_Disabled_Commands`,
		);
		for (const disabledCommand of disabledCommands) {
			this.DisabledCommands[disabledCommand.name] = disabledCommand.reason;
		}
		return disabledCommands;
	}
}

