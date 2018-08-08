import {
	Command,
	CommandDecorators,
	Logger,
	logger,
	Message
} from '@yamdbf/core';
import moment from 'moment';

import { IMClient } from '../../client';
import { createEmbed, sendEmbed } from '../../functions/Messaging';
import { checkRoles } from '../../middleware/CheckRoles';
import { premiumSubscriptions, sequelize } from '../../sequelize';
import { SettingsCache } from '../../storage/SettingsCache';
import { BotCommand, CommandGroup } from '../../types';

const { using } = CommandDecorators;

export default class extends Command<IMClient> {
	@logger('Command') private readonly _logger: Logger;

	public constructor() {
		super({
			name: 'premium',
			aliases: ['patreon', 'donate'],
			desc: 'Info about premium version.',
			usage: '<prefix>premium',
			group: CommandGroup.Premium,
			guildOnly: true
		});
	}

	@using(checkRoles(BotCommand.premium))
	public async action(message: Message, args: string[]): Promise<any> {
		this._logger.log(
			`${message.guild.name} (${message.author.username}): ${message.content}`
		);

		// TODO: Create list of premium features (also useful for FAQ)

		const embed = createEmbed(this.client);

		const isPremium = await SettingsCache.isPremium(message.guild.id);

		if (!isPremium) {
			embed.setTitle('This server currently does not have a premium subscription');

			let description = '';
			description +=
				'By subscribing to a premium tier you help the development of the bot';
			description += ' and also get some additional features.';

			embed.setDescription(description);

			embed.addField(
				'Premium Feature: Embeds in join messages',
				'You can use an embed in your join and leave messages which look a lot better. ' +
				'[See some examples here](https://docs.invitemanager.co/bot/custom-messages/join-message-examples)'
			);

			embed.addField(
				'Premium Feature: History export',
				'You can export all the joins and leaves that happened on your server since you invited our bot.'
			);
		} else {
			const sub = await premiumSubscriptions.findOne({
				where: {
					guildId: message.guild.id,
					validUntil: {
						[sequelize.Op.gte]: new Date()
					}
				},
				raw: true
			});

			embed.setTitle('InviteManager Premium');

			let description = '';
			if (sub) {
				const date = moment(sub.validUntil).fromNow(true);
				description += `This servers subscription is valid for another ${date}`;
				description += `\n\n[What can I do with premium?](https://docs.invitemanager.co/bot/premium/extra-features)`;
			} else {
				description += `Could not find subscription info.`;
			}
			embed.setDescription(description);
		}

		sendEmbed(message.channel, embed, message.author);
	}
}