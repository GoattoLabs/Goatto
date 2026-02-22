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
        allowed_mentions: { parse: ["users"] }
    };
}