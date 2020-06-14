import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, MessageEmbed } from "discord.js";
import { CommandError } from "../ext/errorParser";
import RichEmbedGenerator from "../ext/RichEmbeds";

export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'register';
		this.description = 'Link Discord Account to Bungie Account For Guild So In Game Progression Can Be Tracked';
		this.environments = ['text', 'dm'];
		this.expectedArguments = [{ name: 'Exit Code', optional: true, example: '1' }];
		this.permissionRequired = 'SEND_MESSAGES';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		message.channel.stopTyping();
		/*
		const initialTimeStamp = new Date();
		const registerEmbed = new MessageEmbed()
			.setURL(`${this.client.settings.webData.url}initialize.php?did=${message.author.id}`)
			.setTitle('Link Your Destiny Account to Your Lighthouse Progression')
			.setColor('#1E90FF')
			.setFooter('Medusa', this.client.user.displayAvatarURL())
			.addField(
				'Enhance Your Guardian Progression',
				`Completing this Registration Will Add Additional Features and Integrations Between Destiny and The Lighthouse Discord Server\n\n[Click Here To Register](${this.client.settings.webData.url}initialize.php?did=${message.author.id})`,
			);
		const registerMsg = await message.author.send(registerEmbed);
		registerMsg.channel.startTyping();
		let timePassed = 0;
		while (timePassed < 1200) {
			await new Promise((completeTimeout) => setTimeout(completeTimeout, 5000));
			timePassed += 5;
			
			const dbQuery = await this.client.databaseClient.query(
				`SELECT * FROM U_Bungie_Account WHERE user_id = ${message.author.id}`,
			);
			if (dbQuery.length) {
				if (new Date(dbQuery[0].time_added) > initialTimeStamp) {
					timePassed = 1200;
					await registerMsg.delete();
					await message.author.send(
						RichEmbedGenerator.successEmbed('Sign Up Successful', 'Nothing More For You To Do :)'),
					);
					return;
				}
			}
		}
		throw new CommandError('REGISTRATION_TIMEOUT', 'Reuse the `register` Command to Attempt to Sign Up Again');
		*/
	}
}