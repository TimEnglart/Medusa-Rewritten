
import * as discord from 'discord.js';
import { createHash, Hash } from 'crypto';
import { Stream } from 'stream';
import { get } from 'https';
import { ExtendedClient } from '.';
import * as fs from 'fs';

type HashData = {
	hash: Hash;
	data: Buffer; // Maybe Later
};
class AntiRepost {
	public hashType: string;
	public outputText: string;
	constructor(public channelToWatch: string) {
		this.hashType = 'sha512';
		this.outputText = 'hex';
	}

	public async checkMessage(message: discord.Message): Promise<Hash[]> {
		const hashes: Hash[] = [];
		// Check Attachments
		fs.appendFileSync('message content', message.content);
		if (message.attachments.size > 0) {
			// go through attachments
			for(const [snowflake, attachment] of message.attachments) {
				const hash = createHash(this.hashType);
				hash.setEncoding('hex');
				if (typeof attachment.attachment === 'string') { // returns cdn link
					const hashedLink = await this.HashLink(attachment.attachment);
					if (hashedLink) hashes.push(hashedLink);
				}
				else if (attachment.attachment instanceof Buffer) {
					hash.write(attachment.attachment);
				}
				else if (attachment.attachment instanceof Stream) {
					await new Promise((res, rej) => {
						(attachment.attachment as Stream).on('finish', () => {
							return res();
						});
					});
				}
				hash.end();
				hashes.push(hash);
			}
		}
		for (const link of message.content.split(/ +/g)) {
			const hashedLink = await this.HashLink(link);
			if (hashedLink) hashes.push(hashedLink);
		}
		return hashes;
	}

	public async run(message: discord.Message) {
		if (message.channel.id !== this.channelToWatch) {
			return;
		}
		const memeHashes = await this.checkMessage(message);
		const client = message.client as ExtendedClient;
		for (const hash of memeHashes) {
			const hex = hash.read();
			const query = await client.databaseClient.query(`SELECT * FROM C_Meme_Lookup WHERE hash = '${hex}';`);
			if (query.length > 0) {
				await message.reply('That was a Possible Repost');
				return;
			}
			await client.databaseClient.query(`INSERT INTO C_Meme_Lookup (hash, data) VALUES ('${hex}', NULL);`);
		}
	}

	private async HashLink(link: string) {
		if (link.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/)) {
			const hash = createHash(this.hashType).setEncoding('hex');
			await new Promise((res, rej) => {
				if (link.match(/\.(jpg|jpeg|png|gif|bmp)$/ig)) {
					get(link, (resp) => {
						// A chunk of data has been recieved.
						resp.on('data', (chunk) => {
							fs.appendFileSync('linkdata', chunk);
							hash.write(chunk);
						});
						// The whole response has been received. Print out the result.
						resp.on('end', () => {
							res();
						});
						}).on('error', (err) => {
							res();
						});
				}
				else if (link.match(/\.(mp4|m4a|m4v|f4v|f4a|m4b|m4r|f4b|mov|3gp|ogg|oga|ogv|ogx|wmv|webm|flv|avi)$/ig)) {
					get(link, (resp) => {
						// A chunk of data has been recieved.
						resp.on('data', (chunk) => {
							hash.write(chunk);
						});
						// The whole response has been received. Print out the result.
						resp.on('end', () => {
							res();
						});
						}).on('error', (err) => {
							res();
						});
				}
			});
			hash.end();
			return hash;
		}
	}
}

export { AntiRepost };