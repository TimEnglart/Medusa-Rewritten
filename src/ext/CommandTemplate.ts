import { Message, Permissions, PermissionString } from 'discord.js';
import { CommandError } from '../ext/errorParser';
import CommandHandler from '../ext/CommandHandler';
import ExtendedClient from './ExtendedClient';

// TODO: Add Additional Debugging to Property Checks

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

export interface ICommandResult {
	success: boolean;
	error?: Error | CommandError;
}
enum ChannelType {
	text = 0,
	dm = 1,
	voice = 2,
	group = 3,
	category = 4,
	news = 5,
	store = 6,
	unknown = 7,
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
		this.environments = ['text', 'dm', 'voice', 'category', 'news', 'store', 'unknown'];
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
		if (!this.validChannel(message)) {
			return {
				success: false,
				error: new CommandError('INVALID_CHANNEL'),
			};
		}
		if (!this.verifyArguments(...args)) {
			return {
				success: false,
				error: new CommandError('INVALID_ARGUMENT_LENGTH'),
			};
		}
		if (!this.checkProperties(message) || !this.checkProperties(this.client) || !this.ExtendedPropertyCheck()) {
			return {
				success: false,
				error: new CommandError('MISSING_PROPERTIES'),
			};
		}
		if (!this.validPermissions(message)) {
			return {
				success: false,
				error: new CommandError('USER_INSUFFICIENT_PRIVILEGES'),
			};
		}

		this.client.logger.logS(`Command - ${this.name} Executed by ${message.author.tag}(${message.author.id})`, 3);
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

	protected async Run(message: Message, ...args: string[]): Promise<void | ICommandResult> {
		throw new CommandError('DEFAULT_COMMAND'); // Just Throw because There is a Catch in Execute
	}
	protected ExtendedPropertyCheck(): boolean {
		// Add Extra Property Checks Here In Child Class to Override
		return true;
	}

	private propertyIsDefined(obj: Record<string, any>, property: string, requiredValue?: unknown): boolean {
		if (!obj) return false; // If No Base Object
		const objectProperty = obj[property];
		if (objectProperty === null || objectProperty === undefined) return false; // If Property has no value
		if (!(requiredValue === null || requiredValue === undefined) && objectProperty !== requiredValue) return false; // if we are checking if it has an required value which isnt null or undef
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
	public validPermissions(message: Message): boolean { // make public so its known if it will be executed
		if (this.client.isSuperUser(message.author)) return true;
		if (message.member) {
			if (this.propertyIsDefined(Permissions.FLAGS, this.permissionRequired))
				if (message.member.hasPermission(this.permissionRequired as PermissionString)) return true;
		} else if (message.author) {
			if (this.permissionRequired === 'SEND_MESSAGES') return true;
		}
		return this.ExtendedPermissionCheck(message);
	}
	private validChannel(message: Message): boolean {
		return this.environments.includes(message.channel.type);
	}
	private verifyArguments(...args: string[]): boolean {
		return args.length >= this.expectedArguments.filter((arg) => !arg.optional).length;
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