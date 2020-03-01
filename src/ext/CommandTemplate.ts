import { Message, Permissions, PermissionString, GuildMember, User } from 'discord.js';
import { CommandError } from '@extensions/errorParser';
import CommandHandler from '@extensions/CommandHandler';
import ExtendedClient from './ExtendedClient';

interface IRequiredProperties {
	[baseObject: string]: IRecursiveProperty;
}
interface IRecursiveProperty {
	[propertyName: string]: IRecursiveProperty | string | undefined;
}
interface IExpectedArgument {
	name: string;
	optional: boolean;
	example: string;
}

interface ICommandResult {
	success: boolean;
	error?: Error | CommandError;
}
class ExtendedClientCommand {
	public description: string;
	public environments: (keyof typeof ChannelType)[];
	public expectedArguments: IExpectedArgument[];
	public name: string;
	public permissionRequired: PermissionString | string;
	public requiredProperties?: IRequiredProperties;
	public hidden?: boolean; // IDK About This One
	protected readonly client: ExtendedClient;
	constructor(protected readonly CommandHandler: CommandHandler) {
		this.client = this.CommandHandler.client;
		this.description = 'NO_DESC';
		this.environments = [
			'text',
			'dm',
			'voice',
			'category',
			'news',
			'store',
			'unknown',
		];
		this.expectedArguments = [];
		this.name = '';
		this.permissionRequired = '';
		this.requiredProperties = undefined;
		/*
		this.requiredProperties = {
			Message: {
				member: undefined,
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
			},
		};
		*/
		this.hidden = false;
	}
	public async Execute(message: Message, ...args: string[]): Promise<ICommandResult> {
		// Pre Run

		if (!this.checkProperties(message) || !this.checkProperties(this.client) || !this.ExtendedPropertyCheck()) {
			return {
				success: false,
				error: new CommandError('MISSING_PROPERTIES'),
			};
		}

		if (!this.validChannel(message)) {
			return {
				success: false,
				error: new CommandError('INVALID_CHANNEL'),
			};
		}

		if (!this.validPermissions(message)) {
			return {
				success: false,
				error: new CommandError('INSUFFICIENT_PRIVILEGES'),
			};
		}

		if (!this.verifyArguments(...args)) {
			return {
				success: false,
				error: new CommandError('INVALID_ARGUMENT_LENGTH'),
			};
		}

		try {
			const exitCode = await this.Run(message, ...args);
			return exitCode || { success: true };
		} catch (e) {
			return {
				success: false,
				error: e,
			};
		}
	}

	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		throw new CommandError('DEFAULT_COMMAND'); // Just Throw because There is a Catch in Execute
	}
	protected ExtendedPropertyCheck(): boolean {
		// Add Extra Property Checks Here In Child Class to Override
		return true;
	}

	private propertyIsDefined(obj: Record<string, any>, property: string, requiredValue?: any): boolean {
		if (!obj) return false;
		const objectProperty = Object.entries(obj).find(([prop]) => prop === property); // No Need for Filter as there can only be 1 or 0 Properties
		if (!objectProperty) return false;
		if (!objectProperty[1]) return false;
		if (requiredValue && objectProperty[1] !== requiredValue) return false;
		return true;
	}
	private checkProperties(obj: Record<string, any>): boolean {
		if (!this.requiredProperties) return true; // Nothing To Check Ever
		const selectedObject = this.requiredProperties[obj.constructor.name]; // Base Object Needs to Be a Class So It Can Be Indexed And Object Tree Can Be Applied :(
		if (!selectedObject) return true; // Nothing to Check for This Object
		return this.recursivePropertyCheck(obj, selectedObject);
	}
	private recursivePropertyCheck(obj: Record<string, any>, requiredProperties: IRecursiveProperty): boolean {
		if (requiredProperties) {
			for (const propertyName in requiredProperties) {
				const propertyToCheck = requiredProperties[propertyName];
				if (typeof propertyToCheck === 'object') {
					if (!this.recursivePropertyCheck(obj[propertyName], propertyToCheck)) return false;
				} else {
					if (!this.propertyIsDefined(obj, propertyName, propertyToCheck)) return false;
				}
			}
			return true;
		}
		return false;
	}
	protected ExtendedPermissionCheck(message: Message): boolean {
		// Add Extra Permission Checks Here In Child Class to Override
		return false;
	}
	private validPermissions(message: Message): boolean {
		if (message.member) {
			if (this.propertyIsDefined(Permissions.FLAGS, this.permissionRequired))
				return message.member.hasPermission(this.permissionRequired as PermissionString);
		} else if (message.author) {
			if (this.permissionRequired === 'SEND_MESSAGES') return true;
		} else if (this.client.isSuperUser(message.author)) return true;
		return this.ExtendedPermissionCheck(message);
	}
	private validChannel(message: Message): boolean {
		return this.environments.includes(message.channel.type);
	}
	private verifyArguments(...args: string[]): boolean {
		return args.length >= this.expectedArguments.filter((arg) => arg.optional).length;
	}
	public ReadableEnvironments(): string[] {
		const lookupTable: { [environment: string]: string } = {
			dm: 'Direct Message',
			text: 'Guild Text Channel',
			voice: 'Guild Voice Channel',
			category: 'Guild Category Channel',
			news: 'Guild News Channel',
			store: 'Guild Store Channel',
			unknown: 'Unknown Channel',
		};
		return this.environments.map((environment) => lookupTable[environment]);
	}
}

export default ExtendedClientCommand;
export { ICommandResult };