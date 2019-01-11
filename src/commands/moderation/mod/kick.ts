import { Member, Message } from 'eris';

import { IMClient } from '../../../client';
import { MemberResolver, StringResolver } from '../../../resolvers';
import {
	CommandGroup,
	ModerationCommand,
	Permissions,
	PunishmentType
} from '../../../types';
import { isPunishable, to } from '../../../util';
import { Command, Context } from '../../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: ModerationCommand.kick,
			aliases: [],
			args: [
				{
					name: 'member',
					resolver: MemberResolver,
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
		[targetMember, reason]: [Member, string],
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

		if (!me.permission.has(Permissions.KICK_MEMBERS)) {
			embed.description = t('cmd.kick.missingPermissions');
		} else if (isPunishable(guild, targetMember, message.member, me)) {
			await this.client.mod.informAboutPunishment(
				targetMember,
				PunishmentType.kick,
				settings,
				{ reason }
			);

			const [error] = await to(targetMember.kick(reason));

			if (error) {
				embed.description = t('cmd.kick.error', { error });
			} else {
				const punishment = await this.repo.punishs.save({
					guildId: guild.id,
					memberId: targetMember.id,
					type: PunishmentType.kick,
					amount: 0,
					args: '',
					reason: reason,
					creatorId: message.author.id
				});

				this.client.mod.logPunishmentModAction(
					guild,
					targetMember.user,
					punishment.type,
					punishment.amount,
					[
						{ name: 'Mod', value: `<@${message.author.id}>` },
						{ name: 'Reason', value: reason }
					]
				);

				embed.description = t('cmd.kick.done');
			}
		} else {
			embed.description = t('cmd.kick.canNotKick');
		}

		const response = await this.sendReply(message, embed);

		if (settings.modPunishmentKickDeleteMessage) {
			const func = () => {
				message.delete();
				response.delete();
			};
			setTimeout(func, 4000);
		}
	}
}
