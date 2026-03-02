import { Table, Column, Model, DataType, AutoIncrement, PrimaryKey } from 'sequelize-typescript';


// Active mutes model ──────────────────

@Table({
    tableName: 'active_mutes',
    underscored: true,
    timestamps: true,
    indexes: [
        {
            name:   'mute_guild_user_unique',
            unique: true,
            fields: ['guild_id', 'user_id']
        }
    ]
})
export class ActiveMute extends Model {

    @PrimaryKey
    @AutoIncrement
    @Column({ type: DataType.INTEGER })
    declare id: number;

    @Column({ type: DataType.STRING, allowNull: false, field: 'guild_id' })
    declare guildId: string;

    @Column({ type: DataType.STRING, allowNull: false, field: 'user_id' })
    declare userId: string;

    @Column({ type: DataType.STRING, allowNull: false, field: 'moderator_id' })
    declare moderatorId: string;

    @Column({ type: DataType.STRING(500), allowNull: true, field: 'reason' })
    declare reason: string | null;

    @Column({ type: DataType.DATE, allowNull: true, field: 'expires_at' })
    declare expiresAt: Date | null;
}