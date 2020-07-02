
// import ExtendedClientCommand, { ICommandResult } from "../ext/CommandTemplate";
// import CommandHandler from "../ext/CommandHandler";
// import { Message, User, GuildMember, MessageEmbed, Guild } from "discord.js";
// import { CommandError } from "../ext/errorParser";
// import RichEmbedGenerator from "../ext/RichEmbeds";
// import { Utility } from "../ext/utility";
// import { IRankData } from "ext/settingsInterfaces";




// export default class ExitBot extends ExtendedClientCommand {
// 	constructor(commandHandler: CommandHandler) {
// 		super(commandHandler);
// 		this.name = 'guardian';
// 		this.description = 'Displays Guardian profiles including current Rank, XP, number of Resets and Medals.';
// 		this.environments = ['text'];
// 		this.expectedArguments = [{ name: 'query', optional: true, example: '@User#12345 | reset | rank' }];
// 		this.permissionRequired = 'SEND_MESSAGES';
// 		this.requiredProperties = {
// 			Message: {
// 				author: undefined,
// 			},
// 			ExtendedClient: {
// 				user: undefined
// 			},
// 		};
// 	}

// 	protected async Run(message: Message, ...args: string[]): Promise<ICommandResult | void> {
// 		if (!message.author || !this.client.user) throw new CommandError('DYNAMIC_PROPERTY_CHECK_FAILED');
// 		const fixEmbed = (array: string[], index = 4): string[] => {
// 			if (array.length > index) {
// 				array.splice(index, 0, '\n');
// 				fixEmbed(array, index + 5);
// 			}
// 			return array;
// 		};
// 		if (!message.author) throw new CommandError('NO_AUTHOR'); // If Author is Needed
// 		if (!message.member) throw new CommandError('NO_MEMBER'); // If Member is Needed
// 		if (!message.guild) throw new CommandError('NO_GUILD'); // If Guild is Needed
// 		if (!this.client.user) throw new CommandError('NO_BOT_USER'); // If Bot Instance is Needed
// 		if (!message.guild) {
// 			await message.reply('CAN ONLY BE USED IN LIGHTHOUSE DISCORD AT THIS MOMENT');
// 			return;
// 		}
// 		let user: User | GuildMember | null;
// 		const ranks = this.client.settings.lighthouse.ranks;
// 		const amountOfLevels = ranks.length;
// 		const userCollection = await this.client.nextDBClient.getCollection('experience');
// 		if (args[0] === 'rank') {
// 			const leaderBoard = userCollection.find<IUserExperience>().sort({reset: -1, level: -1});
			
// 			const leaderBoardEmbed = new MessageEmbed()
// 				.setTitle('Top 10 Guardians')
// 				.setThumbnail(message.guild.iconURL() || '')
// 				.setColor('#ff8827');


// 			let i = 1,
// 				foundUser = false;
// 			while(await leaderBoard.hasNext()) {
// 				const user = await leaderBoard.next();
// 				if(!user) break;
// 				const _userFound = !foundUser && user._id == message.author.id;
// 				const data = this.getUserData(user, message.guild);
// 				leaderBoardEmbed.addField(
// 					`${i}. ${data.displayName} ${data.rank.emoji.text} ${_userFound ? ' \\◀' : ''}`,
// 					`${data.rank.name} - Reset: ${data.databaseData.reset} - XP: ${data.databaseData.xp}`,
// 				);
// 				if(_userFound) foundUser = true;
// 				i++;
// 			}
// 			if(!foundUser) {
// 				const userData = await userCollection.findOne({ _id: message.author.id });
// 				const data = this.getUserData(userData, message.guild);
// 				if(userData)
// 					leaderBoardEmbed.addField(
// 						`${i}. ${data.displayName} ${data.rank.emoji.text} ${foundUser ? ' \\◀' : ''}`,
// 						`${data.rank.name} - Reset: ${data.databaseData.reset} - XP: ${data.databaseData.xp}`,
// 					);
// 			}
// 			await message.channel.send(leaderBoardEmbed);
// 			return;
			
// 		} else if (args[0] === 'reset') {
// 			const _userExperience = await userCollection.findOne<IUserExperience>({ _id: message.author.id });
			

// 			if (_userExperience && _userExperience.level >= amountOfLevels) {
// 				const resetXp = 3000 * amountOfLevels;
// 				const _currentReset = _userExperience.reset;
// 				const currentXp = _userExperience.xp;
// 				const newReset = _currentReset + 1;
// 				const newXp = currentXp > resetXp ? currentXp - resetXp : 0;

// 				await userCollection.updateOne({ _id: message.author.id }, {
// 					$set: {
// 						reset: newReset,
// 						xp: newXp,
// 						level: 1
// 					}
// 				});
// 				await message.channel.send(
// 					RichEmbedGenerator.successEmbed(
// 						'Your Light Grows Brighter Guardian!',
// 						`Your Rank has been reset back to ${ranks[0].name} ${ranks[0].emoji.text}.\nNumber of Resets: ${newReset}`,
// 					),
// 				);
// 			} else {
// 				await message.channel.send(
// 					RichEmbedGenerator.errorEmbed(
// 						'Insufficient Rank',
// 						`You need to be of **${ranks[ranks.length - 1].name}** Rank before you can Reset.`,
// 					),
// 				);
// 			}
// 			return;
// 		} else if (args[0]) {
// 			user = Utility.LookupMember(message.guild, args.join(' '));
// 		} else {
// 			user = message.member;
// 		}
// 		if (!user) {
// 			await message.channel.send(
// 				RichEmbedGenerator.errorEmbed(
// 					'Error Locating User',
// 					`I was unable to find the user ${args.join(' ')} in the Server`,
// 				),
// 			);
// 			return;
// 		}
// 		const score: string | number = 'Broken At The Moment';
// 		//const destinyProfiles: {
// 		//	[key: string]: DestinyPlayer;
// 		//} = {};
// 		// Get Destiny Data From Database
// 		const destinyCollection = await this.client.nextDBClient.getCollection('destinyAccounts');
// 		const destinyProfile = destinyCollection.find({discordId: user.id});

// 		if(destinyProfile) {
// 			for await (const membershipType of destinyProfile) {
// 				const req = await this.client.bungieApiRequester.SendRequest(
// 					`/Destiny2/${destinyProfile.destinyProfiles[membershipType].destinyId}/Profile/${membershipType}/?components=100,900`,
// 				);
// 				if(req)
// 					for (const result of req.Response) {
// 						destinyProfiles[result.parsedData.profile.data.userInfo.membershipType] = result;
// 						if (+result.data.profileRecords.data.score > +score || isNaN(+score))
// 							score = +result.data.profileRecords.data.score;
// 					}
// 			}
// 		}

// 		const destinyProfilesData = await this.client.databaseClient.query(
// 			`SELECT * FROM U_Destiny_Profile WHERE bungie_id = (SELECT bungie_id FROM U_Bungie_Account WHERE user_id = ${user.id});`,
// 		);
// 		if (!destinyProfilesData.length) {
// 			// await message.reply('No Account'); // Change When Done to just skip
// 			// return resolve();
// 		} else {
// 			// if (destinyProfilesData.length === 1 && destinyProfilesData[0].membership_id === 4) {
// 			// 	score = `Zoinks is that a Bnet Account Linked to Your Discord Account.\nUse the \`register\` Command to Link Another Platform`;
// 			// }
// 			// else {
// 			//FIX THIS
			
// 			// }
// 		}

// 		const userExperience = await this.client.databaseClient.query(
// 			`SELECT * FROM U_Experience WHERE user_id = ${user.id}`,
// 		);
// 		if (!userExperience)
// 			throw new CommandError('DATABASE_ENTRY_NOT_FOUND', 'There is No Experience Entry For This User');
// 		const currentLevel = +userExperience[0].level;
// 		const currentLevelArray = currentLevel - 1;
// 		const currentExperience = +userExperience[0].xp;
// 		const currentReset = +userExperience[0].reset;
// 		const currentRank = ranks[currentLevel >= amountOfLevels ? amountOfLevels - 1 : currentLevelArray];
// 		const experienceRequiredForNextLevel = currentLevel * 3000;
// 		const experienceDifference = experienceRequiredForNextLevel - currentExperience;
// 		const xpBar = this.levelBar(currentExperience, experienceRequiredForNextLevel);
// 		const rankBar = this.levelBar(currentLevelArray, amountOfLevels);
// 		const romanReset = this.romanize(currentReset) as string;
// 		const leaderBoardRank = await this.client.databaseClient.query(
// 			`SELECT * FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY reset DESC, xp DESC) as position FROM U_Experience WHERE connected = true) as positions WHERE user_id = ${user.id} ORDER BY reset DESC, xp DESC`,
// 		);

// 		const guardianEmbed = new MessageEmbed()
// 			.setTitle(`${user.displayName} #${leaderBoardRank[0].position}`)
// 			// .setDescription(`${destinyProfiles[0].parsedData.profile.data.userInfo.displayName}`)
// 			.setFooter(
// 				`${experienceDifference} XP Until Next Level Up ${
// 					currentLevel >= amountOfLevels ? '| Consider Resetting... (use `guardian reset`)' : ''
// 				}`,
// 			)
// 			.setThumbnail(`${currentRank.icon}`)
// 			// .setImage(`${currentRank.icon}`)
// 			.setColor(`#4287f5`)

// 			// Add Fields
// 			.addField(`Triumph Score`, `${score}\n**_**`) // Triumph Score
// 			.addField(`${currentExperience} / ${experienceRequiredForNextLevel} XP`, `${xpBar}\n**_**`, true) // Xp Bar
// 			.addField(
// 				`${currentRank.name} ${romanReset.length > 5 ? currentReset : romanReset}`,
// 				`${rankBar}\n**_**`,
// 				true,
// 			) // Level Bar
// 			//.addBlankField(true); // Fix for Discord Embed Update
// 			// For Loop for medals
// 		const categorisedMedals = this.client.MedalHandler.categorizeMedals();
// 		for (const [key, value] of Object.entries(categorisedMedals)) {
// 			const firstEntry = value[0];
// 			if (key === 'Locked' || !firstEntry) continue;
// 			const categoryDB = await this.client.databaseClient.query(
// 				`SELECT * FROM ${firstEntry.dbData.table} WHERE user_id = ${user.id}`,
// 			);
// 			if (!categoryDB.length) {
// 				await this.client.databaseClient.query(
// 					`INSERT INTO ${firstEntry.dbData.table} (user_id) VALUES (${user.id})`,
// 				);
// 				continue;
// 			}
// 			const medals = value
// 				.map(x => {
// 					if (categoryDB[0][x.dbData.column]) return x.emoji;
// 					else {
// 						if (!x.limited) return categorisedMedals.Locked[0].emoji;
// 						else return '';
// 					}
// 				})
// 				.filter(x => x !== '');
// 			if (medals.length) guardianEmbed.addField(`${key}`, `${fixEmbed(medals).join('')}`, true);
// 		}
// 		let guardianMessage: Message | undefined;
// 		const dailyUpdate = Math.ceil(
// 			Math.abs(Date.parse(userExperience[0].last_checked_medals) - Date.now()) / (1000 * 60 * 60 * 24),
// 		);
// 		if (dailyUpdate > 1) {
// 			guardianMessage = await message.channel.send('Updating Your Medals...');
			
// 			const awardedMedals = await this.client.MedalHandler.checkAllMedals(user, true);
// 			await this.client.MedalHandler.UnlockMedals(user.user, awardedMedals);
// 			await this.client.databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${user.id}`);
// 		}
// 		guardianMessage = await (guardianMessage
// 			? guardianMessage.edit('', guardianEmbed)
// 			: message.channel.send(guardianEmbed));
// 		return ;
// 		/*
// 			for (const membershipType in destinyProfiles) {
// 				if (!membershipType) continue;
// 				await discordBot.logger.log(JSON.stringify(membershipType), 1);
// 				await discordBot.logger.log(JSON.stringify(destinyProfiles[membershipType].data.profileRecords.data.score), 2);
// 				// if (membershipType === '4') continue;
// 				// await guardianMessage.react(membershipType);
// 			}
// 			await guardianMessage.awaitReactions((reaction, user) => {
// 				if (destinyProfiles[reaction.emoji.name] && user.id === message.author!.id) {
// 					// Would Update
// 				}
// 				return false;
// 			}, {time: 300000});
// 			*/
// 	}
// 	private levelBar(currRank: number, numRanks: number): string {
// 		const numBars = 6;
// 		const bars: {[bar: string]: string} = {
// 			leftEndFull: '<:Left_End_Full:530375114408067072>',
// 			leftEndHalf: '<:Left_End_Half:530375043704946693>',
// 			leftEndEmpty: '...',
// 			middleFull: '<:Middle_Full:530375192342429736>',
// 			middleHalf: '<:Middle_Half:530375180195856385>',
// 			middleEmpty: '<:Middle_Empty:530375162806140928>',
// 			rightEndFull: '<:Right_End_Full:530375277105381387>',
// 			rightEndHalf: '<:Right_End_Half:530375267626254346>',
// 			rightEndEmpty: '<:Right_End_Empty:530375232041779210>',
// 		};
// 		const rankPercentage = currRank / numRanks;
// 		let barsToFill = numBars * rankPercentage;
// 		const barMessage = [];
// 		for (let i = 0; i < numBars; i++) {
// 			let bar = null;
// 			// determine bar position
// 			if (i === 0) {
// 				bar = 'leftEnd';
// 			} else if (i === 5) {
// 				bar = 'rightEnd';
// 			} else {
// 				bar = 'middle';
// 			}
// 			// determine bar fill
// 			if (barsToFill > 0.9) {
// 			// was if (barsToFill > 1) {
// 				bar += 'Full';
// 			} else if (barsToFill > 0 && i != 0) {
// 			// should be > 0 but there is no leftEndEmpty Emoji
// 				bar += 'Half';
// 			} else {
// 				bar += 'Empty';
// 			}
// 			barMessage.push(bars[bar]);
// 			barsToFill--;
// 		}
// 		return barMessage.join('');
// 	}
// 	private romanize(num: number) {
// 		if (isNaN(num)) return NaN;
// 		const digits = String(+num).split('');
// 		const key = [
// 			'',
// 			'C',
// 			'CC',
// 			'CCC',
// 			'CD',
// 			'D',
// 			'DC',
// 			'DCC',
// 			'DCCC',
// 			'CM',
// 			'',
// 			'X',
// 			'XX',
// 			'XXX',
// 			'XL',
// 			'L',
// 			'LX',
// 			'LXX',
// 			'LXXX',
// 			'XC',
// 			'',
// 			'I',
// 			'II',
// 			'III',
// 			'IV',
// 			'V',
// 			'VI',
// 			'VII',
// 			'VIII',
// 			'IX',
// 		];
// 		let roman = '';
// 		let i = 3;
// 		while (i--) roman = (digits.length ? key[+digits.pop()! + i * 10] : '') + roman;
// 		return Array(+digits.join('') + 1).join('M') + roman;
// 	}

// 	private getUserData(experienceDatabase: IUserExperience, guild?: Guild): IExperienceUserData {
// 		return {
// 			displayName: guild?.members.resolve(experienceDatabase._id)?.displayName || 'REDACTED',
// 			id: experienceDatabase._id,
// 			rank: this.client.settings.lighthouse.ranks[
// 				experienceDatabase.level >= this.client.settings.lighthouse.ranks.length ? 
// 					this.client.settings.lighthouse.ranks.length - 1 : 
// 					experienceDatabase.level
// 			],
// 			databaseData: experienceDatabase
// 		};
// 	}
// }
// interface IExperienceUserData {
// 	displayName: string;
// 	id: string;
// 	rank: IRankData;
// 	databaseData: IUserExperience;
// }
// interface IUserExperience {
// 	_id: string;
// 	xp: number;
// 	level: number;
// 	reset: number;
// 	medals: {
// 		[medalName: string]: {

// 		}
// 	}
// }
// interface IUserRankData {
// 	emoji: IRankData["emoji"]
// }