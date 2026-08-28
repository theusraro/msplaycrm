# MSPLAY — Checklist de Testes em Dispositivos Físicos

Use este checklist ao instalar o APK de homologação (`app-debug.apk v0.9.0`) em dispositivos reais.

Marque `[x]` nos itens TESTADOS. Mantenha `[ ]` nos itens NÃO TESTADOS.

---

## 📱 SMARTPHONE ANDROID

**Dispositivo:** ___________________________  
**Modelo/Marca:** ___________________________  
**Android Version:** ___________________________  
**APK Version:** 0.9.0  

### Instalação e Abertura
- [ ] APK instala sem erro
- [ ] App abre sem crash
- [ ] Splash screen aparece

### Login
- [ ] Tela de login carrega
- [ ] Campo de usuário funciona (teclado abre, texto digita)
- [ ] Campo de senha funciona
- [ ] Login com credenciais válidas navega para Profiles
- [ ] Login com credenciais inválidas mostra erro

### Profiles
- [ ] Tela de perfis carrega
- [ ] Perfis são exibidos
- [ ] Selecionar perfil navega para Home

### Home
- [ ] Home carrega com conteúdo
- [ ] Hero/Banner visível e com conteúdo
- [ ] Carrosséis horizontais deslizam com touch
- [ ] Scroll vertical funciona

### Filmes
- [ ] Tela de filmes carrega
- [ ] Cards de filmes aparecem com poster
- [ ] Ao tocar em card, abre tela de detalhes

### Séries
- [ ] Tela de séries carrega
- [ ] Cards de séries aparecem com poster
- [ ] Detalhes de série mostram temporadas e episódios

### TV / Canais
- [ ] Tela de TV carrega
- [ ] Canais listados com logo e programação
- [ ] Tocar em canal abre player ou detalhes

### Busca
- [ ] Tela de busca carrega
- [ ] Teclado abre ao focar
- [ ] Resultados aparecem ao digitar

### Player
- [ ] Player abre ao selecionar conteúdo
- [ ] Play/Pause funciona
- [ ] Barra de progresso visível
- [ ] Botão voltar retorna à tela anterior
- [ ] Fullscreen funciona (orientação landscape)
- [ ] Stream real reproduz (se configurado com provider real)

### Navegação
- [ ] Bottom navigation funciona (Home, Filmes, Séries, TV, Busca)
- [ ] Botão Back do Android retorna corretamente
- [ ] Não fica preso em loop de navegação

### Rede
- [ ] Desligar Wi-Fi: app não crasha
- [ ] Religar Wi-Fi: app recupera conteúdo

### Observações
```
Notas livres do testador:


```

---

## 📺 TV BOX / ANDROID TV / GOOGLE TV

**Dispositivo:** ___________________________  
**Modelo/Marca:** ___________________________  
**Android / TV Version:** ___________________________  
**Tipo:** [ ] TV Box genérica  [ ] Android TV certificada  [ ] Google TV  
**Controle Remoto:** [ ] IR  [ ] Bluetooth  
**APK Version:** 0.9.0  

### Instalação e Abertura
- [ ] APK instala via sideload ou store
- [ ] App aparece no launcher da TV (Leanback)
- [ ] App abre sem crash
- [ ] Splash screen aparece

### D-pad (Controle Remoto)
- [ ] ↑ (Cima) navega para o elemento acima
- [ ] ↓ (Baixo) navega para o elemento abaixo
- [ ] ← (Esquerda) navega para o elemento à esquerda
- [ ] → (Direita) navega para o elemento à direita
- [ ] Enter/OK seleciona o elemento focado
- [ ] Back retorna à tela anterior
- [ ] Foco é visível (borda/glow/escala)
- [ ] Foco não desaparece
- [ ] Foco não fica preso em um elemento

### Login
- [ ] Tela de login aparece
- [ ] Campo de usuário pode ser focado via D-pad
- [ ] Teclado virtual da TV aparece ao selecionar campo
- [ ] Login com credenciais válidas navega para Profiles
- [ ] Login com credenciais inválidas mostra erro

### Profiles
- [ ] Tela de perfis carrega
- [ ] Perfis podem ser selecionados com D-pad + Enter
- [ ] Selecionar perfil navega para Home

### Home
- [ ] Home carrega
- [ ] Hero/Banner visível
- [ ] Carrosséis podem ser navegados com ← →
- [ ] Scroll vertical com ↑ ↓

### TV / Canais
- [ ] Tela de TV carrega
- [ ] Canais navegáveis com D-pad
- [ ] Selecionar canal abre player

### Filmes
- [ ] Tela de filmes carrega
- [ ] Cards navegáveis com D-pad

### Séries
- [ ] Tela de séries carrega
- [ ] Detalhes de série abrem corretamente
- [ ] Temporadas e episódios navegáveis

### Busca
- [ ] Tela de busca carrega
- [ ] Teclado virtual abre
- [ ] Resultados aparecem

### Details
- [ ] Tela de detalhes carrega com informações
- [ ] Botão "Assistir" pode ser focado e selecionado

### Player
- [ ] Player abre
- [ ] Play/Pause funciona via controle
- [ ] Back retorna à tela anterior
- [ ] Fullscreen correto em TV (sem bordas)
- [ ] Stream real reproduz (se configurado)

### Settings
- [ ] Tela de configurações acessível
- [ ] Opções navegáveis com D-pad

### Performance
- [ ] Tempo de abertura: _____ segundos
- [ ] Scroll suave: [ ] Sim  [ ] Não
- [ ] Animações fluidas: [ ] Sim  [ ] Não
- [ ] Crash por memória: [ ] Sim  [ ] Não

### Rede
- [ ] Desligar rede: app não crasha
- [ ] Religar rede: app recupera

### Observações
```
Notas livres do testador:


```

---

## 🏷️ Classificação do Resultado

Para cada dispositivo testado, marque APENAS UMA classificação:

- [ ] **PASS** — Todos os itens obrigatórios funcionaram
- [ ] **PASS COM RESSALVAS** — Funcionou com problemas menores documentados
- [ ] **FAIL** — Problemas críticos que impedem uso
- [ ] **NOT TESTED** — Hardware não disponível
