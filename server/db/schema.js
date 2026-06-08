import { pgTable, integer, bigint, varchar, text, timestamp, numeric, serial } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

export const news = pgTable('news', {
    id: serial('id').primaryKey(),
    news_id: bigint('news_id', { mode: 'number' }).notNull().unique(),
    category: varchar('category', { length: 50 }).notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    content: text('content'),
    image_url: text('image_url'),
    publish_at: timestamp('publish_at', { mode: 'date' }).notNull(),
    created_at: timestamp('created_at', { mode: 'date' }).defaultNow(),
    embedding: vector('embedding', { dimensions: 768 })
});

export const newsStockSentiment = pgTable('news_stock_sentiment', {
    id: serial('id').primaryKey(),
    news_id: bigint('news_id', { mode: 'number' }).references(() => news.news_id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    sentiment: varchar('sentiment', { length: 20 }),
    score: numeric('score'),
    method: varchar('method', { length: 20 }).default('rule'),
    reason: text('reason'),
    created_at: timestamp('created_at', { mode: 'date' }).defaultNow()
});
