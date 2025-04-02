package domain

import "context"

type UserRepository interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id string) (*User, error)
	GetBySupabaseID(ctx context.Context, supabaseID string) (*User, error)
}
