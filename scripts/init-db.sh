#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Создание расширения
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Пользователи
    CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent')),
        phone TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Дети
    CREATE TABLE children (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        birth_date DATE NOT NULL,
        group_id UUID,
        medical_notes TEXT,
        achievements JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Курсы
    CREATE TABLE courses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        age_min INT,
        age_max INT,
        price DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Группы
    CREATE TABLE groups (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        name TEXT NOT NULL,
        schedule JSONB NOT NULL,
        max_students INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Связь child -> group
    ALTER TABLE children ADD CONSTRAINT fk_child_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL;

    -- Занятия (расписание)
    CREATE TABLE lessons (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        topic TEXT,
        attendance JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Сообщения (чаты)
    CREATE TABLE messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        chat_id UUID NOT NULL,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        child_id UUID REFERENCES children(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
    );

    -- Таблица для push-подписок
    CREATE TABLE push_subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        keys JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );

    -- Индексы для производительности
    CREATE INDEX idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX idx_messages_sender ON messages(sender_id);
    CREATE INDEX idx_messages_receiver ON messages(receiver_id);
    CREATE INDEX idx_lessons_date ON lessons(date);
    CREATE INDEX idx_children_parent ON children(parent_id);
    CREATE INDEX idx_groups_teacher ON groups(teacher_id);
EOSQL