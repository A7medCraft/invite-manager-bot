import { Message } from 'eris';

import { IMClient } from '../../../client';
import { NumberResolver, StringResolver } from '../../../resolvers';
import { CommandGroup, ModerationCommand } from '../../../types';
import { to } from '../../../util';
import { Command, Context } from '../../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: ModerationCommand.cleanText,
			aliases: ['clean-text', 'clearText', 'clear-text'],
			args: [
				{
					name: 'text',
					resolver: StringResolver,
					required: true
				},
				{
					name: 'numberOfMessages',
					resolver: NumberResolver
				}
			],
			group: CommandGroup.Moderation,
			strict: true,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		[text, numberOfMessages]: [string, number],
		flags: {},
		{ guild, t }: Context
	): Promise<any> {
		if (this.client.config.ownerGuildIds.indexOf(guild.id) === -1) {
			return;
		}

		const embed = this.createEmbed();

		if (numberOfMessages < 1) {
			return this.sendReply(message, t('cmd.clean.invalidQuantity'));
		}
		if (numberOfMessages === undefined) {
			numberOfMessages = 5;
		}

		const messages = await message.channel.getMessages(
			Math.min(numberOfMessages, 100),
			message.id
		);

		const searchStrings = text.split('+');
		const messagesToBeDeleted = messages.filter(msg => {
			return searchStrings.some(s => msg.content.includes(s));
		});

		messagesToBeDeleted.push(message);
		const [error] = await to(
			this.client.deleteMessages(
				message.channel.id,
				messagesToBeDeleted.map(m => m.id)
			)
		);

		if (error) {
			embed.title = t('cmd.clean.error');
			embed.description = error;
		} else {
			embed.title = t('cmd.clean.title');
			embed.description = t('cmd.clean.text', {
				amount: `**${messagesToBeDeleted.length}**`
			});
		}

		const response = await this.sendReply(message, embed);

		const func = () => {
			response.delete();
		};
		setTimeout(func, 5000);
	}
}
