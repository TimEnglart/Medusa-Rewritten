import { discord, ExtendedClient } from '.';

class Utility {
	/**
	 * @returns {Promise<[]>}
	 */
	public static _parseMentions(mention: string, regex: RegExp) {
		const param = mention.match(regex);
		if (param) return param[1];
		if (!isNaN(+mention) && isFinite(+mention)) return mention;
		return null;
	}
	public static parseUserMentionToId(mention: string) {
		return this._parseMentions(mention, /^<@!?(\d+)>$/);
	}
	public static parseRoleMentionToId(mention: string) {
		return this._parseMentions(mention, /^<@&(\d+)>$/);
	}
	public static parseChannelMentionToId(mention: string) {
		return this._parseMentions(mention, /^<#(\d+)>$/);
	}
	/**
	 * Parses emoji info out of a string. The string must be one of:
	 * * A UTF-8 emoji (no ID)
	 * * A URL-encoded UTF-8 emoji (no ID)
	 * * A Discord custom emoji (`<:name:id>` or `<a:name:id>`)
	 * @param {string} mention Emoji string to parse
	 * @returns {Object} Object with `animated`, `name`, and `id` properties
	 */
	public static parseEmojiMentionToObject(mention: string) {
		if (mention.includes('%')) {
			mention = decodeURIComponent(mention);
		}
		if (!mention.includes(':')) {
			return {
				animated: false,
				name: mention,
				id: null
			};
		}
		const m = mention.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
		if (!m) return null;
		return {
			animated: Boolean(m[1]),
			name: m[2],
			id: m[3]
		};
	}

	/**
	 * Attempts to Remove Spaces From Quoted Words
	 * @param {Array<string>} originalArray Array to Modify
	 * @returns {Array<string>} New Corrected Array
	 */
	public static parseSpacesV2(array: string[]) {
		let quoteCount = 0;
		const newArray: string[] = [];
		let tempString = '';
		const finishWord = () => {
			newArray.push(tempString);
			tempString = '';
			quoteCount = 0;
		};
		for (let i = 0; i < array.length; i++) {
			let myString = array[i];
			if (myString.indexOf('"') > -1) {
				quoteCount += (myString.match(/"/g) || []).length;
				myString = myString.replace('"', '');
			}
			tempString += (quoteCount > 0 && tempString ? ' ' : '') + myString;
			if (quoteCount === 2) {
				finishWord();
			}
			if (quoteCount === 0 && tempString) {
				finishWord();
			}
		}
		return newArray;
	}

	// console.log(ParseSpacesV2(["sdsada", "\"sadadada", "ddasdasda", "dada6723", "adasd\"sadadd"]))

	public static parseSpacedArguments(array: string[], expectedIndex: number, numberOfArgsAfter: number | string) {
		if (numberOfArgsAfter === '?') {
			const doubleQuotedWord = array
				.join(' ')
				.split('"', 2)
				.join('"')
				.replace('"', '');
			return [doubleQuotedWord].concat(
				array.slice(doubleQuotedWord.split(' ').length)
			);
		}
		const numericArgs = Number(numberOfArgsAfter);
		if (!isNaN(numericArgs)) {
			const quotedString = array.slice(
				expectedIndex,
				array.length - numericArgs
			);
			const remainingArgs = array.filter(
				item =>
					!quotedString.includes(item) && array.indexOf(item) > expectedIndex
			);
			const newArgs = array.slice(0, expectedIndex);
			const possibleWord = quotedString.join(' ');
			const hasQuotes = possibleWord.match(/^"(.*?)"$/);
			newArgs.push(hasQuotes ? hasQuotes[1] : possibleWord);
			return newArgs.concat(remainingArgs);
		}

	}

	// Database Stuff
	public static parseArrayToSQLArrayString(array: string[]) {
		return JSON.stringify(array)
			.replace('[', '\'{')
			.replace(']', '}\'');
	}

	public static getUser(message: discord.Message, typePref: 'MEMBER' | 'USER' | null): discord.User | discord.GuildMember | null {
		if (message.guild && typePref === 'MEMBER') return message.member;
		if (message.author && typePref === 'USER') return message.author;
		if (typePref) throw new Error('Unable to Find User or Member');
		return message.author || message.member || null;
	}
	public static LookupMember(guild: discord.Guild | null, userData: string, destinyInGameName?: boolean): discord.GuildMember | null {
		if (!guild) throw new Error('Message Not Sent From Guild');
		const userId = this.parseUserMentionToId(userData);
		if (userId) return guild.member(userId); // Was a Mention
		if (!isNaN(+userData) && isFinite(+userData)) return guild.member(userData); // Was a Direct Id
		userData = this.quotedWords(userData)[0];
		console.log("Lookup Member [UserData]: " + userData);
		let nameLookup;
		if (destinyInGameName) nameLookup = guild.members.find(member => (!!member.displayName && member.displayName.split('#')[0].toLowerCase() === userData.toLowerCase()) || (!!member.nickname && member.nickname.split('#')[0].toLowerCase() === userData.toLowerCase()));
		else nameLookup = guild.members.find(member => (!!member.displayName && member.displayName.toLowerCase() === userData.toLowerCase()) || (!!member.nickname && member.nickname.toLowerCase() === userData.toLowerCase()));
		console.log("Lookup Member [nameLookup]: " + nameLookup);
		if (nameLookup) return nameLookup; // was plain text Name
		return null;
	}
	public static LookupRole(guild: discord.Guild, roleData: string): discord.Role | null {
		if (!guild) throw new Error('Message Not Sent From Guild');
		const userId = this.parseRoleMentionToId(roleData);
		if (userId) return guild.roles.get(roleData) || null; // Was a Mention
		if (!isNaN(+roleData) && isFinite(+roleData)) return guild.roles.get(roleData) || null; // Was a Direct Id
		const roleLookup = guild.roles.find(role => role.name.toLowerCase() === roleData.toLowerCase());
		if (roleLookup) return roleLookup; // was plain text Name
		return null;
	}
	public static LookupChannel(message: discord.Message, channelData: string): discord.GuildChannel | null {
		if (!message.guild) throw new Error('Message Not Sent From Guild');
		const userId = this.parseChannelMentionToId(channelData);
		if (userId) return message.guild.channels.get(channelData) || null; // Was a Mention
		if (!isNaN(+channelData) && isFinite(+channelData)) return message.guild.channels.get(channelData) || null; // Was a Direct Id
		const roleLookup = message.guild.channels.find(channel => channel.name.toLowerCase() === channelData.toLowerCase());
		if (roleLookup) return roleLookup; // was plain text Name
		return null;
	}
	public static quotedWords(quotedString: string) {
		const pattern = /(\w|\s)*\w(?=")|\w+/g;
		const matches = [];
		let match;
		do {
			match = pattern.exec(quotedString);
			if (match) matches.push(match[0]);
		} while (match);
		return matches;
	}
}

export { Utility };