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

// InitDB は環境に応じたデータベース接続を初期化します
func InitDB() (*gorm.DB, error) {
	// 環境を取得（development, production, test）
	env := getEnv("APP_ENV", "development")

	var db *gorm.DB
	var err error

	switch env {
	case "production":
		db, err = initProductionDB() // Supabase接続
	case "test":
		db, err = initTestDB() // SQLite接続
	default:
		db, err = initDevelopmentDB() // ローカルPostgreSQL接続
	}

	if err != nil {
		return nil, err
	}

	// コネクションプールの設定
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// マイグレーション
	if err := db.AutoMigrate(&domain.TradeRecord{}, &domain.TradeFile{}, &domain.User{}); err != nil {
		return nil, err
	}

	return db, nil
}

// initProductionDB は本番環境のデータベース接続を初期化します (Supabase)
func initProductionDB() (*gorm.DB, error) {
	// 本番環境では環境変数が必須
	host := os.Getenv("SUPABASE_HOST")
	port := os.Getenv("SUPABASE_PORT")
	user := os.Getenv("SUPABASE_USER")
	password := os.Getenv("SUPABASE_PASSWORD")
	dbname := os.Getenv("SUPABASE_DBNAME")

	// 必須環境変数のチェック
	if host == "" || port == "" || user == "" || password == "" || dbname == "" {
		return nil, fmt.Errorf("missing required environment variables for database connection")
	}

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=require TimeZone=Asia/Tokyo",
		host, user, password, dbname, port)

	log.Println("Connecting to production Supabase database...")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to Supabase database: %v", err)
		return nil, err
	}

	return db, nil
}

// initTestDB はテスト環境のデータベース接続を初期化します
func initTestDB() (*gorm.DB, error) {
	log.Println("Using in-memory SQLite database for testing...")
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to test database: %v", err)
		return nil, err
	}

	return db, nil
}

// initDevelopmentDB は開発環境のデータベース接続を初期化します (ローカルPostgreSQL)
func initDevelopmentDB() (*gorm.DB, error) {
	// ローカルPostgreSQLの接続情報
	host := getEnv("DEV_DB_HOST", "localhost")
	port := getEnv("DEV_DB_PORT", "5432")
	user := getEnv("DEV_DB_USER", "postgres")
	password := getEnv("DEV_DB_PASSWORD", "postgres")
	dbname := getEnv("DEV_DB_NAME", "tradeinsight_dev")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Tokyo",
		host, user, password, dbname, port)

	log.Println("Connecting to local PostgreSQL database for development...")
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to local PostgreSQL database: %v", err)
		return nil, err
	}

	return db, nil
}

// getEnv は環境変数を取得し、設定されていない場合はデフォルト値を返します
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
