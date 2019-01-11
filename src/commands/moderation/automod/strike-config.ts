import { Message } from 'eris';

import { IMClient } from '../../../client';

import { EnumResolver, NumberResolver } from '../../../resolvers';
import { CommandGroup, ModerationCommand, ViolationType } from '../../../types';
import { Command, Context } from '../../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: ModerationCommand.strikeConfig,
			aliases: ['strike-config'],
			args: [
				{
					name: 'violation',
					resolver: new EnumResolver(client, Object.values(ViolationType))
				},
				{
					name: 'strikes',
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
		[violation, strikes]: [ViolationType, number],
		flags: {},
		{ guild, t }: Context
	): Promise<any> {
		if (this.client.config.ownerGuildIds.indexOf(guild.id) === -1) {
			return;
		}

		const embed = this.createEmbed({
			title: t('cmd.strikeConfig.title')
		});

		const violationQuery = {
			guildId: guild.id,
			type: violation
		};

		if (typeof violation === typeof undefined) {
			const allViolations: ViolationType[] = Object.values(ViolationType);
			const strikeConfigList = await this.client.cache.strikes.get(guild.id);
			const unusedViolations = allViolations.filter(
				v => strikeConfigList.map(scl => scl.type).indexOf(v) < 0
			);
			embed.description = strikeConfigList
				.map(scl =>
					t('cmd.strikeConfig.text', {
						violation: `**${scl.type}**`,
						strikes: `**${scl.amount}**`
					})
				)
				.join('\n');
			embed.fields.push({
				name: t('cmd.strikeConfig.unusedViolations'),
				value: `\n${unusedViolations.map(v => `\`${v}\``).join(', ')}`
			});
		} else if (typeof strikes === typeof undefined) {
			const strike = await this.repo.strikeConfigs.findOne({
				where: violationQuery
			});
			embed.description = t('cmd.strikeConfig.text', {
				violation: `**${strike ? strike.type : violation}**`,
				strikes: `**${strike ? strike.amount : 0}**`
			});
		} else if (strikes === 0) {
			await this.repo.strikeConfigs.update(violationQuery, {
				deletedAt: new Date()
			});
			embed.description = t('cmd.strikeConfig.deletedText', {
				violation: `**${violation}**`
			});
		} else {
			// TODO: This used to be INSERT OR UPDATE
			await this.repo.strikeConfigs.save({
				amount: strikes,
				...violationQuery
			});
			embed.description = t('cmd.strikeConfig.text', {
				violation: `**${violation}**`,
				strikes: `**${strikes}**`
			});
			// TODO: expiration
		}

		this.client.cache.strikes.flush(guild.id);
		this.sendReply(message, embed);
	}
}
