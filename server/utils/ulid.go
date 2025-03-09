package utils

import (
	"crypto/rand"
	"time"

	"github.com/oklog/ulid/v2"
)

// GenerateULID は新しいULIDを生成して返します
func GenerateULID() string {
	t := time.Now()
	entropy := ulid.Monotonic(rand.Reader, 0)
	id := ulid.MustNew(ulid.Timestamp(t), entropy)
	return id.String()
}
