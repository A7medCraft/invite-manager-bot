import { Embed, Message, TextChannel } from 'eris';

import { IMClient } from '../../client';
import { CustomInvitesGeneratedReason } from '../../models/CustomInvite';
import { LogAction } from '../../models/Log';
import { SettingsKey } from '../../models/Setting';
import { EnumResolver, SettingsValueResolver } from '../../resolvers';
import { beautify, canClear, settingsInfo } from '../../settings';
import { BotCommand, CommandGroup, Permissions } from '../../types';
import { Command, Context } from '../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.config,
			aliases: ['c'],
			args: [
				{
					name: 'key',
					resolver: new EnumResolver(client, Object.values(SettingsKey))
				},
				{
					name: 'value',
					resolver: new SettingsValueResolver(client, settingsInfo),
					rest: true
				}
			],
			group: CommandGroup.Config,
			guildOnly: true,
			strict: true
		});
	}

	public async action(
		message: Message,
		[key, value]: [SettingsKey, any],
		flags: {},
		context: Context
	): Promise<any> {
		const { guild, settings, t } = context;
		const prefix = settings.prefix;
		const embed = this.createEmbed();

		if (!key) {
			embed.title = t('cmd.config.title');
			embed.description = t('cmd.config.text', { prefix }) + '\n\n';

			const configs: { [x: string]: string[] } = {};
			Object.keys(settingsInfo).forEach((k: SettingsKey) => {
				const info = settingsInfo[k];
				if (!configs[info.grouping[0]]) {
					configs[info.grouping[0]] = [];
				}
				configs[info.grouping[0]].push('`' + k + '`');
			});

			Object.keys(configs).forEach(group => {
				embed.description +=
					`**${group}**\n` + configs[group].join(', ') + '\n\n';
			});

			return this.sendReply(message, embed);
		}

		const oldVal = settings[key];
		embed.title = key;

		if (typeof value === typeof undefined) {
			// If we have no new value, just print the old one
			// Check if the old one is set
			if (oldVal !== null) {
				embed.description = t('cmd.config.current.text', {
					prefix,
					key
				});

				if (canClear(key)) {
					embed.description +=
						'\n' +
						t('cmd.config.current.clear', {
							prefix,
							key
						});
				}

				embed.fields.push({
					name: t('cmd.config.current.title'),
					value: beautify(key, oldVal)
				});
			} else {
				embed.description = t('cmd.config.current.notSet', {
					prefix,
					key
				});
			}
			return this.sendReply(message, embed);
		}

		// If the value is null we want to clear it. Check if that's allowed.
		if (value === null) {
			if (!canClear(key)) {
				return this.client.msg.sendReply(
					message,
					t('cmd.config.canNotClear', { prefix, key })
				);
			}
		} else {
			// Only validate the config setting if we're not resetting or clearing it
			const error = this.validate(key, value, context);
			if (error) {
				return this.sendReply(message, error);
			}
		}

		// Set new value (we override the local value, because the formatting probably changed)
		// If the value didn't change, then it will now be equal to oldVal (and also have the same formatting)
		value = await this.client.cache.settings.setOne(guild.id, key, value);

		if (value === oldVal) {
			embed.description = t('cmd.config.sameValue');
			embed.fields.push({
				name: t('cmd.config.current.title'),
				value: beautify(key, oldVal)
			});
			return this.sendReply(message, embed);
		}

		embed.description = t('cmd.config.changed.text', { prefix, key });

		// Log the settings change
		this.client.logAction(guild, message, LogAction.config, {
			key,
			oldValue: oldVal,
			newValue: value
		});

		if (oldVal !== null) {
			embed.fields.push({
				name: t('cmd.config.previous.title'),
				value: beautify(key, oldVal)
			});
		}

		embed.fields.push({
			name: t('cmd.config.new.title'),
			value: value !== null ? beautify(key, value) : t('cmd.config.none')
		});

		// Do any post processing, such as example messages
		const cb = await this.after(message, embed, key, value, context);

		await this.sendReply(message, embed);

		if (typeof cb === typeof Function) {
			await cb();
		}
	}

	// Validate a new config value to see if it's ok (no parsing, already done beforehand)
	private validate(
		key: SettingsKey,
		value: any,
		{ t, me }: Context
	): string | null {
		if (value === null || value === undefined) {
			return null;
		}

		const info = settingsInfo[key];

		if (info.type === 'Channel') {
			const channel = value as TextChannel;
			if (!channel.permissionsOf(me.id).has(Permissions.READ_MESSAGES)) {
				return t('cmd.config.channel.canNotReadMessages');
			}
			if (!channel.permissionsOf(me.id).has(Permissions.SEND_MESSAGES)) {
				return t('cmd.config.channel.canNotSendMessages');
			}
			if (!channel.permissionsOf(me.id).has(Permissions.EMBED_LINKS)) {
				return t('cmd.config.channel.canNotSendEmbeds');
			}
		}

		return null;
	}

	// Attach additional information for a config value, such as examples
	private async after(
		message: Message,
		embed: Embed,
		key: SettingsKey,
		value: any,
		context: Context
	): Promise<Function> {
		const { guild, t, me } = context;
		const member = message.member;
		const user = member.user;

		if (
			value &&
			(key === SettingsKey.joinMessage || key === SettingsKey.leaveMessage)
		) {
			const preview = await this.client.msg.fillJoinLeaveTemplate(
				value,
				guild,
				{
					id: member.id,
					nick: member.nick,
					user: {
						id: user.id,
						avatarUrl: user.avatarURL,
						createdAt: user.createdAt,
						bot: user.bot,
						discriminator: user.discriminator,
						username: user.username
					}
				},
				member.joinedAt,
				'tEsTcOdE',
				message.channel.id,
				(message.channel as any).name,
				me.id,
				me.nick,
				me.user.discriminator,
				me,
				{
					total: Math.round(Math.random() * 1000),
					regular: Math.round(Math.random() * 1000),
					custom: Math.round(Math.random() * 1000),
					fake: Math.round(Math.random() * 1000),
					leave: Math.round(Math.random() * 1000)
				}
			);

			if (typeof preview === 'string') {
				embed.fields.push({
					name: t('cmd.config.preview.title'),
					value: preview
				});
			} else {
				embed.fields.push({
					name: t('cmd.config.preview.title'),
					value: t('cmd.config.preview.nextMessage')
				});
				return () => this.sendReply(message, preview);
			}
		}

		if (value && key === SettingsKey.rankAnnouncementMessage) {
			const preview = await this.client.msg.fillTemplate(guild, value, {
				memberId: member.id,
				memberName: member.user.username,
				memberFullName: member.user.username + '#' + member.user.discriminator,
				memberMention: `<@${member.id}> `,
				memberImage: member.user.avatarURL,
				rankMention: `<@& ${me.roles[0]}> `,
				rankName: me.roles[0]
			});

			if (typeof preview === 'string') {
				embed.fields.push({
					name: t('cmd.config.preview.title'),
					value: preview
				});
			} else {
				embed.fields.push({
					name: t('cmd.config.preview.title'),
					value: t('cmd.config.preview.nextMessage')
				});
				return () => this.sendReply(message, preview);
			}
		}

		if (key === SettingsKey.autoSubtractFakes) {
			if (value) {
				// Subtract fake invites from all members
				const cmd = this.client.cmds.commands.find(
					c => c.name === BotCommand.subtractFakes
				);
				return async () => await cmd.action(message, [], {}, context);
			} else {
				// Delete old duplicate removals
				return async () =>
					await this.repo.customInvs.update(
						{
							guildId: guild.id,
							generatedReason: CustomInvitesGeneratedReason.fake
						},
						{
							deletedAt: new Date()
						}
					);
			}
		}

		if (key === SettingsKey.autoSubtractLeaves) {
			if (value) {
				// Subtract leaves from all members
				const cmd = this.client.cmds.commands.find(
					c => c.name === BotCommand.subtractLeaves
				);
				return async () => await cmd.action(message, [], {}, context);
			} else {
				// Delete old leave removals
				return async () =>
					await this.repo.customInvs.update(
						{
							guildId: guild.id,
							generatedReason: CustomInvitesGeneratedReason.leave
						},
						{
							deletedAt: new Date()
						}
					);
			}
		}

		if (key === SettingsKey.autoSubtractLeaveThreshold) {
			// Subtract leaves from all members to recompute threshold time
			const cmd = this.client.cmds.commands.find(
				c => c.name === BotCommand.subtractLeaves
			);
			return async () => await cmd.action(message, [], {}, context);
		}
	}
}
