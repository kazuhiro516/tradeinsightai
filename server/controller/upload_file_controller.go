package controller

import (
	"fmt"
	"log/slog"
	"net/http"
	"server/usecases"
)

// UploadFileController はファイルアップロード関連のAPIハンドラを提供します
type UploadFileController struct {
	tradeFileUsecase usecases.TradeFileUsecase
	tradeUsecase     usecases.TradeRecordUsecase
}

// NewUploadFileController は新しいUploadFileControllerインスタンスを作成します
func NewUploadFileController(
	tradeFileUsecase usecases.TradeFileUsecase,
	tradeUsecase usecases.TradeRecordUsecase,
) *UploadFileController {
	return &UploadFileController{
		tradeFileUsecase: tradeFileUsecase,
		tradeUsecase:     tradeUsecase,
	}
}

// UploadTradeHTMLHandler はHTMLファイルをアップロードし、TradeRecordに変換して保存するハンドラーです
func (c *UploadFileController) UploadTradeHTMLHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// ファイルサイズの上限を設定 (10MB)
	r.ParseMultipartForm(10 << 20)

	// POSTリクエストのファイルパート "file" を取得
	file, handler, err := r.FormFile("file")
	if err != nil {
		slog.ErrorContext(ctx, "Error retrieving file", slog.String("error", err.Error()))
		http.Error(w, "Failed to retrieve file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	slog.InfoContext(ctx, "File upload received",
		slog.String("filename", handler.Filename),
		slog.Int64("size", handler.Size))

	// ファイル形式の検証（HTMLファイルのみ許可）
	if handler.Header.Get("Content-Type") != "text/html" && handler.Header.Get("Content-Type") != "application/html" {
		slog.ErrorContext(ctx, "Invalid file type", slog.String("content-type", handler.Header.Get("Content-Type")))
		http.Error(w, "Only HTML files are allowed", http.StatusBadRequest)
		return
	}

	// HTMLファイルをTradeRecordに変換して保存
	recordsCount, err := c.tradeUsecase.ProcessHTMLFile(ctx, file, handler.Filename)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to process HTML file",
			slog.String("error", err.Error()),
			slog.String("filename", handler.Filename))

		// JSONエラーレスポンスを返す
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		errMsg := fmt.Sprintf(`{"message": "Failed to process HTML file: %v"}`, err)
		fmt.Fprintln(w, errMsg)
		return
	}

	// 成功レスポンスを返す
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"message": "File processed successfully", "records_count": %d}`, recordsCount)
}
