import { Message, Permissions, PermissionString, Guild, BitField } from 'discord.js';
import { CommandError } from '../ext/errorParser';
import CommandHandler from '../ext/CommandHandler';
import ExtendedClient, { ChannelTypes } from './ExtendedClient';
import { LogFilter } from './logger';

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



class ExtendedClientCommand {
	public description: string;
	public environments: (keyof typeof ChannelTypes)[];
	public expectedArguments: IExpectedArgument[];
	public name: string;
	public executorPermissionRequired: PermissionString | string;
	public clientPermissionsRequired: PermissionString[];
	public requiredProperties?: IRequiredProperties;
	public hidden?: boolean; // IDK About This One
	protected readonly client: ExtendedClient;
	constructor(protected readonly CommandHandler: CommandHandler) {
		this.client = this.CommandHandler.client; // Discord Bot Client
		this.description = 'NO_DESC'; // Description of The Command
		this.environments = ['text', 'dm', 'voice', 'category', 'news', 'store', 'unknown']; // What Channels The Command can Be Executed In
		this.expectedArguments = []; // The Arguments the Command Will Take
		this.name = ''; // Name of the Command
		this.executorPermissionRequired = ''; // Permission the Person Executing the Command Will Need
		this.clientPermissionsRequired = ['SEND_MESSAGES']; // Permissions the Bot Will Need When Executing the Command.... maybe combine with above property
		this.requiredProperties = undefined; // A Dynamic Property Check to see if properties Exist on the ExtendedClient and the Message
		/*
		EXAMPLE OF requiredProperties

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
			if (this.propertyIsDefined(Permissions.FLAGS, this.executorPermissionRequired))
				if (message.member.hasPermission(this.executorPermissionRequired as PermissionString)) return true;
		} else if (message.author) {
			if (this.executorPermissionRequired === 'SEND_MESSAGES') return true;
		}
		return this.ExtendedPermissionCheck(message);
	}

	public validClientPermissions(message: Message): boolean { // we know if it is in the right channel for the action due to validChannel()
		if(!message.guild) return true; // DM. So No Client Permissions are Required
		const clientMember = message.guild.me;
		if (!clientMember) throw new CommandError(`NO_MEMBER`, 'Was Unable to Resolve Myself in the Guild Context');
		for(const permissionString of this.clientPermissionsRequired)
			if (!clientMember.hasPermission(permissionString)) return false;
		return true;
	}

	private validChannel(message: Message): boolean {
		return this.environments.includes(message.channel.type);
	}
	private verifyArguments(...args: string[]): boolean {
		return args.length >= this.expectedArguments.filter((arg) => !arg.optional).length;
	}
	public ReadableEnvironments(): string[] {
		return this.environments.map((environment) => ChannelTypes[environment]);
	}

	protected log(message: string, filter: LogFilter = LogFilter.Info): void {
		this.client.logger.logS(message, filter);
	}
}

export default ExtendedClientCommand;