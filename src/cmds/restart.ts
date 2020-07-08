import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, MessageEmbed } from "discord.js";
import { CommandError } from "../ext/errorParser";
import { exec } from "child_process";
import { LogFilter } from "../ext/logger";
import { Utility } from "../ext/utility";


export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'exec';
		this.description = 'Runs an Internal Command or Bot Function';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [{ name: 'Command Type', optional: false, example: 'custom' }, {name: 'Arguments', optional: true, example: 'neofetch'}];
		this.permissionRequired = 'SUPER_USER';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
			},
		};
		this.hidden = true;
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed

		const commandType = args.shift();

		this.client.logger.logS(`Running an Exec Command:\nUser: ${message.author.username}(${message.author.id})\nCommandType: ${commandType}\nArguments: ${JSON.stringify(args)}`, LogFilter.Debug);
		try {
			const response = await new Promise((res: (value?: MessageEmbed) => void, rej) => {
				switch(commandType) {
					case 'custom':
						exec(args.join(' '), (error, stdout, stderr) => {
							if (error) rej(error);
							return res(this.generateEmbed([
								{
									name: `Standard Output`,
									value: stdout || 'NO_OUTPUT'
								},
								{
									name: `Standard Error`,
									value: stderr || 'NO_OUTPUT'
								}
							]));
						}
						);
						break;
					case 'update':
						this.client.Update();
						break;

					case 'assginrole': {
						if(message.member && message.guild) {
							const role = Utility.LookupRole(message.guild, args[0]);
							if(role) {
								message.member.roles.add(role).then(() => {
									res(this.generateEmbed([{name: `Successfully Added Role: ${role.name}`, value: `You Should Now Have the Mentioned Role`}]));
								}).catch(e => {
									rej(e);
								});
							}
						}
						break;
					}
					default: 
						break;
				}
			});
			if (response) await message.channel.send(response);
		}
		catch(e) {
			await message.channel.send(this.generateEmbed([{name: `Execution Failed and Throw an Error`, value: `Raw Error:\n${JSON.stringify(e)}`}], false));
		}
		
	}
	private generateEmbed(fields: {name: string; value: string; inline?: boolean}[], success = true): MessageEmbed { // assume success as throw with error
		return new MessageEmbed({
			title: `Execution ${success ? `Successful`: 'Failed'}`,
			fields: fields,
		}).setColor(success ? 'GREEN' : 'RED');
	}
}