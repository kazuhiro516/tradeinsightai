package domain

import (
	"time"
)

// User はアプリケーション内のユーザーを表します。
// IDはULIDとしてアプリ側で生成され、Supabaseの認証IDはSupabaseIDに格納します。
type User struct {
	ID         string    `json:"id" db:"id"`                   // アプリ内部で生成するULID
	SupabaseID string    `json:"supabase_id" db:"supabase_id"` // Supabaseから発行される認証ID
	Name       string    `json:"name" db:"name"`               // ユーザー名
	CreatedAt  time.Time `json:"created_at" db:"created_at"`   // レコード作成日時
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`   // レコード更新日時
}

func NewUser(
	supabaseID string,
	name string,
) *User {
	return &User{
		ID:         GenerateULID(),
		SupabaseID: supabaseID,
		Name:       name,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
}
