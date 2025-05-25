import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー | TradeInsightAI',
  description: 'TradeInsightAIのプライバシーポリシーページです。個人情報の取り扱いについてご確認ください。',
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="flex justify-center items-start py-10 min-h-screen bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>プライバシーポリシー</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-6 dark:bg-gray-800">
          <p className="text-right text-xs text-muted-foreground">最終更新日：2025年5月15日</p>
          <p>
            TradeInsightAI（以下「本サービス」といいます）は、ユーザーのプライバシーを尊重し、個人情報の保護に最大限の注意を払っています。本プライバシーポリシーでは、当サービスにおける個人情報の取り扱いについて説明します。
          </p>
          <hr />
          <section>
            <h2>第1条（取得する情報）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>氏名、ニックネーム（任意）</li>
              <li>メールアドレス</li>
              <li>ログイン情報（Supabaseアカウント情報）</li>
              <li>アップロードされたトレード履歴ファイルおよびその分析データ</li>
              <li>サブスクリプションに関する情報（Stripeを通じて取得）</li>
              <li>サービスの利用状況に関するデータ（アクセスログ等）</li>
            </ul>
          </section>
          <hr />
          <section>
            <h2>第2条（情報の利用目的）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスの提供・維持・改善</li>
              <li>トレード履歴の保存および自動分析</li>
              <li>ユーザーへの分析結果・アドバイスの提供</li>
              <li>サポート対応、ユーザーからのお問い合わせ対応</li>
              <li>不正利用・セキュリティ対策</li>
              <li>利用規約違反時の対応</li>
              <li>Stripeを通じた決済処理と顧客管理</li>
            </ul>
          </section>
          <hr />
          <section>
            <h2>第3条（第三者提供）</h2>
            <p>当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>ユーザー本人の同意がある場合</li>
              <li>法令に基づき開示を求められた場合</li>
              <li>サービス運営上必要な業務委託先（例：決済処理業者）に対して、必要な範囲で提供する場合</li>
            </ul>
          </section>
          <hr />
          <section>
            <h2>第4条（情報の管理と保存）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>トレード履歴は、当社が管理するデータベースに保存されます。</li>
              <li>保存された情報は、適切なセキュリティ対策を講じて管理されます。</li>
              <li>アカウント削除に伴い、ユーザーのトレード履歴を含むデータは速やかに削除されます。</li>
            </ul>
          </section>
          <hr />
          <section>
            <h2>第5条（外部サービスの利用）</h2>
            <p>当サービスでは、以下の外部サービスを利用しています。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong>（ユーザー認証・データベース）</li>
              <li><strong>Stripe</strong>（決済処理）</li>
              <li><strong>OpenAI API</strong>（AIによる分析）</li>
            </ul>
            <p>これらのサービスにおいても、各事業者のプライバシーポリシーが適用されます。</p>
          </section>
          <hr />
          <section>
            <h2>第6条（Cookie等の利用）</h2>
            <p>本サービスでは、利便性向上・利用状況の解析のためにCookieやローカルストレージを使用することがあります。これにより個人を特定する情報を取得することはありません。</p>
          </section>
          <hr />
          <section>
            <h2>第7条（ユーザーの権利）</h2>
            <p>ユーザーは、当社に対して以下の請求を行うことができます。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>保有個人データの開示請求</li>
              <li>内容の訂正・追加・削除の請求</li>
              <li>利用停止・第三者提供停止の請求</li>
            </ul>
            <p>ご希望の場合は、下記の連絡先までご連絡ください。</p>
          </section>
          <hr />
          <section>
            <h2>第8条（プライバシーポリシーの変更）</h2>
            <p>本ポリシーの内容は、法令の変更やサービス内容の変更に応じて予告なく改定されることがあります。最新版は常に本サービス内にて公開されます。</p>
          </section>
          <hr />
          <section>
            <h2>お問い合わせ</h2>
            <p>本ポリシーに関するご質問・苦情・請求等は、以下の窓口までお問い合わせください。</p>
            <p><strong>Email</strong>: <a href="mailto:support@tradexai.app" className="underline">support@tradexai.app</a></p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
