import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
import CommandHandler from "../ext/CommandHandler";
import { Message, MessageEmbed } from "discord.js";
import { CommandError } from "../ext/errorParser";
import { Utility } from "../ext/utility";


export default class ExitBot extends ExtendedClientCommand {
	constructor(commandHandler: CommandHandler) {
		super(commandHandler);
		this.name = 'info';
		this.description = 'Gets User Data';
		this.environments = ['text'];
		this.expectedArguments = [{ name: 'User Resolvable', optional: true, example: '' }];
		this.permissionRequired = 'SUPER_USER';
		this.requiredProperties = {
			Message: {
				author: undefined,
			},
			ExtendedClient: {
				user: undefined,
				me: undefined,
			},
		};
	}
	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
		const user = Utility.LookupMember(message.guild, args.join(' ') || message.author.id);
		const userId = user ? user.id : args.join(' ');
		const embed = new MessageEmbed().setTitle(`Info For: ${user ? user.displayName : userId}`);
		if (user) {
			embed
				.setColor(user.displayHexColor)
				.addField(`User Id`, user.id, true)
				.addField('Last Message', user.lastMessage?.createdAt?.toDateString() || '-', true)
				.addField('Joined', user.joinedAt?.toDateString() || '-', true)
				.addField(`Created`, user.user.createdAt.toDateString(), true);
		}
		//embed.addBlankField();
		const query = await this.client.databaseClient.query(
			`SELECT * FROM U_Bungie_Account uba JOIN U_Destiny_Profile udf ON uba.bungie_id = udf.bungie_id JOIN U_Experience ue ON uba.user_id = ue.user_id WHERE uba.user_id = ${userId}`,
		);
		embed.addField(`Registered Bungie ID`, query[0].bungie_id, true);
		for (let i = 0; i < query.length; i++) {
			// handle cross platform
			//if (i > 0) embed.addBlankField();
			embed.addField(`Registered Destiny ID`, query[i].destiny_id, true);
			embed.addField(`Registered Membership ID`, query[i].membership_id, true);
		}
		embed.addField(`Date Registered To Medusa`, query[0].time_added, true);
		//embed.addBlankField();
		embed.addField(`Discord XP`, query[0].xp, true);
		embed.addField(`Discord Level`, query[0].level, true);
		embed.addField(`Discord Prestige`, query[0].reset, true);
		embed.addField(`Last Medal Auto Check`, query[0].last_checked_medals, true);
		embed.addField(`Connected`, query[0].connected > 0 ? '✅' : '❌', true);
		//embed.addBlankField();
		const categorizedMedals = this.client.MedalHandler.categorizeMedals();
		for (const [key, value] of Object.entries(categorizedMedals)) {
			const firstEntry = value[0];
			if (key === 'Locked' || !firstEntry) continue;
			const categoryDB = await this.client.databaseClient.query(
				`SELECT * FROM ${firstEntry.dbData.table} WHERE user_id = ${userId}`,
			);
			if (!categoryDB.length) {
				await this.client.databaseClient.query(
					`INSERT INTO ${firstEntry.dbData.table} (user_id) VALUES (${userId})`,
				);
				continue;
			}
			const medals = value.map((x) => `${x.name}: ` + (categoryDB[0][x.dbData.column] ? '✅' : '❌'));
			if (medals.length) embed.addField(`${key}`, `${medals.join('\n')}`);
		}
		await message.channel.send(embed);
	}
}