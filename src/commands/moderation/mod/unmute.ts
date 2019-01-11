import { Member, Message } from 'eris';

import { IMClient } from '../../../client';
import { MemberResolver } from '../../../resolvers';
import { CommandGroup, ModerationCommand } from '../../../types';
import { isPunishable, to } from '../../../util';
import { Command, Context } from '../../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: ModerationCommand.unmute,
			aliases: [],
			args: [
				{
					name: 'user',
					resolver: MemberResolver,
					required: true
				}
			],
			group: CommandGroup.Moderation,
			strict: true,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		[targetMember]: [Member],
		flags: {},
		{ guild, me, settings, t }: Context
	): Promise<any> {
		if (this.client.config.ownerGuildIds.indexOf(guild.id) === -1) {
			return;
		}

		const embed = this.client.mod.createPunishmentEmbed(
			targetMember.username,
			targetMember.avatarURL
		);

		const mutedRole = settings.mutedRole;

		if (!mutedRole || !guild.roles.has(mutedRole)) {
			embed.description = t('cmd.unmute.missingRole');
		} else if (isPunishable(guild, targetMember, message.member, me)) {
			const [error] = await to(targetMember.removeRole(mutedRole));

			if (error) {
				embed.description = t('cmd.unmute.error', { error });
			} else {
				const logEmbed = this.client.mod.createPunishmentEmbed(
					targetMember.username,
					targetMember.avatarURL
				);

				const usr =
					`${targetMember.username}#${targetMember.discriminator} ` +
					`(ID: ${targetMember.id})`;
				logEmbed.description += `**User**: ${usr}\n`;
				logEmbed.description += `**Action**: unmute\n`;

				logEmbed.fields.push({
					name: 'Mod',
					value: `<@${message.author.id}>`
				});
				this.client.logModAction(guild, logEmbed);

				embed.description = t('cmd.unmute.done');
			}
		} else {
			embed.description = t('cmd.unmute.canNotUnmute');
		}

		const response = await this.sendReply(message, embed);

		if (settings.modPunishmentMuteDeleteMessage) {
			const func = () => {
				message.delete();
				response.delete();
			};
			setTimeout(func, 4000);
		}
	}
}
