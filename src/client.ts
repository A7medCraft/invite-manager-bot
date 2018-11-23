import * as amqplib from 'amqplib';
import DBL from 'dblapi.js';
import { Client, Embed, Guild, Message, TextChannel } from 'eris';
import i18n from 'i18n';
import moment from 'moment';
import { getRepository } from 'typeorm';

import { InviteCodeSettingsCache } from './cache/InviteCodeSettingsCache';
import { PermissionsCache } from './cache/PermissionsCache';
import { PremiumCache } from './cache/PremiumCache';
import { PunishmentCache } from './cache/PunishmentsCache';
import { SettingsCache } from './cache/SettingsCache';
import { StrikesCache } from './cache/StrikesCache';

import { CaptchaService } from './services/Captcha';
import { Commands } from './services/Commands';
import { DBQueue } from './services/DBQueue';
import { InvitesService } from './services/Invites';
import { Messaging } from './services/Messaging';
import { Moderation } from './services/Moderation';
import { RabbitMq } from './services/RabbitMq';
import { Scheduler } from './services/Scheduler';

import { Guild as DBGuild } from './models/Guild';
import { LogAction } from './models/Log';
import { Member } from './models/Member';

const config = require('../config.json');

i18n.configure({
	locales: [
		'en',
		'de',
		'el',
		'en',
		'es',
		'fr',
		'it',
		'lt',
		'nl',
		'pt',
		'ro',
		'sr'
	],
	defaultLocale: 'en',
	// syncFiles: true,
	directory: __dirname + '/../locale',
	objectNotation: true,
	logDebugFn: function(msg: string) {
		console.log('debug', msg);
	},
	logWarnFn: function(msg: string) {
		console.error('warn', msg);
	},
	logErrorFn: function(msg: string) {
		console.error('error', msg);
	}
});

export class IMClient extends Client {
	// General
	public version: string;
	public config: any;
	public shardId: number;
	public shardCount: number;

	// Cache
	public cache: {
		settings: SettingsCache;
		premium: PremiumCache;
		permissions: PermissionsCache;
		strikes: StrikesCache;
		punishments: PunishmentCache;
		inviteCodes: InviteCodeSettingsCache;
	};

	// Services
	public captcha: CaptchaService;
	public cmds: Commands;
	public dbQueue: DBQueue;
	public invs: InvitesService;
	public mod: Moderation;
	public msg: Messaging;
	public rabbitmq: RabbitMq;
	public scheduler: Scheduler;

	// Misc
	public startedAt: moment.Moment;
	public activityInterval: NodeJS.Timer;

	public numGuilds: number = 0;
	public guildsCachedAt: number = 0;

	public numMembers: number = 0;
	public membersCachedAt: number = 0;

	private dbl: DBL;

	// Constructor
	public constructor(
		version: string,
		conn: amqplib.Connection,
		token: string,
		shardId: number,
		shardCount: number,
		_prefix: string
	) {
		super(token, {
			disableEveryone: true,
			firstShardID: shardId - 1,
			lastShardID: shardId - 1,
			maxShards: shardCount,
			disableEvents: {
				TYPING_START: true,
				USER_UPDATE: true,
				PRESENCE_UPDATE: true
			},
			restMode: true,
			messageLimit: 2,
			getAllUsers: false,
			compress: true,
			guildCreateTimeout: 60000
		});

		// General init
		this.startedAt = moment();
		this.version = version;
		this.config = config;
		this.shardId = shardId;
		this.shardCount = shardCount;

		// Cache init
		this.cache = {
			settings: new SettingsCache(this),
			premium: new PremiumCache(this),
			permissions: new PermissionsCache(this),
			strikes: new StrikesCache(this),
			punishments: new PunishmentCache(this),
			inviteCodes: new InviteCodeSettingsCache(this)
		};

		// Services init
		this.captcha = new CaptchaService(this);
		this.cmds = new Commands(this);
		this.dbQueue = new DBQueue(this);
		this.invs = new InvitesService(this);
		this.mod = new Moderation(this);
		this.msg = new Messaging(this);
		this.rabbitmq = new RabbitMq(this, conn);
		this.scheduler = new Scheduler(this);

		// Events init
		this.on('ready', this.onClientReady);
		this.on('guildCreate', this.onGuildCreate);
		this.on('guildUnavailable', this.onGuildUnavailable);
		this.on('disconnect', this.onDisconnect);
		this.on('connect', this.onConnect);
		this.on('warn', this.onWarn);
		this.on('error', this.onError);
	}

	private async onClientReady(): Promise<void> {
		console.log(`Client ready! Serving ${this.guilds.size} guilds.`);

		// Init all caches
		Promise.all(Object.values(this.cache).map(c => c.init()));

		// Other services
		await this.cmds.init();
		await this.rabbitmq.init();
		await this.scheduler.init();

		// Setup discord bots api
		if (this.config.discordBotsToken) {
			this.dbl = new DBL(this.config.discordBotsToken, this);
		}

		this.setActivity();
		this.activityInterval = setInterval(() => this.setActivity(), 30000);
	}

	private async onGuildCreate(guild: Guild): Promise<void> {
		// Send welcome message to owner with setup instructions
		const owner = await guild.getRESTMember(guild.ownerID);

		const channel = await this.getDMChannel(owner.user.id);

		channel.createMessage(
			'Hi! Thanks for inviting me to your server `' +
				guild.name +
				'`!\n\n' +
				'I am now tracking all invites on your server.\n\n' +
				'To get help setting up join messages or changing the prefix, please run the `!setup` command.\n\n' +
				'You can see a list of all commands using the `!help` command.\n\n' +
				`That's it! Enjoy the bot and if you have any questions feel free to join our support server!\n` +
				'https://discord.gg/2eTnsVM'
		);
	}

	public async logModAction(guild: Guild, embed: Embed) {
		const modLogChannelId = (await this.cache.settings.get(guild.id))
			.modLogChannel;

		if (modLogChannelId) {
			const logChannel = guild.channels.get(modLogChannelId) as TextChannel;
			if (logChannel) {
				this.msg.sendEmbed(logChannel, embed);
			}
		}
	}

	public async logAction(
		guild: Guild,
		message: Message,
		action: LogAction,
		data: any
	) {
		const logChannelId = (await this.cache.settings.get(guild.id)).logChannel;

		if (logChannelId) {
			const logChannel = guild.channels.get(logChannelId) as TextChannel;
			if (logChannel) {
				const content =
					message.content.substr(0, 1000) +
					(message.content.length > 1000 ? '...' : '');

				let json = JSON.stringify(data, null, 2);
				if (json.length > 1000) {
					json = json.substr(0, 1000) + '...';
				}

				const embed = this.msg.createEmbed({
					title: 'Log Action',
					fields: [
						{
							name: 'Action',
							value: action,
							inline: true
						},
						{
							name: 'Cause',
							value: `<@${message.author.id}>`,
							inline: true
						},
						{
							name: 'Command',
							value: content
						},
						{
							name: 'Data',
							value: '`' + json + '`'
						}
					]
				});
				this.msg.sendEmbed(logChannel, embed);
			}
		}

		this.dbQueue.addLogAction(
			{
				guildId: guild.id,
				memberId: message.author.id,
				action,
				message: message.content,
				data,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{
				id: guild.id,
				name: guild.name,
				icon: guild.iconURL,
				memberCount: guild.memberCount
			},
			{
				id: message.author.id,
				discriminator: message.author.discriminator,
				name: message.author.username
			}
		);
	}

	public async getMembersCount() {
		// If cached member count is older than 5 minutes, update it
		if (Date.now() - this.membersCachedAt > 1000 * 60 * 5) {
			console.log('Fetching guild & member count from DB...');
			this.numMembers = await getRepository(Member).count({
				where: { deletedAt: null }
			});
			this.membersCachedAt = Date.now();
		}
		return this.numMembers;
	}

	public async getGuildsCount() {
		// If cached guild count is older than 5 minutes, update it
		if (Date.now() - this.guildsCachedAt > 1000 * 60 * 5) {
			console.log('Fetching guild & member count from DB...');
			this.numGuilds = await getRepository(DBGuild).count({
				where: { deletedAt: null }
			});
			this.guildsCachedAt = Date.now();
		}
		return this.numGuilds;
	}

	private async setActivity() {
		if (this.dbl) {
			this.dbl.postStats(this.guilds.size, this.shardId - 1, this.shardCount);
		}

		const numGuilds = await this.getGuildsCount();
		this.editStatus('online', {
			name: `invitemanager.co - ${numGuilds} servers!`,
			type: 1
		});
	}

	private async onConnect() {
		console.error('DISCORD CONNECT');
	}

	private async onDisconnect() {
		console.error('DISCORD DISCONNECT');
	}

	private async onGuildUnavailable(guild: Guild) {
		console.error('DISCORD GUILD_UNAVAILABLE:', guild.id);
	}

	private async onWarn(info: string) {
		console.error('DISCORD WARNING:', info);
	}

	private async onError(error: Error) {
		console.error('DISCORD ERROR:', error);
	}
}
