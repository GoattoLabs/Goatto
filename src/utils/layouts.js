// Componente Agradecimiento
function getWelcomeLayout(memberId, roleId, avatarURL) {
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
                                content: `# ¡Gracias por apoyarnos! <:MS_Pat_2:1000994569573376020>\n¡Hey, <@${memberId}>! Te agradecemos por promocionar nuestro\nservidor en tu perfil, el **meetspace** te luce muy bien.\n\n> Has recibido el rol: <@&${roleId}>\n\n-# Si te retiras la vanity, perderás el rol automáticamente`
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
        allowed_mentions: {
            parse: ["users"],
        }
    };
}

// Componente Status
function getStatusLayout(settings, role, channel, userId, botAvatarURL, realMemberCount) {
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
                                content: `-# ## Configuración actual\n\n` +
                                    `- **Vanity**: \`${settings.vanityKeyword}\`\n` +
                                    `- **Rol**: ${role ? `${role} (\`${role.id}\`)` : 'No configurado'}\n` +
                                    `- **Canal**: ${channel || 'No configurado'}\n` +
                                    `- **Usuarios con rol**: \`${realMemberCount || 0}\`\n\n` +
                                    `-# Consulta generada por <@${userId}>`
                            }
                        ],
                        accessory: {
                            type: 11, 
                            media: { url: botAvatarURL }
                        }
                    }
                ]
            }
        ],
        allowed_mentions: { parse: [] }
    };
}

// Componente VIP
function getColorPickerLayout(title, description, imageUrl, selectOptions, selectPlaceholder = "Selecciona un color") {
    const selectOptionsPayload = selectOptions.slice(0, 25).map((opt) => ({
        label: String(opt.label).slice(0, 100),
        value: String(opt.value).slice(0, 100),
    }));

    return {
        components: [
            {
                type: 17,
                components: [
                    {
                        type: 9,
                        components: [
                            {
                                type: 10, 
                                content: `## ${title}\n${description}`,
                            },
                        ],
                        accessory: {
                            type: 11, 
                            media: { url: imageUrl || "https://cdn.discordapp.com/embed/avatars/0.png" },
                        },
                    },
                    {
                        type: 1, 
                        components: [
                            {
                                type: 3,
                                custom_id: "vip_color_select",
                                placeholder: String(selectPlaceholder).slice(0, 150),
                                options: selectOptionsPayload,
                            },
                        ],
                    }
                ],
            }
        ],
        allowed_mentions: { parse: [] },
    };
}

module.exports = { getWelcomeLayout, getStatusLayout, getColorPickerLayout };