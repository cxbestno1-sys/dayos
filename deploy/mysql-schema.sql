CREATE DATABASE IF NOT EXISTS dayos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dayos;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT UNSIGNED NOT NULL,
  default_language VARCHAR(8) NOT NULL DEFAULT 'zh',
  calendar_sync TINYINT(1) NOT NULL DEFAULT 0,
  notes_sync TINYINT(1) NOT NULL DEFAULT 0,
  photo_storage VARCHAR(32) NOT NULL DEFAULT 'local',
  ai_enabled TINYINT(1) NOT NULL DEFAULT 1,
  display_name VARCHAR(120) NOT NULL DEFAULT '',
  active_start TIME NOT NULL DEFAULT '08:00:00',
  active_end TIME NOT NULL DEFAULT '22:00:00',
  onboarding_complete TINYINT(1) NOT NULL DEFAULT 0,
  icloud_apple_id VARCHAR(255) NOT NULL DEFAULT '',
  icloud_app_password VARCHAR(255) NOT NULL DEFAULT '',
  reminders_list_name VARCHAR(120) NOT NULL DEFAULT 'DayOS',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calendar_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  external_id VARCHAR(120) NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL DEFAULT '09:00:00',
  title VARCHAR(255) NOT NULL,
  category ENUM('work', 'life', 'health', 'agent') NOT NULL DEFAULT 'work',
  progress TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_calendar_event_external (user_id, external_id),
  KEY idx_calendar_events_user_date (user_id, event_date),
  CONSTRAINT fk_calendar_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS memos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  external_id VARCHAR(120) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_memos_external (user_id, external_id),
  KEY idx_memos_user_sort (user_id, sort_order),
  CONSTRAINT fk_memos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS journal_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  entry_date DATE NOT NULL,
  content MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_journal_user_date (user_id, entry_date),
  CONSTRAINT fk_journal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  external_id VARCHAR(120) NOT NULL,
  label VARCHAR(160) NOT NULL,
  note TEXT NULL,
  src MEDIUMTEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_photos_external (user_id, external_id),
  KEY idx_photos_user_created (user_id, created_at),
  CONSTRAINT fk_photos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_configs (
  user_id BIGINT UNSIGNED NOT NULL,
  source ENUM('Hermes', 'OpenClaw') NOT NULL DEFAULT 'Hermes',
  webhook_url VARCHAR(255) NOT NULL DEFAULT '/api/agent/push',
  api_endpoint VARCHAR(255) NOT NULL DEFAULT 'https://api.openai.com/v1',
  api_key VARCHAR(255) NOT NULL DEFAULT '',
  model VARCHAR(120) NOT NULL DEFAULT 'gpt-4.1-mini',
  auto_classify TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_agent_configs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS agent_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  external_id VARCHAR(120) NOT NULL,
  source ENUM('Hermes', 'OpenClaw') NOT NULL DEFAULT 'Hermes',
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  category ENUM('work', 'life', 'health', 'agent') NOT NULL DEFAULT 'agent',
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agent_messages_external (user_id, external_id),
  KEY idx_agent_messages_user_created (user_id, created_at),
  CONSTRAINT fk_agent_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
