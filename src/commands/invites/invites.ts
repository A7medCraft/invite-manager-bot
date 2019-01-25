import { Message } from 'eris';

import { IMClient } from '../../client';
import { BasicUser, UserResolver } from '../../resolvers';
import { BotCommand, CommandGroup } from '../../types';
import { promoteIfQualified } from '../../util';
import { Command, Context } from '../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.invites,
			aliases: ['invite', 'rank'],
			args: [
				{
					name: 'user',
					resolver: UserResolver
				}
			],
			group: CommandGroup.Invites,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		[user]: [BasicUser],
		flags: {},
		{ guild, t, me }: Context
	): Promise<any> {
		const target = user
			? user
			: await this.repo.members
					.findOne({ where: { id: message.author.id } })
					.then(u => ({ ...u, username: u.name }));
		const invites = await this.client.invs.getInviteCounts(guild.id, target.id);

		let textMessage = '';
		if (target.id === message.author.id) {
			textMessage = t('cmd.invites.amount.self', {
				total: `**${invites.total}**`,
				regular: `**${invites.regular}**`,
				custom: `**${invites.custom}**`,
				fake: `**${invites.fake}**`,
				leave: `**${invites.leave}**`
			});
		} else {
			textMessage = t('cmd.invites.amount.other', {
				target: `<@${target.id}>`,
				total: `**${invites.total}**`,
				regular: `**${invites.regular}**`,
				custom: `**${invites.custom}**`,
				fake: `**${invites.fake}**`,
				leave: `**${invites.leave}**`
			});
		}
		textMessage += '\n';

		let targetMember = guild.members.get(target.id);
		if (!targetMember) {
			targetMember = await guild
				.getRESTMember(target.id)
				.catch(() => undefined);
		}
		// Only process if the user is still in the guild
		if (targetMember && !targetMember.bot) {
			const promoteInfo = await promoteIfQualified(
				this.client,
				guild,
				targetMember,
				me,
				invites.total
			);

			if (promoteInfo) {
				const { nextRank, shouldHave, shouldNotHave, dangerous } = promoteInfo;

				if (nextRank) {
					if (message.author.id === target.id) {
						textMessage += t('cmd.invites.highestRank.self');
					} else {
						textMessage += t('cmd.invites.highestRank.other', {
							target: `<@${target.id}>`
						});
					}
					textMessage += '\n';
				}

				if (shouldHave.length > 0) {
					textMessage +=
						'\n\n' +
						t('roles.shouldHave', {
							shouldHave: shouldHave.map(r => `<@&${r.id}>`).join(', ')
						});
				}
				if (shouldNotHave.length > 0) {
					textMessage +=
						'\n\n' +
						t('roles.shouldNotHave', {
							shouldNotHave: shouldNotHave.map(r => `<@&${r.id}>`).join(', ')
						});
				}
				if (dangerous.length > 0) {
					textMessage +=
						'\n\n' +
						t('roles.dangerous', {
							dangerous: dangerous.map(r => `<@&${r.id}>`).join(', ')
						});
				}
			}
		}

		const embed = this.createEmbed({
			title: target.username,
			description: textMessage
		});

		return this.sendReply(message, embed);
	}
}
