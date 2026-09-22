import { defineRelations } from 'drizzle-orm'
import { pgTable, uuid, timestamp, pgEnum, text } from "drizzle-orm/pg-core";

export const RoleEnum = pgEnum("userRole", ["user", "admin"]);

export const users = pgTable("users", {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    passwordHash: text(),
    role: RoleEnum().default("user"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).$onUpdate(() => new Date())
});

export const userDevices = pgTable("userDevices", {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    refreshToken: text().notNull(),
    lastUse: timestamp({ mode: "date" }).$onUpdate(() => new Date())
});

export const userDetails = pgTable("userDetails", {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    phone: text().notNull(),
    address: text().notNull()
});

export const relations = defineRelations({ users, userDevices, userDetails }, (r) => ({
    users: {
        devices: r.many.userDevices({
            from: r.users.id,
            to: r.userDevices.userId,
        }),
        details: r.one.userDetails({
            from: r.users.id,
            to: r.userDetails.userId,
        }),
    },
    userDevices: {
        user: r.one.users({
            from: r.userDevices.userId,
            to: r.users.id,
        }),
    },
    userDetails: {
        user: r.one.users({
            from: r.userDetails.userId,
            to: r.users.id,
        }),
    },
}));