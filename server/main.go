package main

import (
	"fmt"
	"log"
	"net/http"
	"server/controller"
	"server/infrastructures"
	"server/usecases"

	"github.com/gorilla/mux"
)

func main() {
	// データベースの初期化
	db, err := infrastructures.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// リポジトリの初期化
	tradeRecordRepo := infrastructures.NewTradeRecordRepository(db)
	tradeFileRepo := infrastructures.NewTradeFileRepository(db)
	userRepo := infrastructures.NewUserRepository(db)

	// ユースケースの初期化
	tradeRecordUsecase := usecases.NewTradeRecordUsecase(userRepo, tradeRecordRepo)
	tradeFileUsecase := usecases.NewTradeFileUsecase(tradeFileRepo)

	// コントローラーの初期化
	tradeController := controller.NewTradeController(tradeRecordUsecase)
	uploadFileController := controller.NewUploadFileController(tradeFileUsecase, tradeRecordUsecase)

	// ルーターの設定
	router := mux.NewRouter()
	router.HandleFunc("/api/trade-records", tradeController.FilterTradesHandler).Methods("GET")

	// ファイルアップロード用のエンドポイント
	router.HandleFunc("/api/upload", uploadFileController.UploadTradeHTMLHandler).Methods("POST")

	fmt.Println("Server starting...")
	fmt.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
