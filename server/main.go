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
	// データベース接続の初期化
	db, err := infrastructures.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// リポジトリの作成
	tradeRepo := infrastructures.NewTradeRepository(db)
	// usecases
	tradeUsecase := usecases.NewTradeRecordUsecase(tradeRepo)
	// controller
	tradeController := controller.NewTradeController(tradeUsecase)

	// ルーターの設定
	r := mux.NewRouter()

	// エンドポイントの登録
	r.HandleFunc("/api/trade-records", tradeController.FilterTradesHandler).Methods("GET")

	fmt.Println("Server starting...")
	fmt.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
