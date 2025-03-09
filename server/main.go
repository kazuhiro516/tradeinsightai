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

	// ユースケースの初期化
	tradeRecordUsecase := usecases.NewTradeRecordUsecase(tradeRecordRepo)
	tradeFileUsecase := usecases.NewTradeFileUsecase(tradeFileRepo)

	// コントローラーの初期化
	tradeController := controller.NewTradeController(tradeRecordUsecase)
	uploadFileController := controller.NewUploadFileController(tradeFileUsecase, tradeRecordUsecase)

	// ルーターの設定
	router := mux.NewRouter()
	router.HandleFunc("/api/trades", tradeController.FilterTradesHandler).Methods("GET")
	router.HandleFunc("/api/trades", tradeController.CreateTradeRecordHandler).Methods("POST")
	// ファイルアップロード用のエンドポイント
	router.HandleFunc("/api/upload", uploadFileController.UploadTradeHTMLHandler).Methods("POST")

	fmt.Println("Server starting...")
	fmt.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
