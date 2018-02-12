#  Box-Surfer

- AR技術を用いて [Scrapbox](https://scrapbox.io/) のプロジェクト内のページを表示する
- Public Projectのみを対象としているため、Private Projectは表示できない



# Prepare

```bash
npm install express request urlsafe-base64 open
```


# Setup

```bash
node server
```

- http://${IP_ADDRESS}:8000/index.html?project=${PROJECT_NAME} に [WebARonARKit](https://github.com/google-ar/WebARonARKit) または [WebARonARCore](https://github.com/google-ar/WebARonARCore) でアクセスする
