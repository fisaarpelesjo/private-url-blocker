# Firefox Android

## Uso rapido

1. Instale o Firefox no celular.
2. Ative `Opcoes do desenvolvedor` no Android.
3. Ative `Depuracao USB`.
4. No Firefox Android, ative `Remote debugging via USB`.
5. Conecte o celular por cabo USB e aceite a permissao de depuracao no aparelho.
6. Instale Android SDK Platform Tools e deixe `adb` no PATH.
7. Rode:

```powershell
npm run mobile
```

Para Firefox Beta:

```powershell
npm run mobile:beta
```

Para Firefox Nightly:

```powershell
npm run mobile:nightly
```

O comando gera o `dist/`, conecta no Firefox Android via `web-ext` e carrega a extensao temporariamente.

## Atualizar

Com o celular conectado, rode novamente:

```powershell
npm run mobile
```

## Dados

A lista fica salva no storage da extensao. No Desktop, `browser.storage.sync` usa Firefox Sync. No Android, o Firefox nao sincroniza esse storage pela Conta Mozilla, entao Desktop e Android nao compartilham automaticamente a lista usando apenas Firefox Sync.
