# Publicar ou assinar no Firefox Add-ons

## Caminho mais facil

Use o AMO, o site oficial de extensoes da Mozilla.

Existem dois modos:

- `Listed`: aparece publicamente na loja.
- `Unlisted`: a Mozilla assina o arquivo, mas ele nao aparece em busca nem pagina publica. Voce distribui o `.xpi` por link proprio.

Para uso pessoal, comece com `Unlisted`.

## Preparar arquivo

Rode:

```powershell
npm run xpi
```

O arquivo fica em:

```text
artifacts/
```

Antes de enviar, valide:

```powershell
npm run amo:lint
```

## Enviar para assinatura

1. Acesse o Developer Hub do AMO.
2. Crie uma nova extensao.
3. Escolha distribuicao `Unlisted` se nao quiser publicar na loja.
4. Envie o `.xpi` gerado em `artifacts/`.
5. Baixe o `.xpi` assinado quando a validação terminar.

## Source package para revisao

Como o pacote final e gerado por `esbuild`, a Mozilla pode pedir o codigo-fonte junto com instrucoes de build.

Gere o zip de codigo-fonte com:

```powershell
npm run source:zip
```

Arquivo gerado:

```text
artifacts/private_url_blocker-0.1.2-source.zip
```

Inclua o repositorio sem estas pastas:

```text
node_modules/
dist/
dist-tests/
artifacts/
```

Instrucoes para reviewers:

```powershell
npm ci
npm run metadata:check
npm run typecheck
npm run test
npm run amo:lint
npm run xpi
```

Ambiente usado:

```text
Node >= 22
npm via package-lock.json
```

## Instalar no Firefox Android

O caminho mais simples no Android e instalar pela pagina do AMO quando a extensao estiver listada e marcada como compativel com Android.

Para isso, o manifest ja possui:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "private-url-blocker@local",
    "data_collection_permissions": {
      "required": ["none"]
    }
  },
  "gecko_android": {}
}
```

## GitHub

Hospedar o `.xpi` no GitHub so funciona bem se o arquivo estiver assinado pela Mozilla. Firefox normal bloqueia extensoes nao assinadas.
