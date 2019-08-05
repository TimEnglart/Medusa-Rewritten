import { CommandFile, CommandHelp, CommandRun, discord, ExtendedClient, Settings, Embeds, Utility } from '../ext/index';
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
			if (!message.member) return reject(new Error('No Member'));
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
					leaderBoardEmbed.addField(`${leaderBoardEntry.position}. ${guildMember ? guildMember.displayName : 'REDACTED'} ${currentRank.emoji} ${leaderBoardEntry.user_id === message.member.id ? ' \\◀' : ''}`,
						`${currentRank.name} - Reset: ${leaderBoardEntry.reset} - XP: ${leaderBoardEntry.xp}`);
				}
				await message.channel.send(leaderBoardEmbed);
				return resolve();
			} else if (args[0] === 'reset') {
				const userExperience = await discordBot.databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${message.member.id}`);
				if (userExperience.length && userExperience[0].level >= amountOfLevels) {
					const resetXp = 3000 * amountOfLevels;
					const currentReset = parseInt(userExperience[0].reset, 0);
					const currentXp = parseInt(userExperience[0].xp, 0);
					const newReset = currentReset + 1;
					const newXp = currentXp > resetXp ? currentXp - resetXp : 0;

					await discordBot.databaseClient.query(`UPDATE U_Experience SET reset = ${newReset}, xp = ${newXp}, level = 1 WHERE user_id = ${message.member.id}`);
					await message.channel.send(Embeds.successEmbed('Your Light Grows Brighter Guardian!', `Your Rank has been reset back to ${ranks[0].name} ${ranks[0].emoji}.\nNumber of Resets: ${newReset}`));
				}
				else {
					await message.channel.send(Embeds.errorEmbed('Insufficient Rank', `You need to be of **${ranks[ranks.length - 1].name}** Rank before you can Reset.`));
				}
				return resolve();
			} else if (args[0]) {
				user = Utility.LookupMember(message, args.join(' '));
			} else {
				user = message.member;
			}
			if (!user) {
				await message.channel.send(Embeds.errorEmbed('Error Locating User', `I was unable to find the user ${args.join(' ')} in the Server`));
				return resolve();
			}
			let score = 'registration required';
			// Get Destiny Data From Database
			const destinyProfilesData = await discordBot.databaseClient.query(`SELECT * FROM U_Destiny_Profile WHERE bungie_id = (SELECT bungie_id FROM U_Bungie_Account WHERE user_id = ${user.id});`);
			if (!destinyProfilesData.length) {
				//await message.reply('No Account'); // Change When Done to just skip
				//return resolve();
			}
			else {
				const destinyProfiles = await destiny.DestinyPlayer.lookup({
					membershipId: destinyProfilesData[0].destiny_id || undefined,
					// displayName: Utility.,
					membershipType: destinyProfilesData[0].membership_id
				}, ['100', '900']);
				score = destinyProfiles[0].data.profileRecords.data.score;
			}

			const userExperience = await discordBot.databaseClient.query(`SELECT * FROM U_Experience WHERE user_id = ${message.member.id}`);
			if (!userExperience) return resolve();
			const currentLevel = userExperience[0].level;
			const currentExperience = userExperience[0].xp;
			const currentReset = userExperience[0].reset;
			const currentRank = ranks[userExperience[0].level >= amountOfLevels ? amountOfLevels - 1 : userExperience[0].level];
			const experienceRequiredForNextLevel = currentLevel * 3000;
			const experienceDifference = experienceRequiredForNextLevel - currentExperience;
			const xpBar = levelBar(currentExperience, experienceRequiredForNextLevel);
			const rankBar = levelBar(currentLevel, amountOfLevels);
			const romanReset = romanize(currentReset) as string;
			const leaderBoardRank = await discordBot.databaseClient.query(`SELECT * FROM (SELECT *, ROW_NUMBER() OVER (ORDER BY reset DESC, xp DESC) as position FROM U_Experience WHERE connected = true) as positions WHERE user_id = ${user.id} ORDER BY reset DESC, xp DESC`);

			const guardianEmbed = new discord.MessageEmbed()
				.setTitle(`${user.displayName} #${leaderBoardRank[0].position}`)
				// .setDescription(`${destinyProfiles[0].parsedData.profile.data.userInfo.displayName}`)
				.setFooter(`${experienceDifference} XP Until Next Level Up ${currentLevel === amountOfLevels ? '| Consider Resetting... (use `guardian reset`)' : ''}`)
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
				if (key === 'Locked') continue;
				const firstEntry = value[0];
				const categoryDB = await discordBot.databaseClient.query(`SELECT * FROM ${firstEntry.dbData.table} WHERE user_id = ${user.id}`);
				const medals = value.map(x => { if (categoryDB[0][x.dbData.column]) return x.emoji; else { if (!x.limited) return categorisedMedals['Locked'][0].emoji; else return ''; } }).filter(x => x !== '');
				if (medals.length) guardianEmbed.addField(`${key}`, `${fixEmbed(medals).join(' ')}`, true);
			}
			await message.channel.send(guardianEmbed);
			return resolve();
		} catch (e) {
			return reject(e);
		}
	});
};

const help: CommandHelp = {
	description: 'Displays Guardian profiles including current Rank, XP, number of Resets and Medals.',
	environments: ['text', 'dm'],
	example: 'guardian \'Medusa@6621\'',
	expectedArgs: [{ name: 'query', optional: true }],
	name: 'guardian',
	permissionRequired: 'SEND_MESSAGES', // Change nulls to 'SEND_MESSAGES'
	usage: 'guardian [rank | reset | @User]'
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
		} else if (barsToFill > 0) {
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