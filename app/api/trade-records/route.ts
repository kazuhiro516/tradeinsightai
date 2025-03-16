import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // URLからクエリパラメーターを取得
  const { searchParams } = new URL(req.url);
  const filterParam = searchParams.get("filter");

  if (!filterParam) {
    return NextResponse.json(
      { error: "Missing filter parameter" },
      { status: 400 }
    );
  }

  let filter;
  try {
    // クエリパラメーターから受け取った文字列をパースしてJSONオブジェクトに変換
    filter = JSON.parse(filterParam);
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid filter JSON" },
      { status: 400 }
    );
  }

  try {
    // バックエンドのGo APIに接続
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/trade-records?filter=${encodeURIComponent(filterParam)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch trade records' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch trade records from backend:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
