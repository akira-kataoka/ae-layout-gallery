#!/usr/bin/env node
/**
 * 各レイアウトテンプレートにサンプル内容を差し込んでプレビュー HTML を生成し、
 * カテゴリ別に並べたギャラリー (preview/index.html) を出力します。
 * ギャラリーからは「選択／一括ダウンロード(ZIP)」「インストーラ生成」が行えます。
 *
 *   node account-engagement/preview.mjs
 *
 * 実 API には接続しません（マージタグをダミー値に置換するのみ）。
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(__dirname, "templates");
const OUT_DIR = join(__dirname, "preview");

const ACCOUNT_NAME = "サンプル株式会社";
const ACCOUNT_WEB = "#";

const CATEGORY_LABEL = {
  landing: "ランディングページ",
  form: "フォーム",
  event: "イベント / ウェビナー",
  thankyou: "サンクスページ",
  utility: "配信設定",
};
const CATEGORY_ORDER = ["landing", "form", "event", "thankyou", "utility"];

// ---- サンプル差込内容 (%%content%%) -------------------------------------
const STD_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p>
  <p class="submit"><input type="submit" value="送信する"></p>
</form>`;

const CONTACT_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>お問い合わせ内容</label><br><textarea>製品の詳細について教えてください。</textarea></p>
  <p class="submit"><input type="submit" value="この内容で送信する"></p>
</form>`;

const NEWSLETTER_FORM = `<form>
  <p><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録する"></p>
</form>`;

const TOPICS_FORM = `<form>
  <p><input type="email" value="taro@example.com"></p>
  <fieldset><legend>興味のあるトピック</legend>
    <label><input type="checkbox" checked><span><span class="ti">プロダクト最新情報</span><span class="de">新機能やアップデートのお知らせ</span></span></label>
    <label><input type="checkbox" checked><span><span class="ti">活用ノウハウ</span><span class="de">業務に役立つTipsやHow-to</span></span></label>
    <label><input type="checkbox"><span><span class="ti">導入事例</span><span class="de">他社の成功事例インタビュー</span></span></label>
    <label><input type="checkbox"><span><span class="ti">セミナー・イベント</span><span class="de">オンライン/オフライン開催の案内</span></span></label>
  </fieldset>
  <p class="submit"><input type="submit" value="購読する"></p>
</form>`;

const DATA_REQUEST_FORM = `<form>
  <p><label>ご請求の種類</label><br><select><option selected>登録情報の開示</option><option>情報の訂正・追加</option><option>利用停止・消去</option><option>第三者提供の停止</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご登録のメールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご登録の電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>ご請求の詳細</label><br><textarea>退会済みアカウントの登録情報の消去を希望します。</textarea></p>
  <p class="submit"><input type="submit" value="この内容で請求する"></p>
</form>`;

const UPSELL_FORM = `<form>
  <p class="submit"><input type="submit" value="¥1,980で今すぐ追加する"></p>
</form>`;

const OPTIN_CONFIRM_FORM = `<form>
  <p><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録を確定する"></p>
</form>`;

const JOBFAIR_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご来場予定</label><br><select><option selected>午前（11:00〜）</option><option>午後（14:00〜）</option><option>未定</option></select></p>
  <p class="submit"><input type="submit" value="来場予約をする"></p>
</form>`;

const SUGGESTION_FORM = `<form>
  <p><label>ご意見の種類</label><br><select><option selected>サービスへの提案</option><option>不具合の報告</option><option>業務改善のアイデア</option><option>その他</option></select></p>
  <p><label>内容</label><br><textarea>検索結果の並び順を選べるようにしてほしいです。</textarea></p>
  <p><label>お名前（任意）</label><br><input type="text" value="山田 太郎"></p>
  <p><label>返信先メール（任意）</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="提案を送信する"></p>
</form>`;

const SURVEY_FORM = `<form>
  <fieldset><legend>総合満足度</legend>
    <label><input type="radio" name="sat">とても満足</label>
    <label><input type="radio" name="sat" checked>満足</label>
    <label><input type="radio" name="sat">普通</label>
    <label><input type="radio" name="sat">不満</label>
  </fieldset>
  <fieldset><legend>役立った点（複数可）</legend>
    <label><input type="checkbox" checked>使いやすさ</label>
    <label><input type="checkbox">サポート</label>
    <label><input type="checkbox">価格</label>
  </fieldset>
  <p><label>ご意見・ご要望</label><br><textarea>とても使いやすかったです。</textarea></p>
  <p class="submit"><input type="submit" value="回答を送信"></p>
</form>`;

const PREFERENCE_FORM = `<form>
  <fieldset><legend>受け取りたい情報</legend>
    <label><input type="checkbox" checked> 製品アップデート</label>
    <label><input type="checkbox" checked> イベント・セミナー案内</label>
    <label><input type="checkbox"> ニュースレター</label>
    <label><input type="checkbox"> キャンペーン情報</label>
  </fieldset>
  <fieldset><legend>配信頻度</legend>
    <label><input type="radio" name="freq" checked> 都度</label>
    <label><input type="radio" name="freq"> 週1回まとめて</label>
    <label><input type="radio" name="freq"> 月1回まとめて</label>
  </fieldset>
  <p class="submit"><input type="submit" value="設定を保存"></p>
</form>`;

const UNSUB_FORM = `<form>
  <label><input type="radio" name="r" checked> 配信頻度が多い</label>
  <label><input type="radio" name="r"> 内容が役に立たない</label>
  <label><input type="radio" name="r"> 登録した覚えがない</label>
  <label><input type="radio" name="r"> その他</label>
  <p style="margin-top:10px;"><textarea placeholder="ご意見（任意）"></textarea></p>
  <p class="submit"><input type="submit" value="配信を停止する"></p>
</form>`;

const LANDING_BODY = `<h2>こんな課題はありませんか？</h2>
<p>日々の業務に追われ、本来注力すべき仕事に時間を割けない——。本サービスは繰り返し作業を自動化し、チーム全体の生産性を底上げします。</p>
<h2>導入で得られること</h2>
<ul>
  <li>作業時間を平均40%削減</li>
  <li>ヒューマンエラーの大幅な低減</li>
  <li>リアルタイムな進捗の可視化</li>
</ul>
<p style="margin-top:24px;"><a href="#" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:700;">資料を請求する</a></p>`;

const PRICING_INTRO = `<p>すべてのプランで30日間の無料トライアルをご利用いただけます。年払いなら2ヶ月分お得。詳細はお気軽にお問い合わせください。</p>`;

const CASESTUDY_BODY = `<h2>導入の背景</h2>
<p>業務が属人化し、担当者の負荷が高止まりしていました。標準化と自動化を両立できる仕組みを探していたところ、本サービスの導入に至りました。</p>
<blockquote>「導入後、定型業務にかかる時間が体感で半分以下になりました。チームが本来の業務に集中できています。」</blockquote>
<h2>成果</h2>
<p>導入から3ヶ月で主要KPIが改善。現在は他部門への展開も進めています。</p>`;

const EVENT_BODY = `<h2>本セミナーの概要</h2>
<p>最新の市場動向と、現場で成果を出すための実践ノウハウを、第一線の登壇者が解説します。</p>
<h3>こんな方におすすめ</h3>
<ul><li>DX推進を任されている方</li><li>業務改善のヒントを探している方</li><li>同業他社の取り組みを知りたい方</li></ul>
<h3>当日のプログラム</h3>
<ul><li>14:00　開会・基調講演</li><li>14:40　導入事例セッション</li><li>15:30　質疑応答・個別相談</li></ul>`;

const THANKYOU_BODY = `<h1>送信が完了しました</h1>
<p>お問い合わせ／お申し込みいただきありがとうございます。<br>担当者より追ってご連絡いたしますので、今しばらくお待ちください。</p>`;

const THANKYOU_DL_BODY = `<h1>ダウンロードの準備ができました</h1>
<p>ご登録ありがとうございます。下のボタンから資料をダウンロードいただけます。</p>
<a class="ae-dl" href="#">⬇ 資料をダウンロード</a>`;

const CONFIRM_BODY = `<h1>確認メールを送信しました</h1>
<p>ご登録のメールアドレス宛に確認メールをお送りしました。<br>本文内のリンクをクリックして登録を完了してください。</p>`;

const REFERRAL_FORM = `<form>
  <p><label>あなたのお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご友人のメールアドレス</label><br><input type="email" value="friend@example.com"></p>
  <p class="submit"><input type="submit" value="招待を送る"></p>
</form>`;

const FAQ_BODY = `<p style="text-align:center;color:#475569;">上記で解決しない場合は、お気軽にサポートまでお問い合わせください。担当者が丁寧にご案内します。</p>`;

const COMPARISON_BODY = `<p>料金・機能・サポートを総合的に比較しても、当社サービスは高いコストパフォーマンスを実現しています。</p>`;

const JOBAPPLY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>希望職種</label><br><select><option>ソフトウェアエンジニア</option><option>デザイナー</option><option>PM</option></select></p>
  <p><label>履歴書 / 職務経歴書</label><br><input type="file"></p>
  <p><label>志望動機</label><br><textarea>貴社のプロダクトに強く共感し応募しました。</textarea></p>
  <p class="submit"><input type="submit" value="応募する"></p>
</form>`;

const RSVP_FORM = `<form>
  <p><label><input type="radio" name="rsvp" checked> 出席する</label> <label><input type="radio" name="rsvp"> 欠席する</label> <label><input type="radio" name="rsvp"> 検討中</label></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>参加人数</label><br><select><option>1名</option><option>2名</option><option>3名以上</option></select></p>
  <p class="submit"><input type="submit" value="回答を送信"></p>
</form>`;

const HYBRID_FORM = `<form>
  <p><label>参加形式</label><br><select><option selected>会場で参加</option><option>オンラインで参加</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p class="submit"><input type="submit" value="参加を申し込む"></p>
</form>`;

const APP_BODY = `<p>App Store / Google Play から無料でダウンロードできます。QRコードからもアクセス可能です。</p>`;

const COUPON_BODY = `<h1>ご登録ありがとうございます！</h1>
<p>特典として使える限定クーポンをご用意しました。<br>下記コードを購入時にご入力ください。</p>`;

const QUIZ_FORM = `<form>
  <fieldset><legend>Q1. 現在の主な課題は？</legend>
    <label><input type="radio" name="q1" checked> 業務効率化</label>
    <label><input type="radio" name="q1"> コスト削減</label>
    <label><input type="radio" name="q1"> 売上拡大</label>
  </fieldset>
  <fieldset><legend>Q2. ご利用人数は？</legend>
    <label><input type="radio" name="q2"> 〜10名</label>
    <label><input type="radio" name="q2" checked> 11〜50名</label>
    <label><input type="radio" name="q2"> 51名以上</label>
  </fieldset>
  <p><label>結果の送信先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="診断結果を見る"></p>
</form>`;

const NPS_FORM = `<form>
  <div class="ae-scale">
    ${[0,1,2,3,4,5,6,7,8,9,10].map((n)=>`<label><input type="radio" name="nps"${n===9?" checked":""}><span>${n}</span></label>`).join("")}
  </div>
  <div class="ae-ends"><span>全く思わない</span><span>強くそう思う</span></div>
  <p><label>そのスコアにした理由（任意）</label><br><textarea>サポートが手厚く、安心して使えるため。</textarea></p>
  <p class="submit"><input type="submit" value="送信する"></p>
</form>`;

const ONBOARDING_BODY = `<h1>ようこそ、サンプル株式会社へ！</h1>
<p>ご登録ありがとうございます。下のステップに沿って、さっそく始めましょう。</p>`;

const DONATION_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この金額で寄付する"></p>
</form>`;

const PWRESET_FORM = `<form>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="再設定リンクを送信"></p>
</form>`;

const QUOTE_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p><p><label>お名前</label><br><input type="text" value="山田 太郎"></p></div>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>ご希望の製品/サービス</label><br><select><option>スタータープラン</option><option>ビジネスプラン</option><option>エンタープライズ</option></select></p>
  <p><label>想定ご利用人数・ご要望</label><br><textarea>50名規模での導入を検討しています。</textarea></p>
  <p class="submit"><input type="submit" value="見積もりを依頼する"></p>
</form>`;

const BOOKING_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row">
    <p><label>希望日</label><br><input type="date" value="2026-07-01"></p>
    <p><label>時間帯</label><br><select><option>10:00</option><option>13:00</option><option selected>15:00</option><option>17:00</option></select></p>
  </div>
  <p class="submit"><input type="submit" value="この日時で予約する"></p>
</form>`;

const MEMBER_CANCEL_FORM = `<form>
  <p><label>退会の理由</label><br><select><option selected>あまり使わなくなった</option><option>料金が高い</option><option>機能に不満がある</option><option>他のサービスに移行する</option><option>その他</option></select></p>
  <p><label>差し支えなければ詳しく</label><br><textarea>使う機会が減ってしまいました。</textarea></p>
  <p><label>ご登録のメールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="退会を確定する"></p>
</form>`;

const ALUMNI_FORM = `<form>
  <p><label><input type="radio" name="rsvp" checked> 出席する</label> <label><input type="radio" name="rsvp"> 欠席する</label></p>
  <p><label>お名前（旧姓があれば併記）</label><br><input type="text" value="山田 太郎"></p>
  <p><label>卒業年・期</label><br><input type="text" value="2006年卒・第18期"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>近況・ひとこと</label><br><textarea>久しぶりにみんなに会えるのを楽しみにしています！</textarea></p>
  <p class="submit"><input type="submit" value="出欠を回答する"></p>
</form>`;

const CATERING_FORM = `<form>
  <p><label>ご希望コース</label><br><select><option selected>スタンダード（¥1,500/人）</option><option>プレミアム（¥2,800/人）</option><option>ヘルシー（¥1,800/人）</option></select></p>
  <div class="row"><p><label>人数</label><br><input type="number" min="1" value="20"></p><p><label>お届け日</label><br><input type="date" value="2026-07-20"></p></div>
  <p><label>お届け先住所</label><br><input type="text" value="東京都千代田区1-1-1"></p>
  <p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="注文内容を確認する"></p>
</form>`;

const FANMEET_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ファンクラブ会員番号（任意）</label><br><input type="text" value="FC-000123"></p>
  <p class="submit"><input type="submit" value="抽選に応募する"></p>
</form>`;

const BETA_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>主に使うデバイス</label><br><select><option selected>iPhone / iOS</option><option>Android</option><option>PC（Windows）</option><option>PC（Mac）</option></select></p>
  <p><label>参加への意気込み（任意）</label><br><textarea>毎日使うツールなので、改善に貢献したいです！</textarea></p>
  <p class="submit"><input type="submit" value="テスターに応募する"></p>
</form>`;

const TEAM_ENTRY_FORM = `<form>
  <p><label>チーム名</label><br><input type="text" value="サンプルファイターズ"></p>
  <p><label>エントリー部門</label><br><select><option selected>オープンの部</option><option>エンジョイの部</option><option>ファミリーの部</option></select></p>
  <p><label>代表者のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p class="submit"><input type="submit" value="チームでエントリーする"></p>
</form>`;

const ROADSHOW_FORM = `<form>
  <p><label>参加する都市</label><br><select><option selected>東京（9.06）</option><option>大阪（9.13）</option><option>名古屋（9.20）</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この都市で申し込む"></p>
</form>`;

const BULKORDER_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p>
  <p><label>ご要望（納期・請求書払い等）</label><br><textarea>月末までに納品希望、請求書払いを希望します。</textarea></p>
  <p class="submit"><input type="submit" value="注文・見積を依頼する"></p>
</form>`;

const ENROLL_FORM = `<form>
  <p><label>受講するコース</label><br><select><option selected>入門コース（全6回）</option><option>実践コース（全12回）</option></select></p>
  <p><label>受講者のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>受講形態</label><br><select><option selected>教室で受講</option><option>オンラインで受講</option></select></p>
  <p class="submit"><input type="submit" value="受講を申し込む"></p>
</form>`;

const LAUNCH_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="視聴に登録する"></p>
</form>`;

const MULTIGIFT_FORM = `<form>
  <p><label>贈り主のお名前</label><br><input type="text" value="山田 太郎"></p>
  <fieldset><legend>贈り先 1</legend>
    <p><label>お名前</label><br><input type="text" value="鈴木 花子"></p>
    <p><label>メールアドレス</label><br><input type="email" value="hanako@example.com"></p>
    <p><label>メッセージ</label><br><textarea>いつもありがとう！</textarea></p>
  </fieldset>
  <fieldset><legend>贈り先 2</legend>
    <p><label>お名前</label><br><input type="text" value="佐藤 健"></p>
    <p><label>メールアドレス</label><br><input type="email" value="ken@example.com"></p>
    <p><label>メッセージ</label><br><textarea>お祝いの気持ちです。</textarea></p>
  </fieldset>
  <p class="submit"><input type="submit" value="まとめて贈る"></p>
</form>`;

const BOOTH_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご興味のある内容</label><br><select><option selected>製品の詳細を知りたい</option><option>導入を検討している</option><option>情報収集中</option></select></p>
  <p class="submit"><input type="submit" value="ブースに入場する"></p>
</form>`;

const SURVEY_COMMENT_FORM = `<form>
  <p><label>ご意見・ご感想（自由記述）</label><br><textarea>全体的に満足ですが、価格がもう少し手頃だと嬉しいです。</textarea></p>
  <p><label>メールアドレス（任意・特典のご連絡用）</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="アンケートを送信する"></p>
</form>`;

const REVIEW_BODY = `<h1>ご利用ありがとうございました</h1>
<p>サービスはいかがでしたか？<br>よろしければ評価とご感想をお聞かせください。</p>`;

const SAMPLE_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row"><p><label>郵便番号</label><br><input type="text" value="100-0001"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご住所</label><br><input type="text" value="東京都千代田区..."></p>
  <p class="submit"><input type="submit" value="無料サンプルを請求する"></p>
</form>`;

const CALENDAR_BODY = `<h1>お申し込みが完了しました</h1>
<p>ご登録ありがとうございます。下記の日時で受け付けました。<br>忘れないようカレンダーに追加しておきましょう。</p>`;

const SHARE_BODY = `<h1>ご参加ありがとうございます！</h1>
<p>よろしければ、お知り合いにもシェアしていただけると嬉しいです。</p>`;

const REFERRAL_RECRUIT_FORM = `<form>
  <p><label>あなた（紹介者）のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>あなたのメールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご紹介者のお名前</label><br><input type="text" value="鈴木 一郎"></p>
  <p><label>想定ポジション</label><br><select><option selected>エンジニア</option><option>デザイナー</option><option>営業</option></select></p>
  <p><label>ひとことコメント</label><br><textarea>前職の同僚で、開発力が高くおすすめです。</textarea></p>
  <p class="submit"><input type="submit" value="知人を紹介する"></p>
</form>`;

const INTERVIEW_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>第1希望日</label><br><input type="date" value="2026-07-22"></p>
  <p><label>面接形式</label><br><label class="opt"><input type="radio" name="fmt" checked> オンライン</label><label class="opt"><input type="radio" name="fmt"> 対面</label></p>
  <p class="submit"><input type="submit" value="この日程で申し込む"></p>
</form>`;

const CLINIC_FORM = `<form>
  <p><label>診療科</label><br><select><option selected>内科</option><option>皮膚科</option><option>整形外科</option><option>歯科</option></select></p>
  <div class="row"><p><label>担当医</label><br><select><option selected>指定なし</option><option>佐藤医師</option><option>鈴木医師</option></select></p><p><label>希望日</label><br><input type="date" value="2026-07-16"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p></div>
  <p class="submit"><input type="submit" value="予約する"></p>
</form>`;

const DELETE_FORM = `<form>
  <p><label>削除の理由（任意）</label><br><select><option selected>使わなくなった</option><option>別サービスへ移行</option><option>機能に不満</option><option>その他</option></select></p>
  <p><label>ご登録メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label class="chk"><input type="checkbox"> データが完全に削除され、復元できないことに同意します</label></p>
  <p class="submit"><input type="submit" value="アカウントを削除する"></p>
</form>`;

const RENOV_FORM = `<form>
  <p><label>工事種別</label><br><select><option selected>キッチン</option><option>浴室・水回り</option><option>外壁・屋根</option><option>全面リフォーム</option></select></p>
  <div class="row"><p><label>築年数</label><br><input type="text" value="約20年"></p><p><label>ご予算</label><br><select><option>〜100万円</option><option selected>100〜300万円</option><option>300万円以上</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="無料で見積もり依頼"></p>
</form>`;

const MEETING_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>ご希望の時間帯</label><br><select><option>初日 午前</option><option selected>初日 午後</option><option>2日目 午前</option><option>2日目 午後</option></select></p>
  <p class="submit"><input type="submit" value="商談を予約する"></p>
</form>`;

const RETURN_FORM = `<form>
  <p><label>注文番号</label><br><input type="text" value="ORD-20260620-0188"></p>
  <p><label>対象商品</label><br><select><option selected>ランニングシューズ</option><option>スポーツソックス</option></select></p>
  <p><label>返品/交換の理由</label><br><select><option selected>サイズが合わない</option><option>イメージと違う</option><option>不良・破損</option><option>その他</option></select></p>
  <p><label>詳細（任意）</label><br><textarea>ワンサイズ大きいものに交換希望です。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="申請を送信する"></p>
</form>`;

const PAUSE_FORM = `<form>
  <p><label>停止期間</label><br><select><option>1ヶ月</option><option selected>2ヶ月</option><option>3ヶ月</option></select></p>
  <p><label>差し支えなければ理由を</label><br><select><option selected>しばらく使わない</option><option>費用を見直したい</option><option>その他</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="一時停止を申請する"></p>
</form>`;

const PHOTO_CONTEST_FORM = `<form>
  <p><label>作品タイトル</label><br><input type="text" value="夏の思い出"></p>
  <p><label>写真をアップロード</label><br><input type="file"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="作品を応募する"></p>
</form>`;

const SPEAKER_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>ご所属・肩書</label><br><input type="text" value="株式会社サンプル / CTO"></p>
  <p><label>講演テーマ</label><br><input type="text" value="生成AIで変わる開発現場"></p>
  <p><label>概要（200字程度）</label><br><textarea>現場での活用事例と、導入のポイントをお話しします。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登壇をエントリーする"></p>
</form>`;

const WORKSHOP_FORM = `<form>
  <p><label>コース</label><br><select><option selected>手びねり体験（90分）</option><option>電動ろくろ（120分）</option><option>絵付け体験（60分）</option></select></p>
  <div class="row"><p><label>希望日</label><br><input type="date" value="2026-07-20"></p><p><label>参加人数</label><br><select><option selected>1名</option><option>2名</option><option>3名以上</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="体験を予約する"></p>
</form>`;

const SPONSOR_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p><p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p></div>
  <p><label>ご希望の協賛プラン</label><br><select><option>ブロンズ</option><option selected>シルバー</option><option>ゴールド</option><option>相談したい</option></select></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>ご質問・ご要望</label><br><textarea>ブース出展と登壇枠について相談したいです。</textarea></p>
  <p class="submit"><input type="submit" value="申し込む / 相談する"></p>
</form>`;

const OFFER_FORM = `<form>
  <p><label>あなたの希望価格（円）</label><br><input type="number" value="1750000"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この価格でオファーする"></p>
</form>`;

const UPGRADE_FORM = `<form>
  <p><label>会員番号</label><br><input type="text" value="MB-001234"></p>
  <p><label>変更後のプラン</label><br><select><option selected>ゴールド会員（年額 ¥9,800）</option><option>プラチナ会員（年額 ¥19,800）</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="プランを変更する"></p>
</form>`;

const DETAILED_FEEDBACK_FORM = `<form>
  <fieldset><legend>内容の満足度</legend><div class="scale"><label><input type="radio" name="c1" checked>5</label><label><input type="radio" name="c1">4</label><label><input type="radio" name="c1">3</label><label><input type="radio" name="c1">2</label><label><input type="radio" name="c1">1</label></div></fieldset>
  <fieldset><legend>運営・進行</legend><div class="scale"><label><input type="radio" name="c2" checked>5</label><label><input type="radio" name="c2">4</label><label><input type="radio" name="c2">3</label><label><input type="radio" name="c2">2</label><label><input type="radio" name="c2">1</label></div></fieldset>
  <p><label>総合評価</label><br><select><option selected>大変満足</option><option>満足</option><option>普通</option><option>不満</option></select></p>
  <p><label>ご意見・ご要望</label><br><textarea>具体的な事例が多く参考になりました。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="アンケートを送信"></p>
</form>`;

const JOBALERT_FORM = `<form>
  <fieldset><legend>希望職種（複数可）</legend>
    <label><input type="checkbox" checked> エンジニア</label>
    <label><input type="checkbox"> デザイナー</label>
    <label><input type="checkbox"> 営業</label>
    <label><input type="checkbox"> マーケティング</label>
  </fieldset>
  <p><label>勤務地</label><br><select><option selected>東京</option><option>大阪</option><option>リモート可</option><option>全国</option></select></p>
  <p><label>配信頻度</label><br><select><option selected>毎日</option><option>週1回</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="アラートを登録する"></p>
</form>`;

const TRIAL_EXT_FORM = `<form>
  <p><label>現在のご利用状況</label><br><select><option selected>まだ十分に試せていない</option><option>検討中で時間が欲しい</option><option>社内承認の手続き中</option></select></p>
  <p><label>ご要望・質問（任意）</label><br><textarea>機能Aをもう少し検証したいです。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="トライアルを延長する"></p>
</form>`;

const GIFTWRAP_FORM = `<form>
  <p><label>ラッピング</label><br><select><option selected>標準（無料）</option><option>プレミアム（+¥550）</option><option>ラッピング不要</option></select></p>
  <p><label>のし</label><br><select><option selected>なし</option><option>お祝い（蝶結び）</option><option>内祝い</option><option>御礼</option></select></p>
  <p><label>メッセージカード（任意）</label><br><textarea>お誕生日おめでとうございます。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この内容で指定する"></p>
</form>`;

const WISHLIST_FORM = `<form>
  <p><label>リスト名</label><br><input type="text" value="お誕生日ほしいものリスト"></p>
  <p><label>公開設定</label><br><select><option selected>リンクを知っている人のみ</option><option>友達まで公開</option><option>非公開</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <p><label>メールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p class="submit"><input type="submit" value="リストを作成する"></p>
</form>`;

const CATALOG_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>郵便番号</label><br><input type="text" value="100-0001"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>ご住所</label><br><input type="text" value="東京都千代田区..."></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="カタログを請求する"></p>
</form>`;

const WARRANTY_EXT_FORM = `<form>
  <p><label>対象製品</label><br><select><option selected>テレビ</option><option>冷蔵庫</option><option>PC</option></select></p>
  <div class="row"><p><label>購入日</label><br><input type="date" value="2026-06-01"></p><p><label>延長プラン</label><br><select><option>+1年</option><option selected>+3年</option><option>+5年</option></select></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="延長保証を申し込む"></p>
</form>`;

const STOCK_FORM = `<form>
  <div class="row"><p><label>サイズ</label><br><select><option>25.0cm</option><option selected>26.0cm</option><option>27.0cm</option></select></p><p><label>受取店舗</label><br><select><option selected>サンプル駅前店</option><option>みなと店</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p></div>
  <p class="submit"><input type="submit" value="取り置きを依頼する"></p>
</form>`;

const APPT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この時間で予約する"></p>
</form>`;

const VIEWING_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <div class="row"><p><label>第1希望日</label><br><input type="date" value="2026-07-26"></p><p><label>時間帯</label><br><select><option selected>午前</option><option>午後</option><option>夕方以降</option></select></p></div>
  <p><label>ご質問・ご要望</label><br><textarea>駐車場の空き状況も知りたいです。</textarea></p>
  <p class="submit"><input type="submit" value="内見を予約する"></p>
</form>`;

const GROUP_FORM = `<form>
  <div class="row"><p><label>ご利用人数</label><br><input type="number" value="20"></p><p><label>ご希望日</label><br><input type="date" value="2026-08-22"></p></div>
  <p><label>ご利用用途</label><br><select><option selected>宴会・懇親会</option><option>研修・会議</option><option>貸切イベント</option></select></p>
  <p><label>幹事様のお名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="団体予約を相談する"></p>
</form>`;

const TRANSLATION_FORM = `<form>
  <p><label>言語ペア</label><br><select><option selected>日本語 → 英語</option><option>英語 → 日本語</option><option>日本語 → 中国語</option><option>その他</option></select></p>
  <div class="row"><p><label>分量(文字/ワード数の目安)</label><br><input type="text" value="約5,000文字"></p><p><label>ご希望納期</label><br><select><option>特急(当日〜翌日)</option><option selected>通常(3〜5営業日)</option><option>急がない</option></select></p></div>
  <p><label>原稿ファイル(任意)</label><br><input type="file"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="見積もりを依頼する"></p>
</form>`;

const REPAIR_FORM = `<form>
  <p><label>対象製品</label><br><select><option selected>スマートフォン</option><option>ノートPC</option><option>家電</option><option>その他</option></select></p>
  <p><label>症状</label><br><select><option selected>電源が入らない</option><option>画面割れ</option><option>バッテリーの劣化</option><option>その他</option></select></p>
  <p><label>購入日（保証確認用）</label><br><input type="date" value="2025-09-01"></p>
  <p><label>詳しい状況</label><br><textarea>落下後に画面が映らなくなりました。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="修理を申し込む"></p>
</form>`;

const TRADEIN_FORM = `<form>
  <div class="row"><p><label>品目</label><br><select><option selected>スマートフォン</option><option>ノートPC</option><option>カメラ</option><option>ゲーム機</option></select></p><p><label>状態</label><br><select><option>新品同様</option><option selected>美品</option><option>使用感あり</option><option>難あり</option></select></p></div>
  <p><label>型番・メーカー</label><br><input type="text" value="Model X-200 / SampleCorp"></p>
  <p><label>写真（任意）</label><br><input type="file"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="査定を申し込む"></p>
</form>`;

const LOOKUP_FORM = `<form>
  <p><label>受付番号</label><br><input type="text" value="RV-20260710-014"></p>
  <p><label>生年月日</label><br><input type="date" value="1990-04-01"></p>
  <p><label>登録メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="結果を照会する"></p>
</form>`;

const TAKEOUT_FORM = `<form>
  <div class="row"><p><label>メニュー</label><br><select><option selected>日替わり弁当</option><option>唐揚げ弁当</option><option>幕の内弁当</option></select></p><p><label>個数</label><br><select><option selected>1</option><option>2</option><option>3</option></select></p></div>
  <p><label>受取時間</label><br><select><option>12:00</option><option selected>12:30</option><option>13:00</option><option>18:00</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p class="submit"><input type="submit" value="この内容で注文する"></p>
</form>`;

const RENTAL_FORM = `<form>
  <p><label>品目</label><br><select><option selected>電動アシスト自転車</option><option>キャンプ用品セット</option><option>撮影機材</option></select></p>
  <div class="row"><p><label>貸出日</label><br><input type="date" value="2026-07-12"></p><p><label>返却日</label><br><input type="date" value="2026-07-14"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約をリクエスト"></p>
</form>`;

const PET_FORM = `<form>
  <div class="row"><p><label>飼い主のお名前</label><br><input type="text" value="山田 太郎"></p><p><label>ペットのお名前</label><br><input type="text" value="モカ"></p></div>
  <div class="row"><p><label>種類</label><br><select><option selected>犬</option><option>猫</option><option>うさぎ</option><option>その他</option></select></p><p><label>ご希望メニュー</label><br><select><option selected>シャンプー＋カット</option><option>シャンプーのみ</option><option>爪切り・部分ケア</option></select></p></div>
  <p><label>ご希望日</label><br><input type="date" value="2026-07-18"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約する"></p>
</form>`;

const REVIEW_POST_FORM = `<form>
  <p><label>ご感想</label><br><textarea>サポートが丁寧で、初めてでも安心して使えました。</textarea></p>
  <p><label>ニックネーム</label><br><input type="text" value="たろう"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="レビューを投稿する"></p>
</form>`;

const BABY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 花子"></p>
  <p><label>メールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p><label>出産予定日</label><br><input type="date" value="2026-11-15"></p>
  <p><label>性別</label><br><label class="opt"><input type="radio" name="sex" checked> 男の子</label><label class="opt"><input type="radio" name="sex"> 女の子</label><label class="opt"><input type="radio" name="sex"> 未定</label></p>
  <p><label>欲しいものカテゴリ</label><br><select><option selected>ベビー服</option><option>授乳・離乳食</option><option>ベビーカー・チャイルドシート</option></select></p>
  <p class="submit"><input type="submit" value="レジストリを作成する"></p>
</form>`;

const SHAREHOLDER_FORM = `<form>
  <p><label>お名前（株主名）</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>保有株数</label><br><select><option>100〜499株</option><option selected>500〜999株</option><option>1,000株以上</option></select></p><p><label>ご希望の優待品</label><br><select><option selected>カタログギフトA</option><option>自社製品セット</option><option>QUOカード</option></select></p></div>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="優待を申し込む"></p>
</form>`;

const REALESTATE_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご予算</label><br><select><option>〜3,000万円</option><option selected>3,000〜4,000万円</option><option>4,000万円以上</option></select></p>
  <p><label>内見希望日</label><br><input type="date" value="2026-07-19"></p>
  <p class="submit"><input type="submit" value="内見を予約する"></p>
</form>`;

const MOVING_FORM = `<form>
  <div class="row"><p><label>現住所(市区町村)</label><br><input type="text" value="東京都サンプル区"></p><p><label>新住所(市区町村)</label><br><input type="text" value="神奈川県サンプル市"></p></div>
  <div class="row"><p><label>間取り</label><br><select><option>ワンルーム</option><option selected>2LDK</option><option>3LDK以上</option></select></p><p><label>引越し希望日</label><br><input type="date" value="2026-08-10"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="無料で一括見積"></p>
</form>`;

const WEDDING_RSVP_FORM = `<form>
  <p class="att"><label><input type="radio" name="att" checked> 出席</label><label><input type="radio" name="att"> 欠席</label></p>
  <p><label>お名前</label><br><input type="text" value="鈴木 一郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="ichiro@example.com"></p>
  <p><label>アレルギー・ご要望（任意）</label><br><input type="text" value="特になし"></p>
  <p class="submit"><input type="submit" value="お返事を送信する"></p>
</form>`;

const TOUR_FORM = `<form>
  <p><label>行き先</label><br><select><option selected>南の島リゾート 3日間</option><option>ヨーロッパ周遊 7日間</option><option>国内温泉 2日間</option></select></p>
  <div class="row"><p><label>出発希望日</label><br><input type="date" value="2026-09-20"></p><p><label>参加人数</label><br><select><option>1名</option><option selected>2名</option><option>3〜4名</option><option>5名以上</option></select></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約をリクエストする"></p>
</form>`;

const KIOSK_FORM = `<form>
  <p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録する"></p>
</form>`;

const LOAN_FORM = `<form>
  <div class="row"><p><label>借入希望額</label><br><select><option>〜50万円</option><option selected>50〜100万円</option><option>100〜300万円</option></select></p><p><label>ご年収</label><br><select><option>〜300万円</option><option selected>300〜500万円</option><option>500万円以上</option></select></p></div>
  <p><label>雇用形態</label><br><select><option selected>正社員</option><option>契約・派遣</option><option>自営業</option><option>パート・アルバイト</option></select></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p class="submit"><input type="submit" value="仮審査を申し込む"></p>
</form>`;

const SUPPORT_FORM = `<form>
  <div class="row"><p><label>お問い合わせ種別</label><br><select><option selected>技術的な不具合</option><option>使い方の質問</option><option>請求・契約</option></select></p><p><label>緊急度</label><br><select><option>低</option><option selected>中</option><option>高（業務停止）</option></select></p></div>
  <p><label>件名</label><br><input type="text" value="ログインできない"></p>
  <p><label>詳細</label><br><textarea>本日朝からログイン時にエラーが表示されます。スクリーンショットを添付予定です。</textarea></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="チケットを送信"></p>
</form>`;

const SUBBOX_FORM = `<form>
  <p><label>プラン</label><br><select><option>お試し（3点）</option><option selected>レギュラー（5点）</option><option>デラックス（8点）</option></select></p>
  <p><label>お届け頻度</label><br><select><option selected>毎月</option><option>隔月</option><option>3ヶ月ごと</option></select></p>
  <p><label>開始月</label><br><select><option selected>今月から</option><option>翌月から</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="定期便を申し込む"></p>
</form>`;

const FACILITY_FORM = `<form>
  <p><label>ご利用施設</label><br><select><option selected>会議室A（〜8名）</option><option>会議室B（〜20名）</option><option>多目的ホール</option></select></p>
  <div class="row"><p><label>利用日</label><br><input type="date" value="2026-07-12"></p><p><label>時間帯</label><br><select><option>午前</option><option selected>午後</option><option>終日</option></select></p></div>
  <p><label>利用人数</label><br><select><option>〜5名</option><option selected>6〜10名</option><option>11名以上</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="予約を申し込む"></p>
</form>`;

const BIRTHDAY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>生年月日</label><br><input type="date" value="1992-08-15"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="登録して特典を受け取る"></p>
</form>`;

const MONITOR_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <fieldset><legend>性別</legend><label class="opt"><input type="radio" name="g" checked> 男性</label><label class="opt"><input type="radio" name="g"> 女性</label><label class="opt"><input type="radio" name="g"> 回答しない</label></fieldset>
  <p><label>年代</label><br><select><option>20代</option><option selected>30代</option><option>40代</option><option>50代以上</option></select></p>
  <fieldset><legend>関心分野（複数可）</legend><label class="opt"><input type="checkbox" checked> 美容</label><label class="opt"><input type="checkbox"> 食品</label><label class="opt"><input type="checkbox"> IT</label></fieldset>
  <p class="submit"><input type="submit" value="モニターに応募する"></p>
</form>`;

const RECEIPT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>レシート画像</label><br><input type="file"></p>
  <p><label>購入金額（税込）</label><br><input type="text" value="2,480円"></p>
  <p class="submit"><input type="submit" value="応募する"></p>
</form>`;

const PETITION_FORM = `<form>
  <p><label>お名前（ニックネーム可）</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label class="chk"><input type="checkbox" checked> 名前を賛同者一覧に表示してもよい</label></p>
  <p class="submit"><input type="submit" value="この提案に賛同する"></p>
</form>`;

const VOLUNTEER_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>希望する活動</label><br><select><option selected>会場運営サポート</option><option>清掃・環境活動</option><option>子ども向けプログラム</option></select></p>
  <p><label>参加可能日</label><br><label class="day"><input type="checkbox" checked> 土</label><label class="day"><input type="checkbox"> 日</label><label class="day"><input type="checkbox"> 平日</label></p>
  <p class="submit"><input type="submit" value="参加を申し込む"></p>
</form>`;

const INSURANCE_FORM = `<form>
  <div class="row"><p><label>生年月日</label><br><input type="date" value="1990-04-01"></p><p><label>性別</label><br><label class="opt"><input type="radio" name="sex" checked> 男性</label><label class="opt"><input type="radio" name="sex"> 女性</label></p></div>
  <p><label>ご希望のプラン</label><br><select><option>掛け捨て(安心重視)</option><option selected>バランス型</option><option>貯蓄型</option></select></p>
  <p><label>結果送付先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="見積もりを受け取る"></p>
</form>`;

const VENDOR_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="株式会社サンプル商事"></p><p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p></div>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>業種・カテゴリ</label><br><select><option selected>原材料・部品</option><option>物流・運送</option><option>ITサービス</option><option>その他</option></select></p>
  <p><label>主な取扱品目・サービス</label><br><textarea>各種金属部品の製造・供給を行っています。</textarea></p>
  <p class="submit"><input type="submit" value="登録を申請する"></p>
</form>`;

const STUDENT_FORM = `<form>
  <p><label>学校名</label><br><input type="text" value="サンプル大学"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス（学校ドメイン推奨）</label><br><input type="email" value="taro@sample.ac.jp"></p>
  <p><label>学生証のアップロード</label><br><input type="file"></p>
  <p class="submit"><input type="submit" value="学割を申請する"></p>
</form>`;

const SAFETY_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p class="status"><label><input type="radio" name="st" checked> 無事です</label><label><input type="radio" name="st"> 軽傷</label><label><input type="radio" name="st"> 支援が必要</label></p>
  <p><label>現在地</label><br><select><option selected>自宅</option><option>勤務先</option><option>外出先</option><option>避難所</option></select></p>
  <p><label>連絡先電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>状況・伝達事項（任意）</label><br><textarea>家族も全員無事です。</textarea></p>
  <p class="submit"><input type="submit" value="安否を報告する"></p>
</form>`;

const RECUR_DONATION_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="マンスリーサポーターになる"></p>
</form>`;

const HEALTH_FORM = `<form>
  <p><label>受診コース</label><br><select><option>基本コース</option><option selected>充実コース</option><option>人間ドック</option></select></p>
  <p><label>オプション検査</label><br><label class="opt"><input type="checkbox" checked> 脳ドック</label><label class="opt"><input type="checkbox"> 胃カメラ</label><label class="opt"><input type="checkbox"> 婦人科</label></p>
  <p><label>ご希望日</label><br><input type="date" value="2026-07-22"></p>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="受診を予約する"></p>
</form>`;

const POINTS_FORM = `<form>
  <p><label>交換する景品</label><br><select><option>コーヒーチケット（500pt）</option><option selected>選べるギフト（3,000pt）</option><option>オリジナルグッズ（1,200pt）</option></select></p>
  <p><label>送付先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="ポイントを交換する"></p>
</form>`;

const GIFTCARD_FORM = `<form>
  <p><label>金額</label><br><select><option>¥3,000</option><option selected>¥5,000</option><option>¥10,000</option></select></p>
  <p><label>送り先のメールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p><label>メッセージ</label><br><textarea>お誕生日おめでとう！</textarea></p>
  <p><label>送り主のお名前</label><br><input type="text" value="山田 太郎"></p>
  <p class="submit"><input type="submit" value="ギフトを購入して贈る"></p>
</form>`;

const POSTEVENT_FORM = `<form>
  <fieldset><legend>満足度</legend>
    <label><input type="radio" name="sat" checked> 大変満足</label>
    <label><input type="radio" name="sat"> 満足</label>
    <label><input type="radio" name="sat"> 普通</label>
    <label><input type="radio" name="sat"> 不満</label>
  </fieldset>
  <p><label>印象に残った点・ご感想</label><br><textarea>事例セッションが具体的で参考になりました。</textarea></p>
  <p><label>次回取り上げてほしいテーマ</label><br><input type="text" value="生成AIの活用"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="アンケートを送信"></p>
</form>`;

const CANCEL_FORM = `<form>
  <p><label>予約番号</label><br><input type="text" value="RV-20260710-014"></p>
  <p><label>ご希望の操作</label><br><label class="opt"><input type="radio" name="op" checked> 日程を変更</label><label class="opt"><input type="radio" name="op"> キャンセル</label></p>
  <p><label>変更希望日（変更の場合）</label><br><input type="date" value="2026-07-15"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この内容で手続きする"></p>
</form>`;

const ACTIVATION_FORM = `<form>
  <p><label>アクティベーションコード</label><br><input type="text" value="TRIAL-7K9D-2XQ8"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="体験版を有効化"></p>
</form>`;

const RETENTION_FORM = `<form>
  <fieldset>
    <label class="r"><input type="radio" name="why" checked> 料金が高い</label>
    <label class="r"><input type="radio" name="why"> あまり使わなかった</label>
    <label class="r"><input type="radio" name="why"> 他サービスに移行</label>
    <label class="r"><input type="radio" name="why"> その他</label>
  </fieldset>
  <p><textarea placeholder="差し支えなければ詳しくお聞かせください（任意）"></textarea></p>
  <p class="submit"><input type="submit" value="解約手続きを続ける"></p>
</form>`;

const SCHEDULE_FORM = `<form>
  <fieldset><legend>候補日時（複数選択可）</legend>
    <label class="slot"><input type="checkbox" checked> 7/8(火) 10:00-11:00</label>
    <label class="slot"><input type="checkbox"> 7/8(火) 15:00-16:00</label>
    <label class="slot"><input type="checkbox" checked> 7/9(水) 13:00-14:00</label>
    <label class="slot"><input type="checkbox"> 7/10(木) 11:00-12:00</label>
  </fieldset>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この日程で回答する"></p>
</form>`;

const TALENT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>希望職種</label><br><select><option selected>エンジニア</option><option>デザイナー</option><option>営業</option><option>マーケティング</option></select></p>
  <p><label>経験年数</label><br><select><option>〜3年</option><option selected>3〜7年</option><option>8年以上</option></select></p>
  <p><label>履歴書 / 職務経歴書（任意）</label><br><input type="file"></p>
  <p class="submit"><input type="submit" value="キャリア登録する"></p>
</form>`;

const PARTNER_FORM = `<form>
  <div class="row"><p><label>会社名</label><br><input type="text" value="株式会社サンプル"></p><p><label>ご担当者名</label><br><input type="text" value="山田 太郎"></p></div>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="03-0000-0000"></p></div>
  <p><label>希望パートナー形態</label><br><select><option selected>販売代理店</option><option>紹介パートナー</option><option>OEM/技術提携</option></select></p>
  <p><label>取扱予定の地域・分野</label><br><textarea>関東圏の中小企業向けに販売を検討しています。</textarea></p>
  <p class="submit"><input type="submit" value="申し込む"></p>
</form>`;

const PROFILE_FORM = `<form>
  <p><label>業種</label><br><select><option>IT・通信</option><option selected>製造</option><option>小売</option><option>サービス</option></select></p>
  <p><label>役職</label><br><input type="text" value="マーケティング マネージャー"></p>
  <p><label>関心のあるテーマ（複数可）</label><br><label class="chk"><input type="checkbox" checked>業務効率化</label><label class="chk"><input type="checkbox">売上拡大</label><label class="chk"><input type="checkbox">人材育成</label></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="プロフィールを更新"></p>
</form>`;

const WARRANTY_FORM = `<form>
  <p><label>製品名 / 型番</label><br><input type="text" value="Model X-200"></p>
  <div class="row"><p><label>シリアル番号</label><br><input type="text" value="SN-00012345"></p><p><label>購入日</label><br><input type="date" value="2026-06-01"></p></div>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="保証を登録する"></p>
</form>`;

const FEEDBACK_FORM = `<form>
  <p><label>種別</label><br><select><option selected>機能リクエスト</option><option>不具合報告</option><option>改善提案</option></select></p>
  <p><label>タイトル</label><br><input type="text" value="一覧画面に並び替え機能がほしい"></p>
  <p><label>詳細</label><br><textarea>列ヘッダーをクリックして昇順/降順に並び替えできると便利です。</textarea></p>
  <p><label>メールアドレス（任意・経過連絡用）</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="送信する"></p>
</form>`;

const PREORDER_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>カラー</label><br><select><option selected>マットブラック</option><option>パールホワイト</option></select></p>
  <p><label>数量</label><br><select><option selected>1</option><option>2</option><option>3</option></select></p>
  <p class="submit"><input type="submit" value="この内容で予約する"></p>
</form>`;

const CONSULT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご相談内容</label><br><select><option>料金・契約について</option><option selected>導入の進め方</option><option>その他</option></select></p>
  <p><label>ご希望日時</label><br><input type="date" value="2026-07-08"></p>
  <p><label>相談したいこと（任意）</label><br><textarea>現状の課題について相談したいです。</textarea></p>
  <p class="submit"><input type="submit" value="無料相談を予約する"></p>
</form>`;

const REDEEM_FORM = `<form>
  <p><label>クーポンコード</label><br><input type="text" value="WELCOME2026"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="特典を引き換える"></p>
</form>`;

const GRANT_FORM = `<form>
  <fieldset><legend>事業形態</legend>
    <label><input type="radio" name="biz" checked> 法人</label>
    <label><input type="radio" name="biz"> 個人事業主</label>
  </fieldset>
  <p><label>従業員規模</label><br><select><option>〜5名</option><option selected>6〜20名</option><option>21〜50名</option><option>51名以上</option></select></p>
  <fieldset><legend>関心のある用途（複数可）</legend>
    <label><input type="checkbox" checked> 設備投資</label>
    <label><input type="checkbox"> IT導入・DX</label>
    <label><input type="checkbox"> 人材育成</label>
  </fieldset>
  <p><label>診断結果の送付先メール</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="診断結果を受け取る"></p>
</form>`;

const CERT_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <div class="row"><p><label>受験級</label><br><select><option>1級</option><option selected>2級</option><option>3級</option></select></p><p><label>受験会場</label><br><select><option>東京</option><option>大阪</option><option>オンライン</option></select></p></div>
  <p><label>希望受験日</label><br><input type="date" value="2026-08-23"></p>
  <p class="submit"><input type="submit" value="受験を申し込む"></p>
</form>`;

const VOTE_FORM = `<form>
  <fieldset><legend>投票する候補を選択</legend>
    <label><input type="radio" name="vote" checked> 候補A：未来をひらくプラン</label>
    <label><input type="radio" name="vote"> 候補B：みんなで育てるプラン</label>
    <label><input type="radio" name="vote"> 候補C：地域とつながるプラン</label>
  </fieldset>
  <p><label>メールアドレス（重複投票防止）</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="この候補に投票する"></p>
</form>`;

const TESTDRIVE_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <div class="row"><p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p><p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p></div>
  <p><label>ご希望の店舗</label><br><select><option>サンプル駅前店</option><option>みなと店</option><option>本店ショールーム</option></select></p>
  <p><label>ご希望日</label><br><input type="date" value="2026-07-05"></p>
  <p class="submit"><input type="submit" value="体験を予約する"></p>
</form>`;

const SIM_FORM = `<form>
  <div class="row"><p><label>従業員数（人）</label><br><input type="number" value="50"></p><p><label>月間の対象作業時間（h）</label><br><input type="number" value="320"></p></div>
  <p><label>平均時給（円）</label><br><input type="number" value="2500"></p>
  <p><label>結果の送付先メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="試算結果を受け取る"></p>
</form>`;

const CASUAL_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>現在のご状況</label><br><select><option>在職中（転職検討）</option><option>情報収集中</option><option>求職中</option></select></p>
  <p><label>話してみたいテーマ</label><br><input type="text" value="開発組織の文化について"></p>
  <p class="submit"><input type="submit" value="面談を予約する"></p>
</form>`;

const EGIFT_FORM = `<form>
  <p><label>贈る相手のお名前</label><br><input type="text" value="鈴木 花子"></p>
  <p><label>相手のメールアドレス</label><br><input type="email" value="hanako@example.com"></p>
  <p><label>ギフトを選ぶ</label><br><select><option>コーヒーチケット ¥1,000</option><option selected>スイーツセット ¥3,000</option><option>カタログギフト ¥5,000</option></select></p>
  <p><label>メッセージ</label><br><textarea>いつもありがとう。ささやかですが贈ります。</textarea></p>
  <p class="submit"><input type="submit" value="ギフトを贈る"></p>
</form>`;

const RESTOCK_FORM = `<form>
  <p><label>サイズ</label><br><select><option>S</option><option selected>M</option><option>L</option></select></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p class="submit"><input type="submit" value="入荷をお知らせする"></p>
</form>`;

const CALLBACK_FORM = `<form>
  <p><label>お名前</label><br><input type="text" value="山田 太郎"></p>
  <p><label>電話番号</label><br><input type="tel" value="090-0000-0000"></p>
  <p><label>ご希望の時間帯</label><br><select><option>午前(9-12時)</option><option selected>午後(12-17時)</option><option>夕方(17-19時)</option></select></p>
  <p class="submit"><input type="submit" value="折り返しを依頼する"></p>
</form>`;

const AMBASSADOR_FORM = `<form>
  <p><label>お名前 / 活動名</label><br><input type="text" value="山田 太郎"></p>
  <p><label>メールアドレス</label><br><input type="email" value="taro@example.com"></p>
  <p><label>主なSNSアカウント (URL)</label><br><input type="text" value="https://instagram.com/sample"></p>
  <p><label>フォロワー規模</label><br><select><option>〜1千</option><option selected>1千〜1万</option><option>1万〜10万</option><option>10万以上</option></select></p>
  <p><label>志望動機</label><br><textarea>ブランドのファンとして魅力を広めたいです。</textarea></p>
  <p class="submit"><input type="submit" value="応募する"></p>
</form>`;

function contentFor(dir, category) {
  switch (dir) {
    case "04-form-contact": return CONTACT_FORM;
    case "09-form-newsletter": return NEWSLETTER_FORM;
    case "13-landing-coming-soon": return NEWSLETTER_FORM;
    case "14-landing-pricing": return PRICING_INTRO;
    case "15-landing-casestudy": return CASESTUDY_BODY;
    case "16-form-survey": return SURVEY_FORM;
    case "20-thankyou-confirm": return CONFIRM_BODY;
    case "21-utility-preference": return PREFERENCE_FORM;
    case "22-utility-unsubscribe": return UNSUB_FORM;
    case "23-landing-referral": return REFERRAL_FORM;
    case "24-landing-faq": return FAQ_BODY;
    case "25-landing-comparison": return COMPARISON_BODY;
    case "26-form-jobapply": return JOBAPPLY_FORM;
    case "27-event-rsvp": return RSVP_FORM;
    case "28-landing-appdownload": return APP_BODY;
    case "29-landing-countdown": return NEWSLETTER_FORM;
    case "30-form-demo": return STD_FORM;
    case "31-thankyou-coupon": return COUPON_BODY;
    case "32-landing-testimonials": return NEWSLETTER_FORM;
    case "33-form-quiz": return QUIZ_FORM;
    case "34-utility-maintenance": return NEWSLETTER_FORM;
    case "35-form-nps": return NPS_FORM;
    case "36-thankyou-onboarding": return ONBOARDING_BODY;
    case "37-landing-donation": return DONATION_FORM;
    case "38-form-videogate": return STD_FORM;
    case "40-event-series": return STD_FORM;
    case "41-utility-password-reset": return PWRESET_FORM;
    case "42-landing-seasonal": return NEWSLETTER_FORM;
    case "43-form-whitepaper-toc": return STD_FORM;
    case "44-form-quote": return QUOTE_FORM;
    case "47-form-booking": return BOOKING_FORM;
    case "48-thankyou-review-request": return REVIEW_BODY;
    case "49-landing-beta": return NEWSLETTER_FORM;
    case "50-form-sample-request": return SAMPLE_FORM;
    case "51-landing-loyalty": return NEWSLETTER_FORM;
    case "52-thankyou-calendar": return CALENDAR_BODY;
    case "53-landing-community": return NEWSLETTER_FORM;
    case "54-landing-product-update": return NEWSLETTER_FORM;
    case "55-form-ambassador": return AMBASSADOR_FORM;
    case "56-form-restock-notify": return RESTOCK_FORM;
    case "57-landing-contest": return NEWSLETTER_FORM;
    case "58-form-callback": return CALLBACK_FORM;
    case "59-form-casual-interview": return CASUAL_FORM;
    case "60-landing-podcast": return NEWSLETTER_FORM;
    case "61-form-egift": return EGIFT_FORM;
    case "62-landing-joblist": return NEWSLETTER_FORM;
    case "63-landing-cart-recovery": return NEWSLETTER_FORM;
    case "64-thankyou-social-share": return SHARE_BODY;
    case "65-form-roi-calculator": return SIM_FORM;
    case "66-landing-course": return NEWSLETTER_FORM;
    case "67-landing-alumni": return NEWSLETTER_FORM;
    case "68-landing-store-opening": return NEWSLETTER_FORM;
    case "69-form-test-drive": return TESTDRIVE_FORM;
    case "71-landing-crowdfunding": return DONATION_FORM;
    case "72-form-vote": return VOTE_FORM;
    case "73-landing-vip": return NEWSLETTER_FORM;
    case "75-form-certification": return CERT_FORM;
    case "76-landing-digital-card": return NEWSLETTER_FORM;
    case "78-landing-resource-library": return NEWSLETTER_FORM;
    case "79-landing-upgrade": return NEWSLETTER_FORM;
    case "80-form-grant-diagnosis": return GRANT_FORM;
    case "82-landing-flash-sale-member": return NEWSLETTER_FORM;
    case "83-form-coupon-redeem": return REDEEM_FORM;
    case "84-landing-anniversary": return NEWSLETTER_FORM;
    case "85-utility-apology": return NEWSLETTER_FORM;
    case "87-form-free-consultation": return CONSULT_FORM;
    case "88-landing-newsletter-archive": return NEWSLETTER_FORM;
    case "89-form-preorder": return PREORDER_FORM;
    case "91-landing-stamp-card": return NEWSLETTER_FORM;
    case "92-form-warranty-registration": return WARRANTY_FORM;
    case "93-landing-seminar-archive": return NEWSLETTER_FORM;
    case "94-form-feature-feedback": return FEEDBACK_FORM;
    case "95-form-partner-application": return PARTNER_FORM;
    case "97-form-profile-completion": return PROFILE_FORM;
    case "99-form-talent-pool": return TALENT_FORM;
    case "100-landing-welcome-back": return NEWSLETTER_FORM;
    case "101-form-trial-activation": return ACTIVATION_FORM;
    case "102-landing-retention-offer": return RETENTION_FORM;
    case "103-form-schedule-poll": return SCHEDULE_FORM;
    case "104-form-post-event-survey": return POSTEVENT_FORM;
    case "105-landing-spin-wheel": return NEWSLETTER_FORM;
    case "106-form-cancel-reschedule": return CANCEL_FORM;
    case "107-landing-app-modal": return NEWSLETTER_FORM;
    case "108-form-gift-card": return GIFTCARD_FORM;
    case "109-landing-low-stock": return NEWSLETTER_FORM;
    case "110-form-health-checkup": return HEALTH_FORM;
    case "111-form-points-exchange": return POINTS_FORM;
    case "114-form-recurring-donation": return RECUR_DONATION_FORM;
    case "115-landing-investor-relations": return NEWSLETTER_FORM;
    case "116-form-student-verification": return STUDENT_FORM;
    case "117-landing-membership-rankup": return NEWSLETTER_FORM;
    case "118-form-safety-confirmation": return SAFETY_FORM;
    case "119-form-insurance-quote": return INSURANCE_FORM;
    case "120-landing-fanclub": return NEWSLETTER_FORM;
    case "121-form-vendor-registration": return VENDOR_FORM;
    case "122-form-receipt-campaign": return RECEIPT_FORM;
    case "123-landing-petition": return PETITION_FORM;
    case "124-form-volunteer": return VOLUNTEER_FORM;
    case "126-form-birthday-club": return BIRTHDAY_FORM;
    case "127-form-monitor-recruit": return MONITOR_FORM;
    case "128-form-subscription-box": return SUBBOX_FORM;
    case "129-form-facility-reservation": return FACILITY_FORM;
    case "131-form-support-ticket": return SUPPORT_FORM;
    case "133-landing-lucky-bag": return NEWSLETTER_FORM;
    case "135-form-kiosk-leadcapture": return KIOSK_FORM;
    case "136-form-loan-application": return LOAN_FORM;
    case "137-landing-countdown-live": return NEWSLETTER_FORM;
    case "138-landing-roi-calculator-live": return NEWSLETTER_FORM;
    case "139-landing-tabs-js": return NEWSLETTER_FORM;
    case "140-landing-faq-accordion-js": return NEWSLETTER_FORM;
    case "141-landing-bmi-calculator-js": return NEWSLETTER_FORM;
    case "142-landing-before-after": return NEWSLETTER_FORM;
    case "143-event-wedding-rsvp": return WEDDING_RSVP_FORM;
    case "144-landing-wizard-js": return NEWSLETTER_FORM;
    case "145-form-tour-booking": return TOUR_FORM;
    case "146-form-real-estate-inquiry": return REALESTATE_FORM;
    case "147-landing-scratch-coupon-js": return NEWSLETTER_FORM;
    case "148-form-moving-estimate": return MOVING_FORM;
    case "149-form-shareholder-benefit": return SHAREHOLDER_FORM;
    case "150-landing-plan-selector-js": return NEWSLETTER_FORM;
    case "151-event-livestream": return STD_FORM;
    case "152-form-star-rating-js": return REVIEW_POST_FORM;
    case "153-landing-membership-renewal": return NEWSLETTER_FORM;
    case "154-form-baby-registry": return BABY_FORM;
    case "155-landing-color-picker-js": return NEWSLETTER_FORM;
    case "156-form-quiz-scored-js": return NEWSLETTER_FORM;
    case "157-form-pet-registration": return PET_FORM;
    case "158-form-takeout-order": return TAKEOUT_FORM;
    case "160-form-rental-booking": return RENTAL_FORM;
    case "161-landing-pricing-toggle-js": return NEWSLETTER_FORM;
    case "162-form-result-lookup": return LOOKUP_FORM;
    case "163-landing-stats-counter-js": return NEWSLETTER_FORM;
    case "165-landing-image-gallery-js": return NEWSLETTER_FORM;
    case "166-form-trade-in": return TRADEIN_FORM;
    case "168-landing-faq-search-js": return NEWSLETTER_FORM;
    case "169-form-repair-request": return REPAIR_FORM;
    case "170-form-group-booking": return GROUP_FORM;
    case "171-landing-testimonial-carousel-js": return NEWSLETTER_FORM;
    case "172-form-translation-request": return TRANSLATION_FORM;
    case "173-form-stock-reservation": return STOCK_FORM;
    case "174-form-emoji-feedback-js": return REVIEW_POST_FORM;
    case "175-form-appointment-slots-js": return APPT_FORM;
    case "176-form-catalog-request": return CATALOG_FORM;
    case "177-landing-sticky-deal-bar-js": return NEWSLETTER_FORM;
    case "178-form-warranty-extension": return WARRANTY_EXT_FORM;
    case "179-landing-loan-simulator-js": return NEWSLETTER_FORM;
    case "180-form-wishlist": return WISHLIST_FORM;
    case "182-landing-store-access": return NEWSLETTER_FORM;
    case "184-form-gift-wrapping": return GIFTWRAP_FORM;
    case "185-utility-job-alert": return JOBALERT_FORM;
    case "187-form-trial-extension": return TRIAL_EXT_FORM;
    case "188-form-order-quantity-js": return APPT_FORM;
    case "189-landing-checklist-score-js": return NEWSLETTER_FORM;
    case "190-form-event-feedback-detailed": return DETAILED_FEEDBACK_FORM;
    case "191-landing-conditional-survey-js": return NEWSLETTER_FORM;
    case "192-form-membership-upgrade": return UPGRADE_FORM;
    case "194-form-sponsor-application": return SPONSOR_FORM;
    case "195-form-price-offer": return OFFER_FORM;
    case "197-form-speaker-application": return SPEAKER_FORM;
    case "198-form-workshop-booking": return WORKSHOP_FORM;
    case "199-landing-flipbook-catalog-js": return NEWSLETTER_FORM;
    case "201-form-photo-contest": return PHOTO_CONTEST_FORM;
    case "202-landing-team-members": return NEWSLETTER_FORM;
    case "203-form-multi-star-rating-js": return REVIEW_POST_FORM;
    case "204-form-return-request": return RETURN_FORM;
    case "205-utility-subscription-pause": return PAUSE_FORM;
    case "206-landing-referral-leaderboard": return NEWSLETTER_FORM;
    case "207-form-line-friend-add": return NEWSLETTER_FORM;
    case "208-landing-product-roadmap": return NEWSLETTER_FORM;
    case "209-form-booth-meeting": return MEETING_FORM;
    case "210-utility-account-deletion": return DELETE_FORM;
    case "211-landing-plan-recommend-js": return NEWSLETTER_FORM;
    case "212-form-renovation-quote": return RENOV_FORM;
    case "213-form-clinic-appointment": return CLINIC_FORM;
    case "214-landing-savings-comparison-js": return NEWSLETTER_FORM;
    case "215-landing-event-recap": return NEWSLETTER_FORM;
    case "219-form-employee-referral": return REFERRAL_RECRUIT_FORM;
    case "220-landing-personality-quiz-js": return NEWSLETTER_FORM;
    case "221-form-product-customizer-js": return APPT_FORM;
    case "222-event-seminar-agenda": return NEWSLETTER_FORM;
    case "223-landing-image-compare-js": return NEWSLETTER_FORM;
    case "224-landing-eco-impact-calculator-js": return NEWSLETTER_FORM;
    case "225-form-property-viewing": return VIEWING_FORM;
    case "226-landing-typewriter-hero-js": return NEWSLETTER_FORM;
    case "227-event-speaker-lineup": return NEWSLETTER_FORM;
    case "228-thankyou-order-summary": return NEWSLETTER_FORM;
    case "229-form-suggestion-box": return SUGGESTION_FORM;
    case "230-landing-product-hotspots-js": return NEWSLETTER_FORM;
    case "231-landing-flip-cards-js": return NEWSLETTER_FORM;
    case "232-utility-double-optin": return OPTIN_CONFIRM_FORM;
    case "233-event-job-fair": return JOBFAIR_FORM;
    case "234-landing-live-poll-js": return NEWSLETTER_FORM;
    case "235-landing-currency-switch-js": return NEWSLETTER_FORM;
    case "236-form-data-request": return DATA_REQUEST_FORM;
    case "237-thankyou-upsell-offer": return UPSELL_FORM;
    case "238-landing-process-steps": return CONSULT_FORM;
    case "239-landing-usage-pricing-js": return NEWSLETTER_FORM;
    case "240-event-awards-ceremony": return RSVP_FORM;
    case "241-form-newsletter-topics": return TOPICS_FORM;
    case "242-landing-image-360-js": return NEWSLETTER_FORM;
    case "243-landing-reveal-on-scroll-js": return NEWSLETTER_FORM;
    case "244-event-hybrid-conference": return HYBRID_FORM;
    case "245-thankyou-cross-sell-grid": return NEWSLETTER_FORM;
    case "246-landing-donation-tiers-js": return DONATION_FORM;
    case "247-form-petition-signature": return PETITION_FORM;
    case "248-utility-cookie-settings": return NEWSLETTER_FORM;
    case "249-event-workshop-handson": return WORKSHOP_FORM;
    case "250-landing-product-bundle-js": return NEWSLETTER_FORM;
    case "251-form-reservation-deposit": return BOOKING_FORM;
    case "252-form-matrix-survey": return SURVEY_COMMENT_FORM;
    case "253-thankyou-feedback-quick-js": return NEWSLETTER_FORM;
    case "254-landing-chat-faq-js": return NEWSLETTER_FORM;
    case "255-form-multi-recipient-gift": return MULTIGIFT_FORM;
    case "256-event-virtual-booth": return BOOTH_FORM;
    case "257-utility-survey-closed": return NEWSLETTER_FORM;
    case "258-landing-score-gauge-js": return NEWSLETTER_FORM;
    case "259-form-class-enrollment": return ENROLL_FORM;
    case "260-event-product-launch": return LAUNCH_FORM;
    case "261-thankyou-points-earned": return NEWSLETTER_FORM;
    case "262-landing-video-playlist-js": return NEWSLETTER_FORM;
    case "263-event-roadshow-cities": return ROADSHOW_FORM;
    case "264-form-bulk-order": return BULKORDER_FORM;
    case "265-utility-email-verified": return NEWSLETTER_FORM;
    case "266-landing-tip-split-js": return NEWSLETTER_FORM;
    case "267-form-membership-cancel": return MEMBER_CANCEL_FORM;
    case "268-event-alumni-reunion": return ALUMNI_FORM;
    case "269-thankyou-gift-sent": return NEWSLETTER_FORM;
    case "270-landing-rating-distribution-js": return NEWSLETTER_FORM;
    case "271-form-beta-tester-apply": return BETA_FORM;
    case "272-event-sports-tournament": return TEAM_ENTRY_FORM;
    case "273-utility-error-404": return NEWSLETTER_FORM;
    case "274-landing-image-zoom-js": return NEWSLETTER_FORM;
    case "275-form-catering-order": return CATERING_FORM;
    case "276-event-fan-meeting": return FANMEET_FORM;
    case "277-thankyou-subscription-started": return NEWSLETTER_FORM;
    case "216-form-interview-schedule": return INTERVIEW_FORM;
    case "218-form-satisfaction-slider-js": return REVIEW_POST_FORM;
    case "06-thank-you": return THANKYOU_BODY;
    case "12-thankyou-download": return THANKYOU_DL_BODY;
  }
  switch (category) {
    case "form": return STD_FORM;
    case "event": return EVENT_BODY;
    case "thankyou": return THANKYOU_BODY;
    case "utility": return PREFERENCE_FORM;
    case "landing":
    default: return LANDING_BODY;
  }
}

// ---- マージタグ置換 ------------------------------------------------------
function render(html, { title, description, content }) {
  const map = {
    "%%title%%": (title || "サンプルタイトル").replace(/\n/g, "<br>"),
    "%%description%%": description || "ここに説明文が入ります。",
    "%%content%%": content,
    "%%account-name%%": ACCOUNT_NAME,
    "%%account-website%%": ACCOUNT_WEB,
  };
  let out = html;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  out = out.replace(/%%[a-z0-9\-]+%%/gi, "");
  return out;
}

// ---- 収集 ----------------------------------------------------------------
const dirs = readdirSync(TPL_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  // 連番プレフィックスで数値順（"100-" が "11-" より後に来るように）
  .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b));

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const items = [];
for (const dir of dirs) {
  const metaPath = join(TPL_DIR, dir, "meta.json");
  const htmlPath = join(TPL_DIR, dir, "layout.html");
  if (!existsSync(metaPath) || !existsSync(htmlPath)) continue;
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const html = readFileSync(htmlPath, "utf8");
  const category = meta.category || "landing";
  const rendered = render(html, {
    title: meta.previewTitle ?? meta.name,
    description: meta.previewDescription ?? meta.description,
    content: meta.previewContent ?? contentFor(dir, category),
  });
  writeFileSync(join(OUT_DIR, `${dir}.html`), rendered, "utf8");
  items.push({ dir, file: `${dir}.html`, name: meta.name, description: meta.description, category, meta, layout: html });
}

// ---- ダウンロード用データ (data.js) --------------------------------------
const installerFiles = {};
for (const f of ["install.mjs", "config.example.json"]) {
  const p = join(__dirname, f);
  if (existsSync(p)) installerFiles[f] = readFileSync(p, "utf8");
}
const INSTALLER_README = `# Account Engagement レイアウトテンプレート インストーラ

このZIPは、選択したレイアウトテンプレートを Account Engagement (Pardot) v5 API で
一括登録するための一式です。

## 手順
1. このフォルダ内の config.example.json を config.json にコピーし、認証情報を記入
2. node install.mjs --dry-run   # 送信せず内容確認
3. node install.mjs             # 本番登録

要件: Node.js 18 以上 / 接続アプリ(pardot_api スコープ) / ビジネスユニットID(0Uv...)
詳細は各 templates/<NN-xxx>/meta.json と install.mjs 冒頭のコメントを参照してください。
`;

const galleryData = {
  templates: items.map((it) => ({
    dir: it.dir,
    name: it.name,
    description: it.description || "",
    category: it.category,
    layout: it.layout,
    meta: it.meta,
  })),
  installer: installerFiles,
  installerReadme: INSTALLER_README,
};
writeFileSync(
  join(OUT_DIR, "data.js"),
  "window.__GALLERY__ = " + JSON.stringify(galleryData) + ";\n",
  "utf8"
);

// ---- ギャラリー index.html ----------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function cardHtml(it) {
  return `      <figure class="card" data-dir="${it.dir}" data-cat="${it.category}" data-search="${esc((it.name + " " + (it.description||"") + " " + it.dir).toLowerCase())}">
        <label class="pick"><input type="checkbox" class="cb" data-dir="${it.dir}"><span></span></label>
        <button class="frame" data-open="${it.dir}" title="拡大プレビュー"><iframe src="${it.file}" loading="lazy" tabindex="-1" title="${esc(it.name)}"></iframe></button>
        <figcaption>
          <span class="badge badge-${it.category}">${CATEGORY_LABEL[it.category] || it.category}</span>
          <h3>${esc(it.name)}</h3>
          <p>${esc(it.description || "")}</p>
          <div class="meta"><code>${it.dir}</code>
            <span class="acts">
              <button class="lnk dl-one" data-dir="${it.dir}" title="このテンプレのHTMLをダウンロード">⬇ HTML</button>
              <button class="lnk code-one" data-dir="${it.dir}" title="HTMLコードを表示/コピー">&lt;/&gt;</button>
              <button class="lnk open-one" data-open="${it.dir}">拡大 ↗</button>
            </span>
          </div>
        </figcaption>
      </figure>`;
}

const filterBtns = ['<button class="fbtn active" data-f="all">すべて<span>' + items.length + "</span></button>"]
  .concat(
    CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c)).map((c) => {
      const n = items.filter((i) => i.category === c).length;
      return `<button class="fbtn" data-f="${c}">${CATEGORY_LABEL[c]}<span>${n}</span></button>`;
    })
  )
  .join("");

let sections = "";
for (const cat of CATEGORY_ORDER) {
  const group = items.filter((i) => i.category === cat);
  if (group.length === 0) continue;
  sections += `    <section class="group" data-cat="${cat}">
      <h2 class="group-title">${CATEGORY_LABEL[cat]} <span>${group.length}</span></h2>
      <div class="grid">
${group.map(cardHtml).join("\n")}
      </div>
    </section>\n`;
}

const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Account Engagement レイアウトテンプレート ギャラリー</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" integrity="sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="data.js"></script>
<style>
  :root{ --ink:#0f172a; --muted:#64748b; --line:#e6eaf0; --bg:#eef1f6; --brand:#4f46e5; --brand2:#06b6d4; --card:#fff; }
  *{ box-sizing:border-box; }
  body{ margin:0; font-family:"Hiragino Sans","Yu Gothic",Meiryo,system-ui,sans-serif; color:var(--ink); background:var(--bg); }
  a{ color:var(--brand); }
  .hero{ background:linear-gradient(120deg,#312e81,#4f46e5 45%,#06b6d4); color:#fff; padding:48px 28px 40px; position:relative; overflow:hidden; }
  .hero::after{ content:""; position:absolute; inset:0; background:radial-gradient(600px 300px at 85% -20%,rgba(255,255,255,.25),transparent); pointer-events:none; }
  .hero .in{ max-width:1280px; margin:0 auto; position:relative; }
  .hero h1{ margin:0 0 8px; font-size:26px; letter-spacing:.01em; }
  .hero p{ margin:0; opacity:.9; font-size:14px; }
  .hero .chips{ margin-top:18px; display:flex; gap:8px; flex-wrap:wrap; }
  .hero .chip{ background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.25); padding:5px 12px; border-radius:999px; font-size:12px; backdrop-filter:blur(4px); }
  .toolbar{ position:sticky; top:0; z-index:20; background:rgba(255,255,255,.85); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
  .toolbar .in{ max-width:1280px; margin:0 auto; padding:12px 24px; display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  .search{ flex:1; min-width:200px; position:relative; }
  .search input{ width:100%; padding:10px 14px 10px 38px; border:1px solid var(--line); border-radius:10px; font-size:14px; background:#fff; }
  .search::before{ content:"🔍"; position:absolute; left:12px; top:9px; opacity:.5; font-size:14px; }
  .filters{ display:flex; gap:6px; flex-wrap:wrap; }
  .fbtn{ border:1px solid var(--line); background:#fff; color:#334155; padding:8px 12px; border-radius:999px; font-size:13px; cursor:pointer; display:inline-flex; gap:6px; align-items:center; }
  .fbtn span{ background:#eef2ff; color:var(--brand); border-radius:999px; padding:0 7px; font-size:11px; font-weight:700; }
  .fbtn.active{ background:var(--brand); color:#fff; border-color:var(--brand); }
  .fbtn.active span{ background:rgba(255,255,255,.25); color:#fff; }
  .rescount{ font-size:12px; color:var(--muted); margin-left:auto; white-space:nowrap; }
  .actionbar{ position:sticky; top:57px; z-index:19; background:#0f172a; color:#fff; }
  .actionbar .in{ max-width:1280px; margin:0 auto; padding:10px 24px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .actionbar .cnt{ font-size:13px; opacity:.85; }
  .actionbar .cnt b{ color:#67e8f9; }
  .actionbar .spacer{ flex:1; }
  .abtn{ border:0; border-radius:9px; padding:9px 14px; font-size:13px; font-weight:700; cursor:pointer; }
  .abtn.ghost{ background:rgba(255,255,255,.12); color:#fff; }
  .abtn.primary{ background:#22d3ee; color:#053b45; }
  .abtn.green{ background:#34d399; color:#053527; }
  .abtn:disabled{ opacity:.4; cursor:not-allowed; }
  .wrap{ max-width:1280px; margin:0 auto; padding:26px 24px 80px; }
  .group{ margin-top:30px; }
  .group.hide{ display:none; }
  .group-title{ font-size:17px; border-left:5px solid var(--brand); padding-left:12px; margin:0 0 16px; }
  .group-title span{ color:var(--muted); font-size:13px; font-weight:400; margin-left:6px; }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(430px,1fr)); gap:22px; }
  .card{ margin:0; background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; box-shadow:0 4px 14px rgba(15,23,42,.05); transition:transform .15s, box-shadow .15s, outline-color .15s; outline:2px solid transparent; position:relative; }
  .card:hover{ transform:translateY(-3px); box-shadow:0 14px 34px rgba(15,23,42,.13); }
  .card.sel{ outline-color:var(--brand); box-shadow:0 10px 30px rgba(79,70,229,.22); }
  .card.hide{ display:none; }
  .pick{ position:absolute; top:12px; left:12px; z-index:3; cursor:pointer; }
  .pick input{ position:absolute; opacity:0; width:24px; height:24px; cursor:pointer; }
  .pick span{ display:block; width:24px; height:24px; border-radius:7px; background:rgba(255,255,255,.92); border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,.15); position:relative; }
  .pick input:checked + span{ background:var(--brand); border-color:var(--brand); }
  .pick input:checked + span::after{ content:"✓"; color:#fff; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; }
  .frame{ display:block; width:100%; height:300px; overflow:hidden; border-bottom:1px solid var(--line); background:#fff; }
  .frame iframe{ width:1280px; height:882px; border:0; transform:scale(0.336); transform-origin:top left; pointer-events:none; }
  figcaption{ padding:15px 17px 17px; }
  .badge{ display:inline-block; font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; background:#e2e8f0; color:#334155; }
  .badge-landing{ background:#dbeafe; color:#1d4ed8; } .badge-form{ background:#dcfce7; color:#15803d; }
  .badge-event{ background:#ffedd5; color:#c2410c; } .badge-thankyou{ background:#f3e8ff; color:#7e22ce; }
  .badge-utility{ background:#e0f2fe; color:#0369a1; }
  figcaption h3{ font-size:15px; margin:10px 0 6px; }
  figcaption p{ font-size:13px; color:var(--muted); margin:0 0 12px; line-height:1.6; min-height:2.6em; }
  .meta{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:12px; }
  .meta code{ background:#f1f5f9; padding:2px 7px; border-radius:5px; color:#475569; }
  .acts{ display:flex; gap:10px; align-items:center; }
  .acts button{ border:0; background:none; color:var(--brand); font-weight:700; cursor:pointer; font-size:12px; padding:0; }
  .acts a{ text-decoration:none; font-weight:600; }
  .empty{ text-align:center; color:var(--muted); padding:60px 20px; display:none; }
  footer{ text-align:center; color:var(--muted); font-size:12px; padding:24px; }
  .toast{ position:fixed; bottom:20px; left:50%; transform:translateX(-50%) translateY(20px); background:#0f172a; color:#fff; padding:12px 20px; border-radius:10px; font-size:14px; opacity:0; transition:.25s; z-index:50; }
  .toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }
  @media (max-width:520px){ .grid{ grid-template-columns:1fr; } .frame{ height:auto; aspect-ratio:1280/882; } .frame iframe{ transform:scale(calc((100vw - 50px)/1280)); } }
  /* --- ボタン化した frame / リンクボタン --- */
  .frame{ border:0; border-bottom:1px solid var(--line); cursor:pointer; padding:0; display:block; width:100%; background:#fff; }
  .lnk{ border:0; background:none; color:var(--brand); font-weight:700; cursor:pointer; font-size:12px; padding:0; }
  /* --- テーマトグル --- */
  .theme-btn{ position:absolute; top:18px; right:24px; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.3); color:#fff; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:18px; }
  /* --- モーダル(ライトボックス) --- */
  .modal[hidden]{ display:none; }
  .modal{ position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; }
  .modal-bg{ position:absolute; inset:0; background:rgba(2,6,23,.66); backdrop-filter:blur(3px); }
  .modal-box{ position:relative; width:min(1000px,96vw); height:min(86vh,860px); background:var(--card); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 30px 80px rgba(0,0,0,.5); }
  .modal-head{ display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .modal-head strong{ font-size:14px; flex:1; min-width:120px; }
  .modal-tabs button,.modal-dev button{ border:1px solid var(--line); background:transparent; color:var(--ink); padding:6px 12px; border-radius:8px; font-size:12px; cursor:pointer; }
  .modal-tabs button.active,.modal-dev button.active{ background:var(--brand); color:#fff; border-color:var(--brand); }
  .modal-x{ border:0; background:none; font-size:18px; cursor:pointer; color:var(--muted); }
  .modal-body{ flex:1; overflow:auto; background:#f1f5f9; }
  .m-preview{ height:100%; display:flex; justify-content:center; }
  .m-preview[hidden]{ display:none; }
  .m-preview iframe{ width:100%; height:100%; border:0; background:#fff; }
  .m-preview.mobile{ padding:16px 0; align-items:flex-start; }
  .m-preview.mobile iframe{ width:390px; max-width:100%; border:1px solid var(--line); border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.2); }
  .m-code{ height:100%; display:flex; flex-direction:column; background:#0f172a; }
  .m-code[hidden]{ display:none; }
  .m-code-bar{ padding:8px 12px; display:flex; gap:8px; }
  .m-code-bar button{ border:0; background:#334155; color:#fff; padding:7px 14px; border-radius:8px; font-size:12px; cursor:pointer; font-weight:700; }
  .m-code pre{ margin:0; padding:0 16px 16px; overflow:auto; flex:1; }
  .m-code code{ color:#e2e8f0; font:12px/1.6 ui-monospace,Menlo,Consolas,monospace; white-space:pre-wrap; word-break:break-word; }
  /* --- ダークモード --- */
  :root[data-theme="dark"]{ --ink:#e2e8f0; --muted:#94a3b8; --line:#243044; --bg:#0b1220; --card:#111a2e; }
  :root[data-theme="dark"] body{ background:var(--bg); }
  :root[data-theme="dark"] .toolbar{ background:rgba(17,26,46,.85); }
  :root[data-theme="dark"] .search input,
  :root[data-theme="dark"] .fbtn{ background:#111a2e; color:#cbd5e1; }
  :root[data-theme="dark"] .fbtn span{ background:#1e293b; color:#a5b4fc; }
  :root[data-theme="dark"] .card{ background:var(--card); }
  :root[data-theme="dark"] .frame{ background:#0b1220; }
  :root[data-theme="dark"] .meta code{ background:#1e293b; color:#cbd5e1; }
  :root[data-theme="dark"] .modal-body{ background:#0b1220; }
  /* --- トップへ戻る --- */
  .totop{ position:fixed; right:20px; bottom:20px; z-index:40; width:46px; height:46px; border-radius:50%; border:0; background:var(--brand); color:#fff; font-size:20px; cursor:pointer; box-shadow:0 8px 24px rgba(79,70,229,.4); opacity:0; pointer-events:none; transition:opacity .2s, transform .2s; transform:translateY(8px); }
  .totop.show{ opacity:1; pointer-events:auto; transform:translateY(0); }
</style>
</head>
<body>
<header class="hero"><div class="in">
  <button class="theme-btn" id="themeBtn" title="ライト/ダーク切替">🌙</button>
  <h1>Account Engagement レイアウトテンプレート ギャラリー</h1>
  <p>全 ${items.length} パターン — 選択して ZIP ダウンロード、または API 一括登録用インストーラを生成できます。</p>
  <div class="chips"><span class="chip">クリックで拡大プレビュー</span><span class="chip">チェックで選択</span><span class="chip">%%content%% 差込済みのサンプル表示</span></div>
</div></header>

<div class="toolbar"><div class="in">
  <div class="search"><input id="q" type="search" placeholder="名称・用途・カテゴリで検索..."></div>
  <div class="filters">${filterBtns}</div>
  <span class="rescount" id="rescount"></span>
</div></div>

<div class="actionbar"><div class="in">
  <label style="display:flex;gap:7px;align-items:center;font-size:13px;cursor:pointer;"><input type="checkbox" id="selAll"> 表示中をすべて選択</label>
  <span class="cnt"><b id="selCount">0</b> 件を選択中</span>
  <span class="spacer"></span>
  <button class="abtn ghost" id="clearSel">選択解除</button>
  <button class="abtn primary" id="dlSel" disabled>⬇ 選択をZIP</button>
  <button class="abtn ghost" id="dlAll">⬇ 全てZIP</button>
  <button class="abtn green" id="dlInstaller" disabled>⚙ インストーラ生成</button>
</div></div>

<div class="wrap">
${sections}  <div class="empty" id="empty">該当するテンプレートがありません。</div>
</div>
<footer>Account Engagement Layout Templates · ${items.length} patterns</footer>

<div class="modal" id="modal" hidden>
  <div class="modal-bg" data-close></div>
  <div class="modal-box">
    <div class="modal-head">
      <strong id="m-title"></strong>
      <div class="modal-tabs"><button data-view="preview" class="active">プレビュー</button><button data-view="code">&lt;/&gt; コード</button></div>
      <div class="modal-dev"><button data-dev="desktop" class="active">🖥 PC</button><button data-dev="mobile">📱 SP</button></div>
      <button class="modal-x" data-close title="閉じる">✕</button>
    </div>
    <div class="modal-body">
      <div class="m-preview"><iframe id="m-frame" title="preview"></iframe></div>
      <div class="m-code" hidden>
        <div class="m-code-bar"><button id="m-copy">📋 コピー</button><button id="m-dl">⬇ HTML</button></div>
        <pre><code id="m-code-text"></code></pre>
      </div>
    </div>
  </div>
</div>

<button class="totop" id="toTop" title="トップへ戻る">↑</button>
<div class="toast" id="toast"></div>

<script>
const G = window.__GALLERY__ || {templates:[],installer:{},installerReadme:""};
const byDir = Object.fromEntries(G.templates.map(t => [t.dir, t]));
const sel = new Set();
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2200); }
function saveBlob(blob,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }

function updateCount(){
  $("#selCount").textContent = sel.size;
  $("#dlSel").disabled = sel.size===0;
  $("#dlInstaller").disabled = sel.size===0;
  $$(".card").forEach(c=> c.classList.toggle("sel", sel.has(c.dataset.dir)));
}
function applyFilter(){
  const f = $(".fbtn.active").dataset.f;
  const q = $("#q").value.trim().toLowerCase();
  $$(".card").forEach(c=>{
    const okCat = f==="all" || c.dataset.cat===f;
    const okQ = !q || c.dataset.search.includes(q);
    c.classList.toggle("hide", !(okCat&&okQ));
  });
  let anyVisible=false;
  $$(".group").forEach(g=>{ const vis=$$(".card:not(.hide)",g).length>0; g.classList.toggle("hide",!vis); if(vis)anyVisible=true; });
  $("#empty").style.display = anyVisible?"none":"block";
  const rc=$("#rescount"); if(rc){ rc.textContent = $$(".card:not(.hide)").length + " 件表示"; }
  $("#selAll").checked=false;
}
async function buildZip(dirs, withInstaller){
  if(typeof JSZip==="undefined"){ toast("ZIPライブラリの読込に失敗しました"); return; }
  const zip = new JSZip();
  dirs.forEach(d=>{ const t=byDir[d]; if(!t) return; const fo=zip.folder("templates/"+d); fo.file("layout.html",t.layout); fo.file("meta.json",JSON.stringify(t.meta,null,2)); });
  if(withInstaller){
    Object.entries(G.installer||{}).forEach(([n,c])=> zip.file(n,c));
    if(G.installerReadme) zip.file("README.md", G.installerReadme);
  }
  const blob = await zip.generateAsync({type:"blob"});
  saveBlob(blob, withInstaller?"ae-installer.zip":"ae-templates.zip");
  toast((withInstaller?"インストーラ":"テンプレ")+" "+dirs.length+"件をダウンロードしました");
}

document.addEventListener("change", e=>{
  if(e.target.classList.contains("cb")){ const d=e.target.dataset.dir; e.target.checked?sel.add(d):sel.delete(d); updateCount(); }
});
$("#q").addEventListener("input", applyFilter);
$$(".fbtn").forEach(b=> b.addEventListener("click", ()=>{ $$(".fbtn").forEach(x=>x.classList.remove("active")); b.classList.add("active"); applyFilter(); }));
$("#selAll").addEventListener("change", e=>{
  $$(".card:not(.hide) .cb").forEach(cb=>{ cb.checked=e.target.checked; const d=cb.dataset.dir; e.target.checked?sel.add(d):sel.delete(d); });
  updateCount();
});
$("#clearSel").addEventListener("click", ()=>{ sel.clear(); $$(".cb").forEach(cb=>cb.checked=false); $("#selAll").checked=false; updateCount(); });
$("#dlSel").addEventListener("click", ()=> buildZip([...sel], false));
$("#dlAll").addEventListener("click", ()=> buildZip(G.templates.map(t=>t.dir), false));
$("#dlInstaller").addEventListener("click", ()=> buildZip([...sel], true));
document.addEventListener("click", e=>{
  const b=e.target.closest(".dl-one"); if(!b) return;
  const t=byDir[b.dataset.dir]; if(!t) return;
  saveBlob(new Blob([t.layout],{type:"text/html"}), b.dataset.dir+".html");
  toast(b.dataset.dir+".html をダウンロードしました");
});

// --- localStorage 選択保持 ---
function saveSel(){ try{ localStorage.setItem("ae-sel", JSON.stringify([...sel])); }catch{} }
function restoreSel(){ try{ JSON.parse(localStorage.getItem("ae-sel")||"[]").forEach(d=>{ const cb=document.querySelector('.cb[data-dir="'+d+'"]'); if(cb){ cb.checked=true; sel.add(d);} }); }catch{} }
document.addEventListener("change", e=>{ if(e.target.classList.contains("cb")) saveSel(); });

// --- ダークモード ---
const themeBtn=$("#themeBtn");
function setTheme(t){ document.documentElement.setAttribute("data-theme",t); themeBtn.textContent=t==="dark"?"☀️":"🌙"; try{localStorage.setItem("ae-theme",t);}catch{} }
setTheme(localStorage.getItem("ae-theme")||"light");
themeBtn.addEventListener("click",()=> setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark"));

// --- モーダル(ライトボックス) ---
const modal=$("#modal"), mFrame=$("#m-frame"), mTitle=$("#m-title"), mCodeText=$("#m-code-text");
let curDir=null;
function setView(v){ $$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v)); $(".m-preview").hidden=(v!=="preview"); $(".m-code").hidden=(v!=="code"); }
function setDev(d){ $$("[data-dev]").forEach(b=>b.classList.toggle("active",b.dataset.dev===d)); $(".m-preview").classList.toggle("mobile",d==="mobile"); }
function openModal(dir,view){ const t=byDir[dir]; if(!t) return; curDir=dir; mTitle.textContent=t.name; mFrame.src=dir+".html"; mCodeText.textContent=t.layout; modal.hidden=false; setView(view||"preview"); setDev("desktop"); }
function closeModal(){ modal.hidden=true; mFrame.src="about:blank"; }
document.addEventListener("click", e=>{
  const op=e.target.closest("[data-open]"); if(op){ openModal(op.dataset.open,"preview"); return; }
  const co=e.target.closest(".code-one"); if(co){ openModal(co.dataset.dir,"code"); return; }
  if(e.target.closest("[data-close]")){ closeModal(); return; }
  const v=e.target.closest("[data-view]"); if(v){ setView(v.dataset.view); return; }
  const dv=e.target.closest("[data-dev]"); if(dv){ setDev(dv.dataset.dev); return; }
});
document.addEventListener("keydown", e=>{ if(e.key==="Escape"&&!modal.hidden) closeModal(); });
$("#m-copy").addEventListener("click", async()=>{ try{ await navigator.clipboard.writeText(byDir[curDir].layout); toast("HTMLをコピーしました"); }catch{ toast("コピーに失敗しました"); } });
$("#m-dl").addEventListener("click", ()=>{ const t=byDir[curDir]; if(t){ saveBlob(new Blob([t.layout],{type:"text/html"}), curDir+".html"); } });

// --- トップへ戻る ---
const toTop=$("#toTop");
window.addEventListener("scroll", ()=> toTop.classList.toggle("show", window.scrollY>400));
toTop.addEventListener("click", ()=> window.scrollTo({top:0,behavior:"smooth"}));

restoreSel();
updateCount();
applyFilter();
</script>
</body>
</html>
`;

writeFileSync(join(OUT_DIR, "index.html"), indexHtml, "utf8");

console.log(`✓ プレビューを生成しました: ${items.length} 件`);
console.log(`  data.js + index.html を出力（DL/インストーラ機能つき）`);
for (const c of CATEGORY_ORDER) {
  const n = items.filter((i) => i.category === c).length;
  if (n) console.log(`  - ${CATEGORY_LABEL[c]}: ${n}`);
}
console.log(`\n▶ ギャラリーを開く: account-engagement/preview/index.html`);
