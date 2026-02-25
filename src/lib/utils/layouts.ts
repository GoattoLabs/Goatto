// Imports for Vanity Module - Info embed (line 109)
import type { GuildConfig } from '../../database/models/GuildConfig';
import type { Guild } from 'discord.js';

const pastelColors = [16110577, 13890037, 13884661, 15520757, 16110559, 13891047, 16118739, 15775651, 10744012, 10744048, 11117552];

// Module reset - Ask embed
export function getResetLayout(confirmId: string, cancelId: string) {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: "<:reset_module:1475023127795994786> Are you sure you want to factory reset this module?"
                    },
                    {
                        type: 14,
                        spacing: 2,
                        divider: true
                    },
                    {
                        type: 1,
                        components: [
                            {
                                style: 4,
                                type: 2,
                                custom_id: confirmId,
                                label: "⠀⠀⠀⠀⠀⠀Yes⠀⠀⠀⠀⠀⠀"
                            },
                            {
                                style: 2,
                                type: 2,
                                custom_id: cancelId,
                                label: "⠀⠀⠀⠀⠀⠀No⠀⠀⠀⠀⠀⠀"
                            }
                        ]
                    }
                ]
            }
        ]
    };
}

// Module reset - Success embed
export function getSuccessLayout(moduleName: string) {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `<:success_task:1475030459636514838> The **${moduleName}** module has been reset to its default values.`
                    }
                ]
            }
        ]
    };
}

// Module reset - Cancelled / Timed out embed
export function getCancelledLayout() {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: "<:cancelled_task:1475033067784765470> Module reset operation was cancelled."
                    }
                ]
            }
        ]
    };
}

// Vanity Module - Channel log Message
export function getVanityWelcomeLayout(memberId: string, roleId: string, avatarURL: string) {
    return {
        flags: 32768,
        components: [
            {
                type: 17,
                accent_color: pastelColors[Math.floor(Math.random() * pastelColors.length)],
                components: [
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: `# ¡Gracias por apoyarnos! <a:thank_you:1475041806335869008>\n¡Hey, <@${memberId}>! Te agradecemos por promocionar nuestro\nservidor en tu perfil, el **meetspace** te luce muy bien.\n\n> Has recibido el rol: <@&${roleId}>\n\n-# Si te retiras la vanity, perderás el rol automáticamente`
                            }
                        ],
                        accessory: {
                            type: 11,
                            media: { url: avatarURL }
                        }
                    }
                ]
            }
        ],
        allowed_mentions: { parse: ["users"], roles: [] }
    };
}

// Vanity Module - Settings & Setup layout
export const getModuleLayout = (moduleName: string, config: any, guild: any, isSetupSuccess = false) => {
    const isEnabled = (config as any)[`${moduleName}Module`];
    const displayName = moduleName === 'vanity' ? 'Vanity Tracker' : 'Module';

    const bulletEnabled = '<a:enabled_setting:1475900750235304146>';
    const bulletDisabled = '<a:disabled_setting:1475900748545003611>';

    let details = "";
    if (moduleName === 'vanity') {
        const role = guild.roles.cache.get(config.vanityRoleId ?? '');

        const keywordBullet = config.vanityString ? bulletEnabled : bulletDisabled;
        const roleBullet = config.vanityRoleId ? bulletEnabled : bulletDisabled;
        const channelBullet = config.vanityChannelId ? bulletEnabled : bulletDisabled;

        details = `${keywordBullet} **Keyword**: \`${config.vanityString || 'Not set'}\`\n` +
                  `${roleBullet} **Role**: ${config.vanityRoleId ? `<@&${config.vanityRoleId}>` : '`Not set`'}\n` +
                  `${channelBullet} **Channel**: ${config.vanityChannelId ? `<#${config.vanityChannelId}>` : '`Not set`'}`;
        
        if (!isSetupSuccess) {
            details += `\n<a:static_setting:1475918470758797383> **Users with vanity**: \`${role ? role.members.size : 0}\``;
        }
    }

    const actionCommand = isSetupSuccess 
        ? (isEnabled 
            ? `\n\n-# Use </module disable:1475038787796205760> to disable this module.`
            : `\n\n-# Use </module enable:1475038787796205760> to enable this module.`)
        : "";

    const title = isSetupSuccess ? `## ${displayName} Setup` : `## ${displayName} Configuration`;

    return {
        flags: 32768, 
        components: [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        components: [
                            {
                                type: 10,
                                content: `${title}\n\n${details}${actionCommand}`
                            }
                        ],
                        accessory: {
                            type: 2,
                            style: 2,
                            label: isEnabled ? 'Enabled' : 'Disabled',
                            disabled: true,
                            custom_id: `status_${moduleName}`,
                            emoji: {
                                id: isEnabled ? "1475217017232560393" : "1475217050132549836"
                            }
                        }
                    }
                ]
            }
        ]
    };
};

// Module Enabled/Disabled layout
export function getStatusUpdateLayout(displayName: string, isEnabled: boolean) {
    const emoji = isEnabled 
        ? '<a:enabled_setting:1475900750235304146>' 
        : '<a:disabled_setting:1475900748545003611>';
    
    const state = isEnabled ? 'enabled' : 'disabled';

    return {
        flags: 32768,
        components: [
            {
                type: 17,
                components: [
                    {
                        type: 10,
                        content: `${emoji} **${displayName}** module is now ${state}.`
                    }
                ]
            }
        ]
    };
}