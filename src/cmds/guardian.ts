import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Settings, Embeds, Utility, LogFilter, CommandError } from '../ext/index';
import * as expHandler from '../ext/experienceHandler';
import * as destiny from '../ext/discordToBungie';

// Only Reject Promise if a Real Error Occurs
// run Function is pretty convoluted


const run: CommandRun = (discordBot: ExtendedClient, message: discord.Message, args: string[]) => {
	return new Promise(async (resolve: () => void, reject: (err: Error) => void) => {
		try {
			const fixEmbed = (array: string[], index = 4) => {
				if (array.length > index) {
					array.splice(index, 0, '\n');
					fixEmbed(array, index + 5);
				}
				return array;
			};
			if (!message.author) throw new CommandError('NO_AUTHOR'); 	// If Author is Needed
			if (!message.member) throw new CommandError('NO_MEMBER');	// If Member is Needed
			if (!message.guild) throw new CommandError('NO_GUILD'); 		// If Guild is Needed
			if (!discordBot.user) throw new CommandError('NO_BOT_USER'); 	// If Bot Instance is Needed
			if (!message.guild) {
				await message.reply('CAN ONLY BE USED IN LIGHTHOUSE DISCORD AT THIS MOMENT');
				return resolve();
			}
			let user: discord.User | discord.GuildMember | null;
			const ranks = discordBot.settings.lighthouse.ranks;
			const amountOfLevels = ranks.length;
			if (args[0] === 'rank') {
				const leaderBoard = await discordBot.databaseClient.query(`SELECT * FROM( SELECT * FROM (SELECT * FROM U_Experience ORDER BY reset DESC, level DESC LIMIT 0, 11) as top UNION SELECT * FROM U_Experience WHERE user_id = '${message.member.id}') as top_ten JOIN (SELECT user_id, ROW_NUMBER() OVER (ORDER BY reset DESC, xp DESC) as position FROM U_Experience WHERE connected = true) as positions ON positions.user_id = top_ten.user_id ORDER BY position ASC;`);
				const leaderBoardEmbed = new discord.MessageEmbed()
					.setTitle('Top 10 Guardians')
					.setThumbnail(message.guild.iconURL() || '')
					.setColor('#ff8827');
				for (const leaderBoardEntry of leaderBoard) {
					const guildMember = message.guild.members.get(leaderBoardEntry.user_id);
					const currentRank = ranks[leaderBoardEntry.level >= amountOfLevels ? amountOfLevels - 1 : leaderBoardEntry.level];
					leaderBoardEmbed.addField(`${leaderBoardEntry.position}. ${guildMember ? guildMember.displayName : 'REDACTED'} ${currentRank.emoji.text} ${leaderBoardEntry.user_id === message.member.id ? ' \\◀' : ''}`,
						`${currentRank.name} - Reset: ${leaderBoardEntry.reset} - XP: ${leaderBoardEntry.xp}`);
				}
				await message.channel.send(leaderBoardEmbed);
				return resolve();
			} else if (args[0] === 'reset') {
				const userExperience = await discordBot.databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${message.member.id}`);
				if (userExperience.length && userExperience[0].level >= amountOfLevels) {
					const resetXp = 3000 * amountOfLevels;
					const currentReset = +userExperience[0].reset;
					const currentXp = +userExperience[0].xp;
					const newReset = currentReset + 1;
					const newXp = currentXp > resetXp ? currentXp - resetXp : 0;

					await discordBot.databaseClient.query(`UPDATE U_Experience SET reset = ${newReset}, xp = ${newXp}, level = 1 WHERE user_id = ${message.member.id}`);
					await message.channel.send(Embeds.successEmbed('Your Light Grows Brighter Guardian!', `Your Rank has been reset back to ${ranks[0].name} ${ranks[0].emoji.text}.\nNumber of Resets: ${newReset}`));
				}
				else {
					await message.channel.send(Embeds.errorEmbed('Insufficient Rank', `You need to be of **${ranks[ranks.length - 1].name}** Rank before you can Reset.`));
				}
				return resolve();
			} else if (args[0]) {
				discordBot.logger.logClient.log(`Guradian Command: Looking uP Member: ${args.join(' ')}`, LogFilter.Debug)
				user = Utility.LookupMember(message.guild, args.join(' '));
			} else {
				user = message.member;
			}
			if (!user) {
				await message.channel.send(Embeds.errorEmbed('Error Locating User', `I was unable to find the user ${args.join(' ')} in the Server`));
				return resolve();
			}
			let score: string | number = 'registration required';
			const destinyProfiles: {
				[key: string]: destiny.DestinyPlayer
			} = {};
			// Get Destiny Data From Database
			const destinyProfilesData = await discordBot.databaseClient.query(`SELECT * FROM U_Destiny_Profile WHERE bungie_id = (SELECT bungie_id FROM U_Bungie_Account WHERE user_id = ${user.id});`);
			if (!destinyProfilesData.length) {
				//await message.reply('No Account'); // Change When Done to just skip
				//return resolve();
			}
			else {
				// if (destinyProfilesData.length === 1 && destinyProfilesData[0].membership_id === 4) {
				// 	score = `Zoinks is that a Bnet Account Linked to Your Discord Account.\nUse the \`register\` Command to Link Another Platform`;
				// }
				//else {
				for (const profile of destinyProfilesData) {
					const lookupResults = await destiny.DestinyPlayer.lookup({
						membershipId: profile.destiny_id || undefined,
						// displayName: Utility.,
						membershipType: profile.membership_id
					}, ['100', '900']);
					for (const result of lookupResults) { // Should be index 0 bc of the search using ids
						destinyProfiles[result.parsedData.profile.data.userInfo.membershipType] = result;
						if (+result.data.profileRecords.data.score > +score || isNaN(+score)) score = +result.data.profileRecords.data.score;
					}
				}
			//}
			}

			const userExperience = await discordBot.databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${user.id}`);
			if (!userExperience) return resolve();
			const currentLevel = +userExperience[0].level;
			const currentLevelArray = currentLevel - 1;
			const currentExperience = +userExperience[0].xp;
			const currentReset = +userExperience[0].reset;
			const currentRank = ranks[currentLevel >= amountOfLevels ? amountOfLevels - 1 : currentLevelArray];
			const experienceRequiredForNextLevel = currentLevel * 3000;
			const experienceDifference = experienceRequiredForNextLevel - currentExperience;
			const xpBar = levelBar(currentExperience, experienceRequiredForNextLevel);
			const rankBar = levelBar(currentLevelArray, amountOfLevels);
			const romanReset = romanize(currentReset) as string;
			const leaderBoardRank = await discordBot.databaseClient.query(`SELECT * FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY reset DESC, xp DESC) as position FROM U_Experience WHERE connected = true) as positions WHERE user_id = ${user.id} ORDER BY reset DESC, xp DESC`);

			const guardianEmbed = new discord.MessageEmbed()
				.setTitle(`${user.displayName} #${leaderBoardRank[0].position}`)
				// .setDescription(`${destinyProfiles[0].parsedData.profile.data.userInfo.displayName}`)
				.setFooter(`${experienceDifference} XP Until Next Level Up ${currentLevel >= amountOfLevels ? '| Consider Resetting... (use `guardian reset`)' : ''}`)
				.setThumbnail(`${currentRank.icon}`)
				// .setImage(`${currentRank.icon}`)
				.setColor(`#4287f5`)

				// Add Fields
				.addField(`Triumph Score`, `${score}\n**_**`) // Triumph Score
				.addField(`${currentExperience} / ${experienceRequiredForNextLevel} XP`, `${xpBar}\n**_**`, true) // Xp Bar
				.addField(`${currentRank.name} ${romanReset.length > 5 ? currentReset : romanReset}`, `${rankBar}\n**_**`, true) // Level Bar
				;
			// For Loop for medals
			const categorisedMedals = expHandler.categoriseMedals();
			for (const [key, value] of Object.entries(categorisedMedals)) {
				const firstEntry = value[0];
				if (key === 'Locked' || !firstEntry) continue;
				const categoryDB = await discordBot.databaseClient.query(`SELECT * FROM ${firstEntry.dbData.table} WHERE user_id = ${user.id}`);
				if (!categoryDB.length) {
					await discordBot.databaseClient.query(`INSERT INTO ${firstEntry.dbData.table} (user_id) VALUES (${user.id})`);
					continue;
				}
				const medals = value.map(x => { if (categoryDB[0][x.dbData.column]) return x.emoji; else { if (!x.limited) return categorisedMedals['Locked'][0].emoji; else return ''; } }).filter(x => x !== '');
				if (medals.length) guardianEmbed.addField(`${key}`, `${fixEmbed(medals).join(' ')}`, true);
			}
			const guardianMessage = await message.channel.send(guardianEmbed);
			
			return resolve();
			for (const membershipType in destinyProfiles) {
				if (!membershipType) continue;
				await discordBot.logger.logClient.log(JSON.stringify(membershipType), 1);
				await discordBot.logger.logClient.log(JSON.stringify(destinyProfiles[membershipType].data.profileRecords.data.score), 2);
				// if (membershipType === '4') continue;
				// await guardianMessage.react(membershipType);
			}
			await guardianMessage.awaitReactions((reaction, user) => {
				if (destinyProfiles[reaction.emoji.name] && user.id === message.author!.id) {
					// Would Update
				}
				return false;
			}, {time: 300000});

			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Displays Guardian profiles including current Rank, XP, number of Resets and Medals.',
	environments: ['text', 'dm'],
	example: 'guardian \'@Medusa#6621\'',
	expectedArgs: [{ name: 'query', optional: true, example: '@User#12345 | reset | rank' }],
	name: 'guardian',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
};

module.exports = {
	help,
	run
} as CommandFile;

function levelBar(currRank: number, numRanks: number) {
	const numBars = 6;
	const bars: any = {
		leftEndFull: '<:Left_End_Full:530375114408067072>',
		leftEndHalf: '<:Left_End_Half:530375043704946693>',
		leftEndEmpty: 'reee',
		middleFull: '<:Middle_Full:530375192342429736>',
		middleHalf: '<:Middle_Half:530375180195856385>',
		middleEmpty: '<:Middle_Empty:530375162806140928>',
		rightEndFull: '<:Right_End_Full:530375277105381387>',
		rightEndHalf: '<:Right_End_Half:530375267626254346>',
		rightEndEmpty: '<:Right_End_Empty:530375232041779210>'
	};
	const rankPercentage = currRank / numRanks;
	let barsToFill = numBars * rankPercentage;
	const barMessage = [];
	for (let i = 0; i < numBars; i++) {
		let bar = null;
		//determine bar position
		if (i === 0) {
			bar = 'leftEnd';
		} else if (i === 5) {
			bar = 'rightEnd';
		} else {
			bar = 'middle';
		}
		//determine bar fill
		if (barsToFill > 0.9) { // was if (barsToFill > 1) {
			bar += 'Full';
		} else if (barsToFill >= 0) { // should be > 0 but there is no leftEndEmpty Emoji
			bar += 'Half';
		} else {
			bar += 'Empty';
		}
		barMessage.push(bars[bar]);
		barsToFill--;
	}
	return barMessage.join('');
}
function romanize(num: number) {
	if (isNaN(num)) return NaN;
	const digits = String(+num).split('');
	const key = [
		'',
		'C',
		'CC',
		'CCC',
		'CD',
		'D',
		'DC',
		'DCC',
		'DCCC',
		'CM',
		'',
		'X',
		'XX',
		'XXX',
		'XL',
		'L',
		'LX',
		'LXX',
		'LXXX',
		'XC',
		'',
		'I',
		'II',
		'III',
		'IV',
		'V',
		'VI',
		'VII',
		'VIII',
		'IX'
	];
	let roman = '';
	let i = 3;
	while (i--) roman = (key[+digits.pop()! + i * 10] || '') + roman;
	return Array(+digits.join('') + 1).join('M') + roman;
}