import { Channel, Role } from 'eris';

import {
	defaultInviteCodeSettings,
	InviteCodeSettingsKey,
	inviteCodeSettingsTypes
} from './models/InviteCodeSetting';
import {
	defaultMemberSettings,
	MemberSettingsKey,
	memberSettingsTypes
} from './models/MemberSetting';
import { defaultSettings, SettingsKey, settingsTypes } from './models/Setting';

type AllKeys = SettingsKey | MemberSettingsKey | InviteCodeSettingsKey;
const allSettingsTypes = {
	...settingsTypes,
	...memberSettingsTypes,
	...inviteCodeSettingsTypes
};
const allDefaultSettings = {
	...defaultSettings,
	...defaultMemberSettings,
	...defaultInviteCodeSettings
};

export function toDbValue<K extends AllKeys>(key: K, value: any): string {
	const type = allSettingsTypes[key];

	if (value === 'default') {
		return _toDbValue(type, allDefaultSettings[key]);
	}

	return _toDbValue(type, value);
}
function _toDbValue(type: string, value: any): string {
	if (
		value === 'none' ||
		value === 'empty' ||
		value === 'null' ||
		value === null
	) {
		return null;
	}

	if (type === 'Channel') {
		if (typeof value === 'string') {
			return value;
		} else {
			return (value as Channel).id;
		}
	} else if (type === 'Role') {
		if (typeof value === 'string') {
			return value;
		} else {
			return (value as Role).id;
		}
	} else if (type === 'Boolean') {
		return value ? 'true' : 'false';
	} else if (type.endsWith('[]')) {
		const subType = type.substring(0, type.length - 2);
		return value.map((v: any) => _toDbValue(subType, v)).join(',');
	}

	return value;
}

export function fromDbValue<K extends AllKeys>(key: K, value: string): any {
	const type = allSettingsTypes[key];
	return _fromDbValue(type, value);
}
function _fromDbValue(type: string, value: string): any {
	if (value === undefined || value === null) {
		return null;
	}

	if (type === 'Boolean') {
		return value === 'true';
	} else if (type === 'Number') {
		return parseInt(value, 10);
	} else if (type.endsWith('[]')) {
		const subType = type.substring(0, type.length - 2);
		const splits = value.split(',');
		return splits.map(s => _fromDbValue(subType, s)) as
			| string[]
			| number[]
			| boolean[];
	}

	return value;
}

export function beautify<K extends AllKeys>(key: K, value: any) {
	if (typeof value === typeof undefined || value === null) {
		return '<None>';
	}

	const type = allSettingsTypes[key];
	if (type === 'Channel') {
		return `<#${value}>`;
	} else if (type === 'Boolean') {
		return value ? 'True' : 'False';
	} else if (type === 'Role') {
		return `<@&${value}>`;
	} else if (type === 'Role[]') {
		return value.map((v: any) => `<@&${v}>`).join(' ');
	} else if (type === 'Channel[]') {
		return value.map((v: any) => `<#${v}>`).join(' ');
	} else if (type === 'String[]') {
		return value.map((v: any) => '`' + v + '`').join(', ');
	}
	if (typeof value === 'string' && value.length > 1000) {
		return value.substr(0, 1000) + '...';
	}
	return value;
}
