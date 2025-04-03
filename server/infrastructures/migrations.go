package infrastructures

import (
	"fmt"
	"log"
	"server/domain"
	"time"

	"gorm.io/gorm"
)

// Migration はマイグレーションの情報を保持します
type Migration struct {
	ID        uint   `gorm:"primaryKey"`
	Version   string `gorm:"uniqueIndex"`
	Name      string
	CreatedAt time.Time
}

// MigrationFunc はマイグレーション関数の型を定義します
type MigrationFunc func(*gorm.DB) error

// migrations はマイグレーションの一覧を保持します
var migrations = []struct {
	Version string
	Name    string
	Up      MigrationFunc
	Down    MigrationFunc
}{
	{
		Version: "001_initial_schema",
		Name:    "初期スキーマの作成",
		Up: func(db *gorm.DB) error {
			// テーブルの作成
			if err := db.AutoMigrate(&domain.TradeRecord{}, &domain.TradeFile{}, &domain.User{}); err != nil {
				return fmt.Errorf("failed to create initial schema: %w", err)
			}
			return nil
		},
		Down: func(db *gorm.DB) error {
			// テーブルの削除
			if err := db.Migrator().DropTable(&domain.TradeRecord{}, &domain.TradeFile{}, &domain.User{}); err != nil {
				return fmt.Errorf("failed to drop tables: %w", err)
			}
			return nil
		},
	},
	{
		Version: "002_add_user_id_not_null",
		Name:    "user_idカラムにnot null制約を追加",
		Up: func(db *gorm.DB) error {
			// 既存のNULL値を更新
			if err := db.Exec("UPDATE trade_records SET user_id = 'default' WHERE user_id IS NULL").Error; err != nil {
				return fmt.Errorf("failed to update NULL user_id values: %w", err)
			}

			// not null制約を追加
			if err := db.Exec("ALTER TABLE trade_records ALTER COLUMN user_id SET NOT NULL").Error; err != nil {
				return fmt.Errorf("failed to add NOT NULL constraint to user_id: %w", err)
			}
			return nil
		},
		Down: func(db *gorm.DB) error {
			// not null制約を削除
			if err := db.Exec("ALTER TABLE trade_records ALTER COLUMN user_id DROP NOT NULL").Error; err != nil {
				return fmt.Errorf("failed to drop NOT NULL constraint from user_id: %w", err)
			}
			return nil
		},
	},
}

// RunMigrations はマイグレーションを実行します
func RunMigrations(db *gorm.DB) error {
	// マイグレーションテーブルの作成
	if err := db.AutoMigrate(&Migration{}); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// 実行済みマイグレーションの取得
	var appliedMigrations []Migration
	if err := db.Find(&appliedMigrations).Error; err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	// 実行済みマイグレーションのバージョンをマップに変換
	appliedVersions := make(map[string]bool)
	for _, m := range appliedMigrations {
		appliedVersions[m.Version] = true
	}

	// 未実行のマイグレーションを実行
	for _, m := range migrations {
		if !appliedVersions[m.Version] {
			log.Printf("Running migration: %s (%s)", m.Name, m.Version)

			// トランザクション内でマイグレーションを実行
			err := db.Transaction(func(tx *gorm.DB) error {
				if err := m.Up(tx); err != nil {
					return err
				}

				// マイグレーション履歴を記録
				migration := Migration{
					Version:   m.Version,
					Name:      m.Name,
					CreatedAt: time.Now(),
				}
				if err := tx.Create(&migration).Error; err != nil {
					return fmt.Errorf("failed to record migration: %w", err)
				}

				return nil
			})

			if err != nil {
				return fmt.Errorf("failed to run migration %s: %w", m.Version, err)
			}

			log.Printf("Successfully applied migration: %s", m.Version)
		}
	}

	return nil
}

// RollbackMigration は指定したバージョンのマイグレーションをロールバックします
func RollbackMigration(db *gorm.DB, version string) error {
	// マイグレーションの検索
	var migration Migration
	if err := db.Where("version = ?", version).First(&migration).Error; err != nil {
		return fmt.Errorf("migration %s not found: %w", version, err)
	}

	// マイグレーション関数の検索
	var migrationFunc MigrationFunc
	for _, m := range migrations {
		if m.Version == version {
			migrationFunc = m.Down
			break
		}
	}

	if migrationFunc == nil {
		return fmt.Errorf("migration function for version %s not found", version)
	}

	// トランザクション内でロールバックを実行
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := migrationFunc(tx); err != nil {
			return err
		}

		// マイグレーション履歴を削除
		if err := tx.Delete(&migration).Error; err != nil {
			return fmt.Errorf("failed to delete migration record: %w", err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to rollback migration %s: %w", version, err)
	}

	log.Printf("Successfully rolled back migration: %s", version)
	return nil
}
