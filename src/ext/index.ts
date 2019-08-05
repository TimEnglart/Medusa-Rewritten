import * as discord from 'discord.js';
import * as Settings from '../config/settings.json';
import { Database, SqlQuery } from './database';
import { LogFilter, Logger } from './logger';
import { Utility } from './utility';
import { MyRequester } from './webClient';
type CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => Promise<void | Error>;

interface CommandHelp {
	name: string;
	usage: string;
	description: string;
	example: string;
	permissionRequired: discord.BitFieldResolvable<discord.PermissionString>; // Change nulls to 'SEND_MESSAGES'
	environments?: string[];
	expectedArgs?: Array<{
		name: string,
		optional: boolean
	}>;
}

interface CommandFile {
	run: CommandRun;
	help: CommandHelp;
}

interface ExtendedClient extends discord.Client {
	commands: discord.Collection<string, CommandFile>;
	settings: typeof Settings;
	statusMessages: string[];
	usersEarningXp: any;
	logger: {
		logClient: Logger;
		logFilters: typeof LogFilter;
	};
	databaseClient: Database;
}
class Embeds {
	public static permissionEmbed(permissionTitle: string, permissionDescription: string, overrideOptions?: discord.MessageEmbedOptions) {
		const permissionError = new discord.MessageEmbed(overrideOptions)
			.setTitle('Access Denied')
			.setDescription('Guardian is of insufficient rank for this command. \\⚠️')
			.setColor('#ba0526')
			.addField(permissionTitle, permissionDescription, false);
		return permissionError;
	}

	public static helpEmbed(commandModule: CommandFile, overrideOptions?: discord.MessageEmbedOptions) {
		const help = new discord.MessageEmbed(overrideOptions)
			.setTitle(`Info on "${commandModule.help.name || '<Empty>'}" Command. <:banshee:515429193518153748>`)
			.addField('Usage', `${commandModule.help.usage || '<Empty>'}`)
			.addField('Description', `${commandModule.help.description || '<Empty>'}`)
			.addField('Example', `${commandModule.help.example || '<Empty>'}`)
			.setColor('#00dde0');
		return help;
	}

	public static errorEmbed(errorTitle: string, errorDescription: string, overrideOptions?: discord.MessageEmbedOptions) {
		const functionError = new discord.MessageEmbed(overrideOptions)
			.setTitle('Error')
			.setDescription('Your Light is Fading <:down:513403773272457231>')
			.setColor('#ba0526')
			.addField(errorTitle, errorDescription, false);
		return functionError;
	}

	public static successEmbed(successTitle: string, successDescription: string, overrideOptions?: discord.MessageEmbedOptions) {
		const success = new discord.MessageEmbed(overrideOptions)
			.setTitle('Success!')
			.setDescription('Vanguard Approval Recieved. <:cayde:515427956995129364>')
			.setColor('#3bcc45')
			.addField(successTitle, successDescription);
		return success;
	}

	public static notifyEmbed(notifyTitle: string, notifyDescription: string, overrideOptions?: discord.MessageEmbedOptions) {
		const success = new discord.MessageEmbed(overrideOptions)
			.setTitle('Check your Recieved Direct Messages')
			.setColor('#00dde0')
			.addField(notifyTitle, notifyDescription);
		return success;
	}
}


export { discord, Logger, LogFilter, Database, SqlQuery, Settings, ExtendedClient, CommandFile, CommandHelp, CommandRun, Utility, MyRequester, Embeds };
