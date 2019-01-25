import { Message } from 'eris';

import { IMClient } from '../../../client';
import { BasicUser, StringResolver, UserResolver } from '../../../resolvers';
import { CommandGroup, ModerationCommand, Permissions } from '../../../types';
import { to } from '../../../util';
import { Command, Context } from '../../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: ModerationCommand.unban,
			aliases: [],
			args: [
				{
					name: 'user',
					resolver: UserResolver,
					required: true
				},
				{
					name: 'reason',
					resolver: StringResolver,
					rest: true
				}
			],
			group: CommandGroup.Moderation,
			strict: true,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		[targetUser, reason]: [BasicUser, string],
		flags: {},
		{ guild, me, settings, t }: Context
	): Promise<any> {
		if (this.client.config.ownerGuildIds.indexOf(guild.id) === -1) {
			return;
		}

		const embed = this.client.mod.createPunishmentEmbed(
			targetUser.username,
			targetUser.avatarURL
		);

		if (!me.permission.has(Permissions.BAN_MEMBERS)) {
			embed.description = t('cmd.unban.missingPermissions');
		} else {
			const [error] = await to(guild.unbanMember(targetUser.id, reason));

			if (error) {
				embed.description = t('cmd.unban.error', { error });
			} else {
				const logEmbed = this.client.mod.createPunishmentEmbed(
					targetUser.username,
					targetUser.avatarURL
				);

				const usr =
					`${targetUser.username}#${targetUser.discriminator} ` +
					`(ID: ${targetUser.id})`;
				logEmbed.description += `**User**: ${usr}\n`;
				logEmbed.description += `**Action**: unban\n`;

				logEmbed.fields.push(
					{
						name: 'Mod',
						value: `<@${message.author.id}>`
					},
					{
						name: 'Reason',
						value: reason
					}
				);
				this.client.logModAction(guild, logEmbed);

				embed.description = t('cmd.unban.done');
			}
		}

		const response = (await this.sendReply(message, embed)) as Message;

		if (settings.modPunishmentBanDeleteMessage) {
			const func = () => {
				message.delete();
				response.delete();
			};
			setTimeout(func, 4000);
		}
	}
}
