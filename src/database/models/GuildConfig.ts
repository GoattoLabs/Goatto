import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

@Table({
    tableName: 'guild_configs',
    underscored: true,
    timestamps: true
})
export class GuildConfig extends Model {
    @PrimaryKey
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'guild_id'
    })
    declare guildId: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'vanity_string'
    })
    declare vanityString: string | null;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'vanity_role_id'
    })
    declare vanityRoleId: string | null;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'vanity_channel_id'
    })
    declare vanityChannelId: string | null;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'vanity_log_channel'
    })
    declare vanityLogChannel: string | null;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        field: 'vanity_module'
    })
    declare vanityEnabled: boolean;
}