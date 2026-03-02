import { Table, Column, Model, DataType, AutoIncrement, PrimaryKey } from 'sequelize-typescript';


// Warn log model ──────────────────

@Table({
    tableName: 'warn_logs',
    underscored: true,
    timestamps: true,
    indexes: [
        {
            name:   'warn_guild_user',
            fields: ['guild_id', 'user_id']
        }
    ]
})
export class WarnLog extends Model {

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
}