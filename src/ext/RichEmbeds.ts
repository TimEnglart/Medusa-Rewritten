import { MessageEmbedOptions, MessageEmbed, EmbedFieldData } from "discord.js";
import ExtendedClientCommand from "./CommandTemplate";

export default class RichEmbedGenerator {
	public static addBlankField(embed: MessageEmbed, inline = false): MessageEmbed {
		return embed.addField('\u200B', '\u200B', inline);
	}
	public static getBlankFieldObject(inline = false): EmbedFieldData {
		return { name: '\u200B', value: '\u200B', inline };
	}
	public static permissionEmbed(
		permissionTitle: string,
		permissionDescription: string,
		overrideOptions?: MessageEmbedOptions,
	): MessageEmbed {
		const basicEmbed: MessageEmbedOptions = {
			color: '#ba0526',
			description: 'Guardian is of insufficient rank for this command. \\⚠️',
			fields: [{ name: permissionTitle, value: permissionDescription, inline: false }],
			title: 'Access Denied',
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new MessageEmbed(basicEmbed);
	}
	public static generateUsage(command: ExtendedClientCommand, prefix?: string): string {
		return `${prefix}${command.name} ${
			command.expectedArguments.length
				? command.expectedArguments
					.map((arg) => (arg.optional ? `[${arg.name}]` : `<${arg.name}>`))
					.join(' ')
				: ``
		}`;
	}
	public static generateExample(command: ExtendedClientCommand, prefix?: string): string {
		return `${prefix}${command.name} ${
			command.expectedArguments.length
				? command.expectedArguments
					.map((arg) => (arg.optional ? `[${arg.example}]` : `<${arg.example}>`))
					.join(' ')
				: ``
		}`;
	}
	public static helpEmbed(
		command: ExtendedClientCommand,
		prefix?: string,
		overrideOptions?: MessageEmbedOptions,
	): MessageEmbed {
		if (!prefix) prefix = ''; // Settings.defaultPrefix; // Fix This Later
		const basicEmbed: MessageEmbedOptions = {
			color: '#00dde0',
			fields: [
				{
					name: 'Usage',
					value: `\`\`\`${RichEmbedGenerator.generateUsage(command, prefix) ||
                                       '<Empty>'}\`\`\`\n`,
					inline: false,
				},
				{ name: 'Description', value: `${command.description || '<Empty>'}\n`, inline: false },
				{
					name: 'Example',
					value: `\`\`\`${RichEmbedGenerator.generateExample(command, prefix) ||
                                       '<Empty>'}\`\`\`\n`,
					inline: false,
				},
				{
					name: 'Allowed Channels',
					value: `${
						command.environments.length ? command.ReadableEnvironments().join(', ') : 'None'
					}\n`,
					inline: false,
				},
				{ name: 'Required Permissions', value: `${command.permissionRequired}`, inline: false },
			],
			title: `Info on "${command.name || '<Empty>'}" Command. <:banshee:515429193518153748>`,
		};

		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new MessageEmbed(basicEmbed);
	}

	public static errorEmbed(
		errorTitle: string,
		errorDescription: string,
		overrideOptions?: MessageEmbedOptions,
	): MessageEmbed {
		const basicEmbed: MessageEmbedOptions = {
			color: '#ba0526',
			description: 'Your Light is Fading <:down:513403773272457231>',
			fields: [{ name: errorTitle, value: errorDescription, inline: false }],
			title: 'Error',
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new MessageEmbed(basicEmbed);
	}

	public static successEmbed(
		successTitle: string,
		successDescription: string,
		overrideOptions?: MessageEmbedOptions,
	): MessageEmbed {
		const basicEmbed: MessageEmbedOptions = {
			color: '#3bcc45',
			description: 'Vanguard Approval Received. <:cayde:515427956995129364>',
			fields: [{ name: successTitle, value: successDescription, inline: false }],
			title: 'Success!',
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new MessageEmbed(basicEmbed);
	}

	public static notifyEmbed(
		notifyTitle: string,
		notifyDescription: string,
		overrideOptions?: MessageEmbedOptions,
	): MessageEmbed {
		const basicEmbed: MessageEmbedOptions = {
			color: '#00dde0',
			fields: [{ name: notifyTitle, value: notifyDescription, inline: false }],
			title: 'Check your Received Direct Messages',
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new MessageEmbed(basicEmbed);
	}
	public static resetNotifyEmbed(
		notifyTitle: string,
		notifyDescription: string,
		overrideOptions?: MessageEmbedOptions,
	): MessageEmbed {
		const basicEmbed: MessageEmbedOptions = {
			color: '#ffae00',
			fields: [{ name: notifyTitle, value: notifyDescription, inline: false }],
			thumbnail: {
				url: 'https://i.imgur.com/GDvNXqa.png',
			},
			title: 'You have Become Legend!',
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new MessageEmbed(basicEmbed);
	}

	public static GenericCommandSuccessEmbed(
		commandName: string,
		description: string,
		overrideOptions?: MessageEmbedOptions,
	): MessageEmbed {
		const basicEmbed: MessageEmbedOptions = {
			color: '#3bcc45',
			fields: [{ name: 'Command', value: description, inline: false }],
			title: `Successfully Executed ${commandName}`,
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new MessageEmbed(basicEmbed);
	}
	public static GenericCommandFailureEmbed(
		commandName: string,
		description: string,
		overrideOptions?: MessageEmbedOptions,
	): MessageEmbed {
		const basicEmbed: MessageEmbedOptions = {
			color: '#ba0526',
			fields: [{ name: 'Command', value: description, inline: false }],
			title: `Failed to Execute ${commandName}`,
		};
		if (overrideOptions) Object.assign(basicEmbed, overrideOptions);
		return new MessageEmbed(basicEmbed);
	}
}
