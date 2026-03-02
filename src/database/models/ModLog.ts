import { Table, Column, Model, DataType, AutoIncrement, PrimaryKey } from 'sequelize-typescript';


// Mod log model ──────────────────

@Table({
    tableName: 'mod_logs',
    underscored: true,
    timestamps: true,
    indexes: [
        {
            name:   'modlog_guild_user',
            fields: ['guild_id', 'user_id']
        }
    ]
})
export class ModLog extends Model {

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

    @Column({ type: DataType.STRING, allowNull: false })
    declare action: string;

    @Column({ type: DataType.STRING(500), allowNull: true })
    declare reason: string | null;

    @Column({ type: DataType.STRING, allowNull: true })
    declare duration: string | null;

    @Column({ type: DataType.DATE, allowNull: true, field: 'expires_at' })
    declare expiresAt: Date | null;
}