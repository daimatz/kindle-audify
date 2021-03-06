# kindle-audify

Kindle をオーディオブック化するためのツール・アプリケーション群です。

こちらの記事も合わせてご覧ください：[Kindle に入っているビジネス書をオーディオブック化したい](https://zenn.dev/daimatz/articles/6723653fc73aca)

# 使い方

以下の流れで書籍をオーディオブック化します。 1. のステップは最初に一度だけ必要です。

1. Google Cloud Platform 上に PDF 音声化サービスをデプロイ
2. ローカルマシンで書籍の内容を含む PDF ファイルを作成
3. Google Cloud Storage に PDF ファイルをアップロード

## 1. Google Cloud Platform 上に PDF 音声化サービスをデプロイ

このアプリケーションでは Google Cloud Platform の Cloud Vision API および Text-to-Speech API を使用します。そのため、 Google Cloud Platform 上に環境構築が必要です。

1. [Google Cloud Platform](https://console.cloud.google.com/) の初期設定を済ませます。請求情報などを登録してアカウントをアクティベートし、 [Google Cloud SDK](https://cloud.google.com/sdk/docs/downloads-interactive) をインストール・初期化してください。
2. 新しくプロジェクトを作成します。ここでは `my-kindle-audify` という project id を指定していますが、自分で使う際は適当な id に変更してください。<br />`gcloud projects create my-kindle-audify --set-as-default`
3. Cloud Storage 上に作業用のバケットを作成します。バケット名は世界で一意である必要があります。 `my-kindle-audify-bucket` の部分を適当に変更してください。<br />`gsutil mb gs://my-kindle-audify-bucket`
4. [Cloud Build](https://console.cloud.google.com/cloud-build/), [Cloud Functions](https://console.cloud.google.com/functions/), [Cloud Text-to-Speech](https://cloud.google.com/text-to-speech), [Cloud Vision](https://cloud.google.com/vision) の API を有効化します。<br />`gcloud services enable cloudbuild.googleapis.com cloudfunctions.googleapis.com texttospeech.googleapis.com vision.googleapis.com`
5. リポジトリ内の `env.yaml.template` を `env.yaml` にコピーします。<br />`cp env.yaml.template env.yaml`
6. `env.yaml` を自分の環境に合うように編集します。ファイル内のコメントを参考にしてください。
7. Cloud Functions にアプリケーションをデプロイします。 deploy コマンドの引数にハイフンを2つと対象のバケット名を指定してください。<br />`npm install && npm run build && npm run deploy -- my-kindle-audify-bucket`

## 2. ローカルマシンで書籍の内容を含む PDF ファイルを作成

Kindle で表示している書籍のスクリーンショットをとります。そのスクリーンショットを**書籍の内容部分だけを抽出して**1つのPDFファイルにまとめます。

macOS では、リポジトリ内の KindleScreenshot.workflow という Automator アプリを使って自動でページめくりとスクリーンショットの撮影ができます。

![Automator](https://raw.githubusercontent.com/daimatz/kindle-audify/master/automator.gif)

1. ローカルに [ImageMagick](https://imagemagick.org/) をインストールします。<br />`brew install imagemagick`
2. ホームディレクトリに `KindleScreenshot` というフォルダを作成します。<br />`mkdir -p ~/KindleScreenshot`
3. このリポジトリに含まれる `marker.html` を作成した `KindleScreenshot` フォルダにコピーします。<br />`cp /path/to/kindle-audify/marker.html ~/KindleScreenshot`
4. Kindle.app を開き、書籍の初めのほう (オーディオブック化したい最初のページ) を表示します。
5. macOS の通知をオフ (Do not disturb) にします。
6. このリポジトリの `KindleScreenshot.workflow` を開き、実行します。
7. ImageMagick のパスを尋ねられます。 `which magick` で出力されたファイルを含むフォルダを指定してください。
8. 書籍のタイトルを尋ねられるので、入力します。
9. Automator が Kindle アプリを自動で操作しながらスクリーンショットを撮影していきます。操作せずにお待ちください。
10. その後しばらく経つとブラウザが起動し、撮影したスクリーンショットが表示されます。
11. スクリーンショット上で書籍の内容部分だけを含むよう矩形選択し、 Go! ボタンをクリックしてください。
12. しばらく待つと選択された矩形部分だけを抽出した PDF ファイルが作成され、 Finder に表示されます。
13. 必要であれば macOS の通知を元に戻します。

## 3. Google Cloud Storage に PDF ファイルをアップロード

上記 2. のステップで都度作成した PDF ファイルを Cloud Storage にアップロードすると、自動で Cloud Functions が起動して MP3 化されます。

1. 作成した PDF ファイルを [Cloud Storage](https://console.cloud.google.com/storage/browser/) の当該バケットにアップロードします。
2. 数分待つとオーディオブック化された MP3 ファイルが `env.yaml` で指定された Cloud Storage 上のフォルダに作成されるので、ダウンロードしてください。

## 注意

一部の書籍 (10%ほど？) において OCR 処理でうまくテキストを抽出できないケースがあることがわかっています。
画像切り抜きの方法などを調整したり Vision API のパラメータを調整するなどで修正できる可能性がありますが、現状ではできていません。

# 開発

Cloud IAM 上で以下の権限を持ったサービスアカウントを作成し、キーをダウンロードします。

```
storage.objects.create
storage.objects.delete
storage.objects.get
storage.objects.list
storage.objects.update
```

開発は TypeScript および Node.js です。

```sh
npm install
npm run build
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
npm run local -- '/cloud-storage-path/to/pdf-file.pdf'
```

とすることで、 Cloud Functions 上で動いているアプリケーションをローカルで動かすことができます。
