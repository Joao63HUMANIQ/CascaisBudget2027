# CascaisBudget2027 — proteção por password no GitHub Pages

## Objetivo

Manter o repositório público e o endereço GitHub Pages, mas publicar as páginas HTML encriptadas com StatiCrypt. A password é fornecida ao processo de build através de um GitHub Actions Secret e não é guardada no código.

## Limite importante

Isto protege o acesso através do website publicado. **Não torna o repositório privado**: os ficheiros HTML originais e os dados que contêm continuam visíveis para quem abrir o repositório, descarregar o ZIP ou consultar o histórico do GitHub. Não usar esta abordagem para informação que tenha de permanecer confidencial relativamente ao público em geral.

## Preparação

1. Trabalhar exclusivamente na branch `private-v1`; não alterar `main` durante este processo.
2. Carregar o conteúdo desta pasta para a raiz de `private-v1`, substituindo os HTML existentes e adicionando `scripts/`, `package.json`, `.staticrypt.json` e `.github/workflows/static.yml`.
3. Em GitHub > Settings > Secrets and variables > Actions > New repository secret, criar:
   - Name: `STATICRYPT_PASSWORD`
   - Secret: uma frase-passe forte, única e com pelo menos 16 caracteres (preferencialmente 5–6 palavras aleatórias).
4. Guardar o secret sem o colocar em ficheiros, commits, issues ou mensagens.
5. Pedir ao proprietário/Admin do repositório para abrir **Settings > Pages > Build and deployment > Source** e selecionar **GitHub Actions**. Este passo é necessário para o workflow de deploy.
6. Confirmar que o workflow existente em `.github/workflows/static.yml` é o workflow desta versão e que o evento `push` está limitado à branch `private-v1`.
7. Fazer commit na branch `private-v1`.
8. Abrir Actions e acompanhar o workflow `Deploy password-protected site to GitHub Pages`.
9. Quando terminar com sucesso, testar o endereço atual do GitHub Pages numa janela privada: deve aparecer o pedido de password; password errada deve falhar; password correta deve abrir o conteúdo e os links internos.

## Publicação e rollback

- O workflow só é acionado por pushes à branch `private-v1`.
- O workflow da branch `main` permanece intacto. Não fazer push para `main`, pois o workflow original poderá voltar a publicar a versão não protegida.
- A tag `v1.0-original` e a Release original devem ser mantidas.
- Antes de qualquer merge ou alteração à branch principal, rever as regras de deployment.

## O que é publicado

O script publica apenas os HTML encriptados e a pasta `assets/`. Os HTML de origem não são copiados em texto simples para `dist/`.

Os dois documentos DOCX referenciados em algumas páginas não estavam presentes no ZIP original; as ligações correspondentes continuarão sem ficheiro até os documentos originais serem adicionados e incluídos explicitamente no processo de build.

## Segurança e limitações

- StatiCrypt cifra o conteúdo HTML com AES-256 e desencripta-o no browser após introdução da password.
- É uma password partilhada: não existe identidade individual, auditoria por visitante ou revogação seletiva.
- Quem tiver a password pode partilhá-la.
- O conteúdo publicado cifrado pode ser copiado para tentativa offline de adivinhação; usar uma frase-passe longa e aleatória.
- O website pode ser protegido no URL publicado, mas o repositório público continua a expor a origem e os dados-fonte.
- O conteúdo já esteve público; esta alteração não apaga cópias ou downloads anteriores.


## Notas de execução

- O workflow não utiliza cache npm porque este pacote não inclui `package-lock.json`; assim evita-se uma falha de cache por inexistência do ficheiro de lock. A dependência direta StatiCrypt está fixada em `3.5.6` no `package.json`.
- O workflow usa `actions/upload-pages-artifact@v4` e `actions/deploy-pages@v4`.
- A primeira publicação é acionada por um push à branch `private-v1`; não é necessário executar manualmente o workflow.
