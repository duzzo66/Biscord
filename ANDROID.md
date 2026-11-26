# vulcord Android

Aplicativo Android 8 ou posterior, baseado no Android System WebView. Usa as mesmas telas web, contas e API do desktop, começando em `/channels/@me` e redirecionando para login quando necessário. Não inclui a home, dados do banco nem credenciais.

O aplicativo usa inicialmente `https://biscord-ashy.vercel.app`; para trocar, informe o endereço HTTPS público do servidor. Ele deve permanecer ligado e acessível. O endereço `127.0.0.1` do PC não funciona no celular. Para trocar o servidor, use Voltar na primeira página e escolha Alterar servidor.

Compilação: `npm run android:build`. Aceita `JAVA_HOME` e `ANDROID_SDK_ROOT` (ou `ANDROID_HOME`). Sem essas variáveis, requer JDK 17 em `.android-tools/java`, Android SDK platform 35 e build-tools 35.0.0 em `.android-tools/sdk`. O script produz `android-release/vulcord-1.0.5-Android.apk`, assinado com uma chave de testes local. Preserve a chave para atualizar a instalação; ela não serve para publicação em loja.

Microfone e câmera dependem de autorização do Android. Upload abre o seletor do sistema. Compartilhamento de tela e notificações/chamadas em segundo plano ainda precisam de integração nativa. O APK não foi testado num aparelho físico nesta máquina.
