
import * as discord from 'discord.js';
import { createHash, Hash } from 'crypto';
import { Stream } from 'stream';
import { get } from 'https';
class AntiRepost {
	public hashType: string;
	public outputText: string;
	constructor(public channelToWatch: discord.TextChannel) {
		this.hashType = 'sha3';
		this.outputText = 'hex';
	}
	public async checkMessage(message: discord.Message): Promise<Hash[]> {
		const hashes: Hash[] = [];
		// Check Attachments
		if (message.attachments.size > 0) {
			// go through attachments
			for(const [snowflake, attachment] of message.attachments) {
				const hash = createHash(this.hashType);
				hash.setEncoding('hex');
				if (typeof attachment.attachment === 'string') {
					hash.write(attachment.attachment);
				}
				else if (attachment.attachment instanceof Buffer) {
					hash.write(attachment.attachment);
				}
				else if (attachment.attachment instanceof Stream) {
					attachment.attachment.pipe(hash);
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
		for(const link of message.content.split(' ')) {
			if (link.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/)) {
				const hash = createHash(this.hashType).setEncoding('hex');
				await new Promise((res, rej) => {
					if (link.match(/\.(jpg|jpeg|png|gif|bmp)$/ig)) {
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
				hashes.push(hash);
			}
		}
		return hashes;
	}
}