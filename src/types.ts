export enum Permissions {
	ADMINISTRATOR = 'administrator',
	READ_MESSAGES = 'readMessages',
	SEND_MESSAGES = 'sendMessages',
	EMBED_LINKS = 'embedLinks',
	MANAGE_GUILD = 'manageGuild',
	VIEW_AUDIT_LOGS = 'viewAuditLogs',
	MANAGE_ROLES = 'manageRoles',
	CREATE_INSTANT_INVITE = 'createInstantInvite',
	BAN_MEMBERS = 'banMembers',
	KICK_MEMBERS = 'kickMembers'
}

export enum PromptResult {
	SUCCESS,
	FAILURE,
	TIMEOUT
}

export enum CommandGroup {
	Invites = 'Invites',
	Ranks = 'Ranks',
	Config = 'Config',
	Info = 'Info',
	Premium = 'Premium',
	Moderation = 'Moderation',
	Report = 'Report',
	Other = 'Other'
}

export enum ShardCommand {
	CACHE = 'CACHE',
	CUSTOM = 'CUSTOM',
	DIAGNOSE = 'DIAGNOSE',
	FLUSH_CACHE = 'FLUSH_CACHE',
	SUDO = 'SUDO',
	OWNER_DM = 'OWNER_DM',
	USER_DM = 'USER_DM',
	LEAVE_GUILD = 'LEAVE_GUILD',
	STATUS = 'STATUS'
}

export enum ChartType {
	joins = 'joins',
	leaves = 'leaves',
	usage = 'usage'
}

export enum BotCommand {
	config = 'config',
	inviteCodeConfig = 'inviteCodeConfig',
	memberConfig = 'memberConfig',
	permissions = 'permissions',
	interactiveConfig = 'interactiveConfig',

	botInfo = 'botInfo',
	credits = 'credits',
	getBot = 'getBot',
	help = 'help',
	members = 'members',
	ping = 'ping',
	prefix = 'prefix',
	setup = 'setup',
	support = 'support',

	createInvite = 'createInvite',
	addInvites = 'addInvites',
	clearInvites = 'clearInvites',
	fake = 'fake',
	info = 'info',
	inviteCodes = 'inviteCodes',
	inviteDetails = 'inviteDetails',
	invites = 'invites',
	leaderboard = 'leaderboard',
	removeInvites = 'removeInvites',
	restoreInvites = 'restoreInvites',
	subtractFakes = 'subtractFakes',
	subtractLeaves = 'subtractLeaves',

	export = 'export',
	premium = 'premium',
	tryPremium = 'tryPremium',

	addRank = 'addRank',
	ranks = 'ranks',
	removeRank = 'removeRank',

	makeMentionable = 'makeMentionable',
	mentionRole = 'mentionRole',

	/*report = 'report',*/

	graph = 'graph'
}

export enum ModerationCommand {
	punishmentConfig = 'punishmentConfig',
	strikeConfig = 'strikeConfig',

	check = 'check',
	caseDelete = 'caseDelete',
	caseView = 'caseView',

	ban = 'ban',
	mute = 'mute',
	kick = 'kick',
	softBan = 'softBan',
	strike = 'strike',
	unban = 'unban',
	unhoist = 'unhoist',
	unmute = 'unmute',
	warn = 'warn',

	clean = 'clean',
	cleanText = 'cleanText',
	cleanShort = 'cleanShort',
	purgeSafe = 'purgeSafe',
	purgeUntil = 'purgeUntil',
	purge = 'purge'
}

export interface RabbitMqMember {
	id: string;
	nick?: string;
	user: {
		id: string;
		avatarUrl: string | null;
		createdAt: number;
		bot: boolean;
		discriminator: string;
		username: string;
	};
}

export type InternalSettingsTypes =
	| 'String'
	| 'Number'
	| 'Boolean'
	| 'Channel'
	| 'Role'
	| 'String[]'
	| 'Channel[]'
	| 'Role[]'
	| 'Enum<LeaderboardStyle>'
	| 'Enum<RankAssignmentStyle>'
	| 'Enum<Lang>';

export enum ViolationType {
	invites = 'invites',
	links = 'links',
	words = 'words',
	allCaps = 'allCaps',
	duplicateText = 'duplicateText',
	quickMessages = 'quickMessages',
	mentionUsers = 'mentionUsers',
	mentionRoles = 'mentionRoles',
	emojis = 'emojis',
	hoist = 'hoist'
}

export enum PunishmentType {
	ban = 'ban',
	kick = 'kick',
	softban = 'softban',
	warn = 'warn',
	mute = 'mute'
}

export interface InviteCounts {
	regular: number;
	custom: number;
	fake: number;
	leave: number;
	total: number;
}
