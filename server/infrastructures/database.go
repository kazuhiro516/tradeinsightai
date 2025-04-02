package infrastructures

import (
	"fmt"
	"log"
	"os"
	"server/domain"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// DBConfig はデータベース接続の設定を保持します
type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
	TimeZone string
}

// InitDB は環境に応じたデータベース接続を初期化します
func InitDB() (*gorm.DB, error) {
	env := getEnv("APP_ENV", "development")
	db, err := initDBByEnv(env)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	if err := configureConnectionPool(db); err != nil {
		return nil, fmt.Errorf("failed to configure connection pool: %w", err)
	}

	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return db, nil
}

// initDBByEnv は環境に応じたデータベース接続を初期化します
func initDBByEnv(env string) (*gorm.DB, error) {
	switch env {
	case "production":
		return initProductionDB()
	case "test":
		return initTestDB()
	default:
		return initDevelopmentDB()
	}
}

// configureConnectionPool はデータベースのコネクションプールを設定します
func configureConnectionPool(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return nil
}

// runMigrations はデータベースのマイグレーションを実行します
func runMigrations(db *gorm.DB) error {
	// マイグレーション対象のモデル
	models := []interface{}{
		&domain.TradeRecord{},
		&domain.TradeFile{},
		&domain.User{},
	}

	// マイグレーションの実行
	if err := db.AutoMigrate(models...); err != nil {
		return fmt.Errorf("failed to run auto migration: %w", err)
	}

	// user_idカラムのnot null制約を追加
	if err := addNotNullConstraint(db); err != nil {
		log.Printf("Warning: Failed to add NOT NULL constraint to user_id: %v", err)
	}

	return nil
}

// addNotNullConstraint はuser_idカラムにnot null制約を追加します
func addNotNullConstraint(db *gorm.DB) error {
	// 既存のNULL値を更新
	if err := db.Exec("UPDATE trade_records SET user_id = 'default' WHERE user_id IS NULL").Error; err != nil {
		return fmt.Errorf("failed to update NULL user_id values: %w", err)
	}

	// not null制約を追加
	if err := db.Exec("ALTER TABLE trade_records ALTER COLUMN user_id SET NOT NULL").Error; err != nil {
		return fmt.Errorf("failed to add NOT NULL constraint to user_id: %w", err)
	}

	return nil
}

// initProductionDB は本番環境のデータベース接続を初期化します (Supabase)
func initProductionDB() (*gorm.DB, error) {
	config := DBConfig{
		Host:     os.Getenv("SUPABASE_HOST"),
		Port:     os.Getenv("SUPABASE_PORT"),
		User:     os.Getenv("SUPABASE_USER"),
		Password: os.Getenv("SUPABASE_PASSWORD"),
		DBName:   os.Getenv("SUPABASE_DBNAME"),
		SSLMode:  "require",
		TimeZone: "Asia/Tokyo",
	}

	if err := validateConfig(config); err != nil {
		return nil, err
	}

	return connectPostgres(config)
}

// initTestDB はテスト環境のデータベース接続を初期化します
func initTestDB() (*gorm.DB, error) {
	log.Println("Using in-memory SQLite database for testing...")
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to test database: %w", err)
	}
	return db, nil
}

// initDevelopmentDB は開発環境のデータベース接続を初期化します (ローカルPostgreSQL)
func initDevelopmentDB() (*gorm.DB, error) {
	config := DBConfig{
		Host:     getEnv("DEV_DB_HOST", "localhost"),
		Port:     getEnv("DEV_DB_PORT", "5432"),
		User:     getEnv("DEV_DB_USER", "postgres"),
		Password: getEnv("DEV_DB_PASSWORD", "postgres"),
		DBName:   getEnv("DEV_DB_NAME", "tradeinsight_dev"),
		SSLMode:  "disable",
		TimeZone: "Asia/Tokyo",
	}

	return connectPostgres(config)
}

// connectPostgres はPostgreSQLデータベースに接続します
func connectPostgres(config DBConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		config.Host, config.User, config.Password, config.DBName, config.Port, config.SSLMode, config.TimeZone)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to PostgreSQL database: %w", err)
	}

	return db, nil
}

// validateConfig はデータベース設定の必須項目を検証します
func validateConfig(config DBConfig) error {
	if config.Host == "" || config.Port == "" || config.User == "" || config.Password == "" || config.DBName == "" {
		return fmt.Errorf("missing required database configuration")
	}
	return nil
}

// getEnv は環境変数を取得し、設定されていない場合はデフォルト値を返します
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
