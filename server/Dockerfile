# 基底イメージ
FROM golang:1.24.0 as builder

# 作業ディレクトリを設定
WORKDIR /app

# go.mod と go.sum ファイルをコピー
COPY go.mod go.sum ./

# 依存関係をインストール
RUN go mod download

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN CGO_ENABLED=0 GOOS=linux go build -o main main.go

# 実行イメージ
FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .
CMD ["./main"]
