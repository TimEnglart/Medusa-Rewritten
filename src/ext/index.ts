import * as discord from 'discord.js';
import * as Settings from '../config/settings.json';
import { Database, SqlQuery } from './database';
import { LogFilter, Logger } from './logger';
import { Utility } from './utility';
import { MyRequester } from './webClient';
import * as express from 'express';
import { WebServer } from './web-server/index.js';
import { ScoreBook } from './score-book/index.js';
import { CommandError } from './errorParser';
type CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => Promise<void>;

interface CommandHelp {
	name: string;
	description: string;
	example?: string;
	permissionRequired: discord.BitFieldResolvable<discord.PermissionString>; // Change nulls to 'SEND_MESSAGES'
	environments: string[];
	expectedArgs: Array<{
		name: string,
		optional: boolean,
		example: string
	}>;
	hidden?: boolean;
}



interface CommandFile {
	run: CommandRun;
	help: CommandHelp;
}
interface ExtendedClient extends discord.Client {
	commands: discord.Collection<string, CommandFile>;
	settings: typeof Settings;
	statusMessages: string[];
	usersEarningXp: {
		[userId: string]: string;
	};
	logger: {
		logClient: Logger;
		logFilters: typeof LogFilter;
	};
	databaseClient: Database;
	webServer: WebServer;
	scoreBook: ScoreBook;
	disabledCommands?: {
		[commandName: string]: {
			reason?: string;
		};
	};
}
// tslint:disable-next-line: max-classes-per-file
class Embeds {
	public static permissionEmbed(permissionTitle: string, permissionDescription: string, overrideOptions?: discord.MessageEmbedOptions): discord.MessageEmbed {
		const basicEmbed: discord.MessageEmbedOptions = {
			color: '#ba0526',
			description: 'Guardian is of insufficient rank for this command. \\⚠️',
			fields: [
				{ name: permissionTitle, value: permissionDescription, inline: false }
			],
			title: 'Access Denied'
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new discord.MessageEmbed(basicEmbed);
	}
	public static generateUsage(commandModule: CommandFile, prefix?: string): string {
		return `${prefix}${commandModule.help.name} ${commandModule.help.expectedArgs.length ? commandModule.help.expectedArgs.map(arg => arg.optional ? `[${arg.name}]` : `<${arg.name}>`).join(' ') : ``}`;
	}
	public static generateExample(commandModule: CommandFile, prefix?: string): string {
		return `${prefix}${commandModule.help.name} ${commandModule.help.expectedArgs.length ? commandModule.help.expectedArgs.map(arg => arg.optional ? `[${arg.example}]` : `<${arg.example}>`).join(' ') : ``}`;
	}
	public static helpEmbed(commandModule: CommandFile, prefix?: string, overrideOptions?: discord.MessageEmbedOptions): discord.MessageEmbed {
		const channelConv = {
			dm: 'Direct Message',
			text: 'Guild Text Channel',
			voice: 'Guild Voice Channel',
			category: 'Guild Category Channel',
			unknown: 'Unknown Channel'
		} as { [s: string]: string };
		if (!prefix) prefix = Settings.defaultPrefix;
		const usage = Embeds.generateUsage(commandModule, prefix);
		const basicEmbed: discord.MessageEmbedOptions = {
			color: '#00dde0',
			fields: [
				{ name: 'Usage', value: `\`\`\`${usage || '<Empty>'}\`\`\`\n`, inline: false },
				{ name: 'Description', value: `${commandModule.help.description || '<Empty>'}\n`, inline: false },
				{ name: 'Example', value: `\`\`\`${Embeds.generateExample(commandModule, prefix) || '<Empty>'}\`\`\`\n`, inline: false },
				{ name: 'Allowed Channels', value: `${commandModule.help.environments.length ? commandModule.help.environments.map(channel => channelConv[channel]).join(', ') : 'None'}\n` },
				{ name: 'Required Permissions', value: `${commandModule.help.permissionRequired}`, inline: false }
			],
			title: `Info on "${commandModule.help.name || '<Empty>'}" Command. <:banshee:515429193518153748>`
		};

		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new discord.MessageEmbed(basicEmbed);
	}

	public static errorEmbed(errorTitle: string, errorDescription: string, overrideOptions?: discord.MessageEmbedOptions): discord.MessageEmbed {
		const basicEmbed: discord.MessageEmbedOptions = {
			color: '#ba0526',
			description: 'Your Light is Fading <:down:513403773272457231>',
			fields: [
				{ name: errorTitle, value: errorDescription, inline: false }
			],
			title: 'Error'
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new discord.MessageEmbed(basicEmbed);
	}

	public static successEmbed(successTitle: string, successDescription: string, overrideOptions?: discord.MessageEmbedOptions): discord.MessageEmbed {
		const basicEmbed: discord.MessageEmbedOptions = {
			color: '#3bcc45',
			description: 'Vanguard Approval Received. <:cayde:515427956995129364>',
			fields: [
				{ name: successTitle, value: successDescription, inline: false }
			],
			title: 'Success!'
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new discord.MessageEmbed(basicEmbed);
	}

	public static notifyEmbed(notifyTitle: string, notifyDescription: string, overrideOptions?: discord.MessageEmbedOptions): discord.MessageEmbed {
		const basicEmbed: discord.MessageEmbedOptions = {
			color: '#00dde0',
			fields: [
				{ name: notifyTitle, value: notifyDescription, inline: false }
			],
			title: 'Check your Received Direct Messages'
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new discord.MessageEmbed(basicEmbed);
	}
	public static resetNotifyEmbed(notifyTitle: string, notifyDescription: string, overrideOptions?: discord.MessageEmbedOptions): discord.MessageEmbed {
		const basicEmbed: discord.MessageEmbedOptions = {
			color: '#ffae00',
			fields: [
				{ name: notifyTitle, value: notifyDescription, inline: false }
			],
			thumbnail: {
				url: 'https://i.imgur.com/GDvNXqa.png'
			},
			title: 'You have Become Legend!'
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new discord.MessageEmbed(basicEmbed);
	}
}


export { discord, Logger, LogFilter, Database, SqlQuery, Settings, ExtendedClient, CommandFile, CommandHelp, CommandRun, Utility, MyRequester, Embeds, CommandError };
