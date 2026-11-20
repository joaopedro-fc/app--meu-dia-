# ☀️ Meu Dia

**Autor:** João Pedro Figueredo da Cunha

App pessoal para Android com agenda, lembretes e controle de gastos. Ele não vai pra loja: você instala
o APK direto no celular. Os dados ficam só no aparelho, sem servidor e sem conta.

- **Hoje:** o assistente entende frases como “gastei 35,90 na farmácia no débito”, “reunião sexta 14h”
  “recebi 1500 salário”, “lista leite, pão e café” e “quero comprar air fryer 400”.
- **Agenda:** calendário do mês. Toque num dia para ver e apagar compromissos.
- **Finanças:** saldo do mês, gráfico por categoria, gastos por forma de pagamento e lista de lançamentos.
- **Listas → Mercado:** lista de supermercado organizada por setor (hortifruti, açougue, limpeza…), com
  marcação do que já está no carrinho e “Finalizar compra”, que lança o gasto em Finanças.
- **Listas → Prioridades:** coisas que você quer comprar (utensílios, eletrônicos…) com preço e prioridade
  alta, média ou baixa. Mostra o total e quantos itens cabem no saldo do mês.
- **Notificações:** lembrete antes de cada compromisso (padrão de 30 min) e a agenda do dia às 07:00,
  mesmo com o app fechado.
- **Botão +:** adiciona compromisso, gasto ou receita por formulário.

---

## Gerar o APK de graça pelo GitHub (uns 15 min, só na primeira vez)

1. Entre em **github.com** e crie um repositório novo, por exemplo `meu-dia`. Marque **Private**.
2. Na página do repositório, clique em **uploading an existing file** e arraste **todo o conteúdo**
   desta pasta, incluindo a pasta `.github`. Clique em **Commit changes**.
   - No Windows, se a pasta `.github` não aparecer, ative *Exibir → Itens ocultos*.
   - Se mesmo assim ela não subir: vá em **Actions → set up a workflow yourself**, cole o conteúdo de
     `.github/workflows/apk.yml` e salve.
3. Abra a aba **Actions**. O fluxo **Gerar APK** começa sozinho e leva de 5 a 10 minutos.
4. Quando ficar verde ✅, clique nele e, em **Artifacts**, baixe **MeuDia-apk**. É um .zip com o
   **MeuDia.apk** dentro.

## Instalar no celular

1. Passe o `MeuDia.apk` pro celular (Google Drive, cabo USB ou baixe direto pelo navegador do celular,
   logado no GitHub).
2. Toque no arquivo. O Android pede para **permitir instalar de fontes desconhecidas**: autorize.
3. Abra o **Meu Dia** e **permita notificações**.
4. Em **Ajustes**, toque em **Permitir horário exato** (se aparecer) e depois em **Testar notificação**.
5. **Importante em Xiaomi, Samsung e Motorola:** vá em *Configurações → Apps → Meu Dia → Bateria* e
   escolha **Sem restrições**. Sem isso, o sistema pode atrasar os lembretes.

## IA (opcional)

Sem IA, o app entende frases simples. Com uma chave grátis do Gemini (**aistudio.google.com → Get API
key**), colada em **Ajustes**, você escreve do seu jeito e lança várias coisas numa frase só.
O app precisa de internet só para isso.

## Atualizar o app

Mude o que quiser em `www/` e envie de novo pro GitHub. Um APK novo é gerado. Instale por cima: a chave de
assinatura é fixa (`android/app/meudia.keystore`), então os dados continuam lá. Mesmo assim, use
**Ajustes → Copiar backup** antes de atualizar.

> A chave de assinatura está no projeto para facilitar. Por isso o repositório deve ser **privado**.

## Plano B: compilar no PC com o Android Studio

```bash
npm install
npx cap sync android
npx cap open android      # abre no Android Studio
```

No Android Studio: **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.

## Estrutura

```
www/                 o app (HTML, CSS e JS, sem framework)
  app.js             lógica: assistente, agenda, finanças, notificações, backup
  style.css          visual
android/             projeto Android gerado pelo Capacitor (ícone e assinatura configurados)
.github/workflows/   automação que gera o APK
capacitor.config.json
```
