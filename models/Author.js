const {DataTypes, UniqueConstraintError} = require('sequelize');
const sequelize = require('../config/database');

const Author = sequelize.define(
    "Author",
    {
        author_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        first_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        last_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        author_email: {
            type: DataTypes.STRING(100),
            unique: true,
            allowNull: false
        },
        author_country: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
    },
    {
        tableName: "authors",
        timestamps: false
    }
);
module.exports = Author;